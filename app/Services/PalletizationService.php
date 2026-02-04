<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class PalletizationService
{
    /**
     * Orden “operativo” / estabilidad:
     * - torres (más pesadas) abajo
     * - luego portátiles
     * - luego minis (para rellenar huecos)
     */
    private array $types = ['tower', 'laptop', 'mini_pc'];

    /**
     * Resuelve el id numérico del pallet_type.
     * En BD rates.pallet_type_id es FK (bigint), así que aquí evitamos pasar códigos tipo 'mini_quarter'.
     */
    private array $palletTypeIdCache = [];

    private function resolvePalletTypeId($palletType): int
    {
        // Si nos pasan un objeto "normal" de DB con id numérico
        if (is_object($palletType) && isset($palletType->id) && is_numeric($palletType->id)) {
            return (int) $palletType->id;
        }

        // Si nos pasan directamente un id
        if (is_int($palletType) || (is_string($palletType) && ctype_digit($palletType))) {
            return (int) $palletType;
        }

        // Si nos pasan un objeto raro con id string, o un string con el code
        $code = null;
        if (is_object($palletType)) {
            if (isset($palletType->code) && is_string($palletType->code) && $palletType->code !== '') {
                $code = $palletType->code;
            } elseif (isset($palletType->id) && is_string($palletType->id) && $palletType->id !== '') {
                $code = $palletType->id; // fallback: algunos flujos meten el code en id
            }
        } elseif (is_string($palletType) && $palletType !== '') {
            $code = $palletType;
        }

        if (!$code) {
            throw new \RuntimeException('No se pudo resolver pallet_type_id (faltan id/code).');
        }

        if (isset($this->palletTypeIdCache[$code])) {
            return $this->palletTypeIdCache[$code];
        }

        $row = DB::table('pallet_types')->select('id')->where('code', $code)->first();
        if (!$row || !isset($row->id)) {
            throw new \RuntimeException("No existe pallet_type con code='{$code}'.");
        }

        $this->palletTypeIdCache[$code] = (int) $row->id;
        return $this->palletTypeIdCache[$code];
    }

    /**
     * Calcula el mejor plan para una zona:
     * - Genera candidatos mono-tipo (solo un tipo de pallet por plan)
     * - Luego prueba combinaciones mixtas (2 tipos) en modo "auto mezcla"
     * - Genera recomendaciones comparando alternativas por % del total
     */
    public function calculateBestPlan(
        int $zoneId,
        array $items,
        ?array $allowedPalletTypeCodes = null,
        bool $allowSeparators = true,
        ?int $carrierId = null
    ): array {
        $boxTypes = DB::table('box_types')->get()->keyBy('code');

        $query = DB::table('pallet_types')->orderBy('id');

        // Si vienes en modo manual (limitando tipos), filtramos aquí.
        if (is_array($allowedPalletTypeCodes) && count($allowedPalletTypeCodes) > 0) {
            $query->whereIn('code', $allowedPalletTypeCodes);
        }

        // $palletTypes aquí es una Collection (Illuminate\Support\Collection)
        $palletTypes = $query->get();

        $candidates = [];

        // Para no explotar combinaciones: probamos mezcla solo con los mejores N tipos (por precio mono-tipo)
        $maxTypesForMixing = 3;

        // =========================
        // 1) CANDIDATOS MONO-TIPO
        // =========================
        foreach ($palletTypes as $palletType) {
            $sim = $this->simulatePackingForPalletType(
                $palletType,
                $boxTypes,
                $items,
                $allowSeparators,
                null // sin límite: hasta completar pedido (comportamiento original)
            );

            if (($sim['pallet_count'] ?? 0) <= 0) {
                continue;
            }

            $rateQuery = DB::table('rates')
                ->where('zone_id', $zoneId)
                ->where('pallet_type_id', $this->resolvePalletTypeId($palletType));

            if ($carrierId !== null) {
                $rateQuery->where('carrier_id', $carrierId);
            }

            $rate = $rateQuery
                ->where('min_pallets', '<=', $sim['pallet_count'])
                ->where('max_pallets', '>=', $sim['pallet_count'])
                ->orderBy('min_pallets')
                ->first();

            if (!$rate) {
                $fallback = DB::table('rates')
                    ->where('zone_id', $zoneId)
                    ->where('pallet_type_id', $this->resolvePalletTypeId($palletType));

                if ($carrierId !== null) {
                    $fallback->where('carrier_id', $carrierId);
                }

                $rate = $fallback->orderByDesc('max_pallets')->first();
            }

            if (!$rate) {
                continue; // 👈 evita el crash
            }

            $pricePerPallet = (float) $rate->price_eur;
            $totalPrice = $pricePerPallet * (int) $sim['pallet_count'];

            $candidates[] = [
                'pallet_type_code' => $palletType->code,
                'pallet_type_id' => $this->resolvePalletTypeId($palletType),
                'pallet_type_name' => $palletType->name,
                'pallet_count' => (int) $sim['pallet_count'],
                'price_per_pallet' => $pricePerPallet,
                'total_price' => $totalPrice,
                'pallets' => $sim['pallets'] ?? [],
                'metrics' => $sim['metrics'] ?? [],
                'warnings' => $sim['warnings'] ?? [],
            ];
        }

        if (empty($candidates)) {
            return ['error' => 'No hay candidatos: revisa pallet_types y rates para esa zona.'];
        }

        // ==========================================
        // 2) MEZCLA (2 TIPOS) - SOLO CON TOP N
        // ==========================================
        // Ordenamos mono por total para sacar mejores N
        $monoCandidates = $candidates;
        usort($monoCandidates, fn ($a, $b) => ($a['total_price'] ?? INF) <=> ($b['total_price'] ?? INF));

        // Cogemos códigos de los mejores N tipos únicos para probar mezcla
        $mixTypeCodes = array_slice(
            array_unique(array_map(fn ($c) => $c['pallet_type_code'], $monoCandidates)),
            0,
            $maxTypesForMixing
        );

        // $palletTypes es Collection: whereIn funciona
        $mixTypes = $palletTypes->whereIn('code', $mixTypeCodes);

        $mixCandidates = [];

        $mixTypesArr = $mixTypes->values()->all();
        for ($i = 0; $i < count($mixTypesArr); $i++) {
            for ($j = $i + 1; $j < count($mixTypesArr); $j++) {
                $typeA = $mixTypesArr[$i];
                $typeB = $mixTypesArr[$j];

                // 1) calculamos packing de A pero limitando pallets a 1..N y completando con B, etc.
                // Estrategia simple: probamos separar el pedido en dos sub-pedidos:
                // - A intenta meter todo (como mono) pero con límite
                // - Lo que queda lo mete B
                // (para no explotar el search, hacemos pocas particiones)
                $maxSplitTries = 3;

                // calculamos "plan mono A" como referencia
                $simAFull = $this->simulatePackingForPalletType($typeA, $boxTypes, $items, $allowSeparators, null);
                $countAFull = (int) ($simAFull['pallet_count'] ?? 0);

                // si no hay pallets de A, no tiene sentido
                if ($countAFull <= 0) continue;

                // intentamos 1/3, 2/3, full-1 (limitado)
                $limits = array_unique(array_filter([
                    max(1, (int) ceil($countAFull / 3)),
                    max(1, (int) ceil(2 * $countAFull / 3)),
                    max(1, $countAFull - 1),
                ]));

                $limits = array_slice($limits, 0, $maxSplitTries);

                foreach ($limits as $limitA) {
                    $simA = $this->simulatePackingForPalletType($typeA, $boxTypes, $items, $allowSeparators, $limitA);

                    // lo que falta lo mete B
                    $remaining = $simA['remaining_items'] ?? $items;

                    $simB = $this->simulatePackingForPalletType($typeB, $boxTypes, $remaining, $allowSeparators, null);

                    if (($simA['pallet_count'] ?? 0) <= 0 && ($simB['pallet_count'] ?? 0) <= 0) {
                        continue;
                    }

                    // Coste A y B por separado
                    $costA = $this->calculateCostForPalletType($zoneId, $typeA, (int) ($simA['pallet_count'] ?? 0), $carrierId);
                    $costB = $this->calculateCostForPalletType($zoneId, $typeB, (int) ($simB['pallet_count'] ?? 0), $carrierId);

                    if ($costA === null || $costB === null) {
                        continue;
                    }

                    $totalPrice = $costA + $costB;

                    $mixCandidates[] = [
                        'pallet_type_code' => "{$typeA->code}+{$typeB->code}",
                        'pallet_type_name' => "{$simA['pallet_count']}×{$typeA->name} + {$simB['pallet_count']}×{$typeB->name}",
                        'pallet_count' => (int) ($simA['pallet_count'] ?? 0) + (int) ($simB['pallet_count'] ?? 0),
                        'price_per_pallet' => null,
                        'total_price' => $totalPrice,
                        'pallets' => array_merge($simA['pallets'] ?? [], $simB['pallets'] ?? []),
                        'metrics' => $simA['metrics'] ?? [],
                        'warnings' => array_merge($simA['warnings'] ?? [], $simB['warnings'] ?? []),
                        'mix' => [
                            'a' => [
                                'pallet_type_code' => $typeA->code,
                                'pallet_count' => (int) ($simA['pallet_count'] ?? 0),
                                'total' => $costA,
                            ],
                            'b' => [
                                'pallet_type_code' => $typeB->code,
                                'pallet_count' => (int) ($simB['pallet_count'] ?? 0),
                                'total' => $costB,
                            ],
                        ],
                    ];
                }
            }
        }

        // ==========================================
        // 3) SELECCIÓN FINAL + ALTERNATIVAS
        // ==========================================
        $all = array_merge($candidates, $mixCandidates);

        usort($all, fn ($a, $b) => ($a['total_price'] ?? INF) <=> ($b['total_price'] ?? INF));

        $best = $all[0];
        $alternatives = array_slice($all, 1, 5);

        $recommendations = $this->buildRecommendations($best, $alternatives, 0.03);

        return [
            'best' => $best,
            'alternatives' => $alternatives,
            'recommendations' => $recommendations,
        ];
    }

    private function boxesPerLayer(int $palletL, int $palletW, int $boxL, int $boxW): int
    {
        if ($boxL <= 0 || $boxW <= 0) return 0;

        $a = (int) floor($palletL / $boxL) * (int) floor($palletW / $boxW);
        $b = (int) floor($palletL / $boxW) * (int) floor($palletW / $boxL);

        return max($a, $b);
    }

    private function simulatePackingForPalletType(
        object $palletType,
        $boxTypes,
        array $items,
        bool $allowSeparators = true,
        ?int $limitPallets = null
    ): array {
        $remaining = [
            'tower' => (int)($items['tower'] ?? 0),
            'laptop' => (int)($items['laptop'] ?? 0),
            'mini_pc' => (int)($items['mini_pc'] ?? 0),
        ];

        $palletL = (int)$palletType->base_length_cm;
        $palletW = (int)$palletType->base_width_cm;
        $palletMaxH = (int)$palletType->max_height_cm;
        $palletMaxKg = (float)$palletType->max_weight_kg;

        // Info por tipo (cajas/capa, altura, peso)
        $info = [];
        foreach ($this->types as $code) {
            if (!isset($boxTypes[$code])) continue;
            $b = $boxTypes[$code];

            $perLayer = $this->boxesPerLayer(
                $palletL,
                $palletW,
                (int)$b->length_cm,
                (int)$b->width_cm
            );

            $info[$code] = [
                'per_layer' => $perLayer,
                'height_cm' => (int)$b->height_cm,
                'weight_kg' => (float)$b->weight_kg,
            ];
        }

        // Validación mínima
        foreach ($info as $code => $t) {
            if ($t['per_layer'] <= 0 || $t['height_cm'] <= 0 || $t['weight_kg'] <= 0) {
                return [
                    'pallet_count' => 0,
                    'pallets' => [],
                    'metrics' => [
                        'error' => "Tipo {$code}: datos inválidos (per_layer/height/weight).",
                        'info' => $info,
                    ],
                    'warnings' => [],
                    'packed_items' => ['tower' => 0, 'laptop' => 0, 'mini_pc' => 0],
                    'remaining_items' => $remaining,
                    'limit_pallets' => $limitPallets,
                ];
            }
        }

        $pallets = [];
        $guard = 0;

        // Si limitPallets es null => hasta terminar; si no => máximo N pallets
        while (($remaining['tower'] + $remaining['laptop'] + $remaining['mini_pc']) > 0) {
            if ($limitPallets !== null && count($pallets) >= $limitPallets) {
                break;
            }

            // Guardia anti-loops
            $guard++;
            if ($guard > 5000) break;

            $pallet = [
                'layers' => [],
                'height_cm' => 0,
                'weight_kg' => 0,
                'boxes' => [
                    'tower' => 0,
                    'laptop' => 0,
                    'mini_pc' => 0,
                ],
            ];

            while (true) {
                $remainingH = $palletMaxH - $pallet['height_cm'];
                if ($remainingH <= 0) break;

                // ¿qué tipos caben por altura?
                $candidates = [];
                foreach ($this->types as $code) {
                    if (($remaining[$code] ?? 0) <= 0) continue;
                    if ($info[$code]['height_cm'] <= $remainingH) {
                        $candidates[] = $code;
                    }
                }

                if (empty($candidates)) break;

                $chosen = $candidates[0];

                $cap = $info[$chosen]['per_layer'];
                $want = min($cap, $remaining[$chosen]);
                $layerWeight = $want * $info[$chosen]['weight_kg'];

                $remainingKg = $palletMaxKg - $pallet['weight_kg'];
                if ($layerWeight > $remainingKg) {
                    $want = (int) floor($remainingKg / max($info[$chosen]['weight_kg'], 0.00001));
                    $want = max(0, min($want, $cap, $remaining[$chosen]));
                    $layerWeight = $want * $info[$chosen]['weight_kg'];
                }

                if ($want <= 0) break;

                $layer = [
                    'type' => $chosen,
                    'count' => $want,
                    'per_layer' => $cap,
                    'is_mixed' => false,
                    'separator' => false,
                ];

                // Relleno mixto con separador
                if ($allowSeparators && $want < $cap) {
                    $slots = $cap - $want;

                    foreach ($this->types as $t2) {
                        if ($t2 === $chosen) continue;
                        if (($remaining[$t2] ?? 0) <= 0) continue;

                        if ($info[$t2]['height_cm'] > $info[$chosen]['height_cm']) continue;

                        $fill = min($slots, $remaining[$t2]);
                        $fillWeight = $fill * $info[$t2]['weight_kg'];

                        $remainingKg2 = $palletMaxKg - ($pallet['weight_kg'] + $layerWeight);
                        if ($fillWeight > $remainingKg2) {
                            $fill = (int) floor($remainingKg2 / max($info[$t2]['weight_kg'], 0.00001));
                            $fill = max(0, min($fill, $slots, $remaining[$t2]));
                            $fillWeight = $fill * $info[$t2]['weight_kg'];
                        }

                        if ($fill <= 0) continue;

                        $layer['is_mixed'] = true;
                        $layer['separator'] = true;
                        $layer['mixed'][] = [
                            'type' => $t2,
                            'count' => $fill,
                        ];

                        $remaining[$t2] -= $fill;
                        $pallet['boxes'][$t2] += $fill;
                        $slots -= $fill;
                        $layerWeight += $fillWeight;

                        if ($slots <= 0) break;
                    }
                }

                // Aplicar principal
                $remaining[$chosen] -= $want;
                $pallet['boxes'][$chosen] += $want;

                $pallet['layers'][] = $layer;
                $pallet['height_cm'] += $info[$chosen]['height_cm'];
                $pallet['weight_kg'] += $layerWeight;

                if ($pallet['height_cm'] >= $palletMaxH) break;
                if ($pallet['weight_kg'] >= $palletMaxKg) break;
                if (($remaining['tower'] + $remaining['laptop'] + $remaining['mini_pc']) <= 0) break;
            }

            $totalBoxes = array_sum($pallet['boxes']);
            if ($totalBoxes > 0) {
                $pallets[] = $pallet;
            } else {
                break;
            }
        }

        $packed = [
            'tower' => (int)($items['tower'] ?? 0) - $remaining['tower'],
            'laptop' => (int)($items['laptop'] ?? 0) - $remaining['laptop'],
            'mini_pc' => (int)($items['mini_pc'] ?? 0) - $remaining['mini_pc'],
        ];

        $warnings = [];

        // warning último pallet infrautilizado
        $last = end($pallets) ?: null;
        if ($last) {
            $lastBoxes = array_sum($last['boxes']);
            $maxPossible = 0;
            foreach ($info as $t) {
                $maxPossible = max($maxPossible, (int) ($t['per_layer'] ?? 0));
            }

            if ($maxPossible > 0 && $lastBoxes > 0 && $lastBoxes < max(1, (int) ceil($maxPossible * 0.5))) {
                $warnings[] = [
                    'type' => 'underutilized_last_pallet',
                    'message' => 'Último pallet poco aprovechado.',
                    'details' => [
                        'boxes' => $lastBoxes,
                    ],
                ];
            }
        }

        $metrics = [
            'pallet' => [
                'L_cm' => $palletL,
                'W_cm' => $palletW,
                'H_cm' => $palletMaxH,
                'max_kg' => $palletMaxKg,
            ],
            'per_type' => [
                'tower' => [
                    'per_layer' => $info['tower']['per_layer'] ?? 0,
                    'height_cm' => $info['tower']['height_cm'] ?? 0,
                    'weight_kg' => $info['tower']['weight_kg'] ?? 0,
                ],
                'laptop' => [
                    'per_layer' => $info['laptop']['per_layer'] ?? 0,
                    'height_cm' => $info['laptop']['height_cm'] ?? 0,
                    'weight_kg' => $info['laptop']['weight_kg'] ?? 0,
                ],
                'mini_pc' => [
                    'per_layer' => $info['mini_pc']['per_layer'] ?? 0,
                    'height_cm' => $info['mini_pc']['height_cm'] ?? 0,
                    'weight_kg' => $info['mini_pc']['weight_kg'] ?? 0,
                ],
            ],
        ];

        return [
            'pallet_count' => count($pallets),
            'pallets' => $pallets,
            'metrics' => $metrics,
            'warnings' => $warnings,
            'packed_items' => $packed,
            'remaining_items' => $remaining,
            'limit_pallets' => $limitPallets,
        ];
    }

    private function buildRecommendations(array $best, array $alternatives, float $threshold = 0.03): array
    {
        $recs = [];

        $bestTotal = (float) ($best['total_price'] ?? 0);

        foreach ($alternatives as $alt) {
            $altTotal = (float) ($alt['total_price'] ?? 0);
            if ($bestTotal <= 0) continue;

            $delta = ($altTotal - $bestTotal) / $bestTotal;

            if ($delta <= $threshold) {
                $recs[] = [
                    'message' => 'Alternativa muy cercana al óptimo.',
                    'delta_pct' => $delta * 100,
                    'best_total' => $bestTotal,
                    'alt_total' => $altTotal,
                    'alt' => [
                        'pallet_count' => $alt['pallet_count'] ?? null,
                    ],
                ];
            }
        }

        return $recs;
    }

    private function calculateCostForPalletType(int $zoneId, object $palletType, int $palletCount, ?int $carrierId = null): ?float
    {
        if ($palletCount <= 0) return 0.0;

        $rateQuery = DB::table('rates')
            ->where('zone_id', $zoneId)
            ->where('pallet_type_id', $this->resolvePalletTypeId($palletType));

        if ($carrierId !== null) {
            $rateQuery->where('carrier_id', $carrierId);
        }

        $rate = $rateQuery
            ->where('min_pallets', '<=', $palletCount)
            ->where('max_pallets', '>=', $palletCount)
            ->orderBy('min_pallets')
            ->first();

        if (!$rate) {
            $fallback = DB::table('rates')
                ->where('zone_id', $zoneId)
                ->where('pallet_type_id', $this->resolvePalletTypeId($palletType));

            if ($carrierId !== null) {
                $fallback->where('carrier_id', $carrierId);
            }

            $rate = $fallback->orderByDesc('max_pallets')->first();
        }

        if (!$rate) return null;

        return (float) $rate->price_eur * $palletCount;
    }

    public function calculateBestPlanAcrossCarriers(
        int $zoneId,
        array $items,
        ?array $allowedPalletTypeCodes = null,
        bool $allowSeparators = true,
        ?array $carrierIds = null
    ): array {
        $carrierRows = DB::table('rates')
            ->join('carriers', 'carriers.id', '=', 'rates.carrier_id')
            ->where('rates.zone_id', $zoneId)
            ->where('carriers.is_active', true)
            ->select('carriers.id', 'carriers.code', 'carriers.name')
            ->distinct()
            ->get();

        // Si el usuario ha seleccionado carriers en UI, calculamos SOLO con esos.
        if (is_array($carrierIds) && count($carrierIds) > 0) {
            $ids = array_values(array_unique(array_filter(array_map('intval', $carrierIds), fn ($v) => $v > 0)));
            $carrierRows = $carrierRows->whereIn('id', $ids)->values();
        }

        if ($carrierRows->isEmpty()) {
            return ['error' => 'No hay transportistas con tarifas para esa zona (o no coinciden con la selección).'];
        }

        $allCandidates = [];

        foreach ($carrierRows as $c) {
            $plan = $this->calculateBestPlan($zoneId, $items, $allowedPalletTypeCodes, $allowSeparators, (int)$c->id);

            if (!empty($plan['error'])) {
                continue;
            }

            $best = $plan['best'] ?? null;
            $alts = $plan['alternatives'] ?? [];

            if ($best) {
                $best['carrier_id'] = (int)$c->id;
                $best['carrier_code'] = (string)$c->code;
                $best['carrier_name'] = (string)$c->name;
                $allCandidates[] = $best;
            }

            if (is_array($alts)) {
                foreach ($alts as $a) {
                    $a['carrier_id'] = (int)$c->id;
                    $a['carrier_code'] = (string)$c->code;
                    $a['carrier_name'] = (string)$c->name;
                    $allCandidates[] = $a;
                }
            }
        }

        if (empty($allCandidates)) {
            return ['error' => 'No se pudo calcular ningún plan con las tarifas disponibles.'];
        }

        usort($allCandidates, fn($a, $b) => ($a['total_price'] ?? INF) <=> ($b['total_price'] ?? INF));

        $best = $allCandidates[0];
        $alternatives = array_slice($allCandidates, 1, 5);

        $recommendations = $this->buildRecommendations($best, $alternatives, 0.03);

        return [
            'best' => $best,
            'alternatives' => $alternatives,
            'recommendations' => $recommendations,
        ];
    }
}
