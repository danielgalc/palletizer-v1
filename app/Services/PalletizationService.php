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
     * Calcula el mejor plan para una zona:
     * - Genera candidatos mono-tipo (solo un tipo de pallet por plan)
     * - Luego prueba combinaciones mixtas (2 tipos) en modo "auto mezcla"
     * - Genera recomendaciones comparando alternativas por % del total
     */
    public function calculateBestPlan(
        int $zoneId,
        array $items,
        ?array $allowedPalletTypeCodes = null,
        bool $allowSeparators = true
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

            // Tarifa según tramo para ESTE tipo y número de pallets
            $rate = DB::table('rates')
                ->where('zone_id', $zoneId)
                ->where('pallet_type_id', $palletType->id)
                ->where('min_pallets', '<=', $sim['pallet_count'])
                ->where('max_pallets', '>=', $sim['pallet_count'])
                ->orderBy('min_pallets')
                ->first();

            if (!$rate) {
                // Si no hay tramo exacto, cogemos el último tramo disponible
                $rate = DB::table('rates')
                    ->where('zone_id', $zoneId)
                    ->where('pallet_type_id', $palletType->id)
                    ->orderByDesc('max_pallets')
                    ->first();
            }

            if (!$rate) {
                continue; // no hay tarifa para este tipo en esa zona
            }

            $pricePerPallet = (float) $rate->price_eur;
            $totalPrice = $pricePerPallet * (int)$sim['pallet_count'];

            $candidates[] = [
                'pallet_type_code' => $palletType->code,
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
        // 2) MEZCLA (AUTO): COMBINACIONES DE 2 TIPOS
        // ==========================================
        // Nota: aquí asumimos que el tramo de tarifas se aplica por TIPO (según tu schema `rates`).
        // Es decir, si usas 2 Light y 3 Quarter, se evalúan tramos por separado.

        // Ordenamos los candidatos mono-tipo por precio para escoger "los mejores" tipos
        $monoCandidates = array_values($candidates);
        usort($monoCandidates, fn($a, $b) => ($a['total_price'] ?? INF) <=> ($b['total_price'] ?? INF));

        // Tomamos top N tipos únicos para probar mezcla
        $mixTypeCodes = array_slice(
            array_unique(array_map(fn($c) => $c['pallet_type_code'], $monoCandidates)),
            0,
            $maxTypesForMixing
        );

        // $palletTypes es Collection: whereIn funciona
        $mixTypes = $palletTypes->whereIn('code', $mixTypeCodes)->values();

        // Si hay al menos 2 tipos, probamos mezclas
        if (count($mixTypes) >= 2) {

            // Máximo pallets por tipo en mezcla (para evitar explosión combinatoria)
            $maxPalletsPerTypeInMix = 3;

            for ($i = 0; $i < count($mixTypes); $i++) {
                for ($j = $i + 1; $j < count($mixTypes); $j++) {

                    $typeA = $mixTypes[$i];
                    $typeB = $mixTypes[$j];

                    for ($aCount = 1; $aCount <= $maxPalletsPerTypeInMix; $aCount++) {

                        $simA = $this->simulatePackingForPalletType(
                            $typeA,
                            $boxTypes,
                            $items,
                            $allowSeparators,
                            $aCount
                        );

                        $remainingAfterA = $simA['remaining_items'] ?? null;
                        if (!$remainingAfterA) {
                            continue;
                        }

                        // Si A ya cubre todo el pedido, entonces sería un plan mono-tipo (ya existe)
                        $leftA =
                            ($remainingAfterA['tower'] ?? 0) +
                            ($remainingAfterA['laptop'] ?? 0) +
                            ($remainingAfterA['mini_pc'] ?? 0);

                        if ($leftA === 0) {
                            continue;
                        }

                        for ($bCount = 1; $bCount <= $maxPalletsPerTypeInMix; $bCount++) {

                            $simB = $this->simulatePackingForPalletType(
                                $typeB,
                                $boxTypes,
                                $remainingAfterA,
                                $allowSeparators,
                                $bCount
                            );

                            $remainingFinal = $simB['remaining_items'] ?? null;
                            if (!$remainingFinal) {
                                continue;
                            }

                            $leftFinal =
                                ($remainingFinal['tower'] ?? 0) +
                                ($remainingFinal['laptop'] ?? 0) +
                                ($remainingFinal['mini_pc'] ?? 0);

                            if ($leftFinal > 0) {
                                continue; // no cubre todo el pedido
                            }

                            // COSTE: calcula tramo por cada tipo según su cantidad dentro del plan mixto
                            $costA = $this->calculateCostForPalletType($zoneId, $typeA, (int)($simA['pallet_count'] ?? 0));
                            $costB = $this->calculateCostForPalletType($zoneId, $typeB, (int)($simB['pallet_count'] ?? 0));

                            if ($costA === null || $costB === null) {
                                continue;
                            }

                            $totalPrice = $costA + $costB;

                            $candidates[] = [
                                'pallet_type_code' => "{$typeA->code}+{$typeB->code}",
                                'pallet_type_name' => "{$simA['pallet_count']}×{$typeA->name} + {$simB['pallet_count']}×{$typeB->name}",
                                'pallet_count' => (int)($simA['pallet_count'] ?? 0) + (int)($simB['pallet_count'] ?? 0),

                                // En mixto no tiene sentido un €/pallet único
                                'price_per_pallet' => null,
                                'total_price' => $totalPrice,

                                // Distribución: primero los pallets A, luego los pallets B
                                'pallets' => array_merge($simA['pallets'] ?? [], $simB['pallets'] ?? []),

                                // Métricas extra para que la UI pueda mostrarlo bonito después
                                'metrics' => [
                                    'mixed' => true,
                                    'types' => [
                                        $typeA->code => (int)($simA['pallet_count'] ?? 0),
                                        $typeB->code => (int)($simB['pallet_count'] ?? 0),
                                    ],
                                    'cost_breakdown' => [
                                        $typeA->code => $costA,
                                        $typeB->code => $costB,
                                    ],
                                ],

                                // Unimos warnings (aunque ahora sean por “último pallet” de cada sub-sim)
                                'warnings' => array_merge($simA['warnings'] ?? [], $simB['warnings'] ?? []),
                            ];
                        }
                    }
                }
            }
        }

        // =========================
        // 3) ELEGIR BEST / ALTS
        // =========================
        usort($candidates, function ($a, $b) {
            $ta = $a['total_price'] ?? INF;
            $tb = $b['total_price'] ?? INF;
            return $ta <=> $tb;
        });

        //  Guardamos best y alternatives para generar recomendaciones
        $best = $candidates[0];
        $alternatives = array_slice($candidates, 1, 5);

        //  Recomendaciones por % del total
        $recommendations = $this->buildRecommendations($best, $alternatives, 0.03); // 3%

        return [
            'best' => $best,
            'alternatives' => $alternatives,
            'recommendations' => $recommendations,
        ];
    }

    /**
     * Simula el llenado de pallets de un tipo:
     * - Capas "planas": intentamos completar la capa (slots) con el tipo base y, si sobran huecos,
     *   rellenamos con otros tipos.
     * - Si allowSeparators = true, permitimos mezcla de alturas dentro de la capa (marcando separador).
     * - limitPallets:
     *     null => llenar hasta completar pedido (comportamiento normal)
     *     N    => construir como máximo N pallets (necesario para mezcla de tipos)
     */
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

            $guard++;
            if ($guard > 20000) break;

            $heightLeft = $palletMaxH;
            $weightLeft = $palletMaxKg;

            $load = ['tower' => 0, 'laptop' => 0, 'mini_pc' => 0];
            $layers = [];
            $separatorsUsed = 0;

            // Construimos capas hasta que no quepa nada más
            while (true) {
                $baseType = $this->pickBaseType($remaining, $info, $heightLeft, $weightLeft);
                if ($baseType === null) break;

                $layer = $this->buildFlatLayerWithFill(
                    $baseType,
                    $remaining,
                    $info,
                    $heightLeft,
                    $weightLeft,
                    $allowSeparators
                );

                if ($layer === null) break;

                // Si no cabe por altura, paramos
                if ($layer['height_cm'] > $heightLeft) break;

                $layers[] = $layer;

                // Descontamos cantidades
                foreach ($layer['counts'] as $code => $qty) {
                    $load[$code] += $qty;
                    $remaining[$code] -= $qty;
                }

                $heightLeft -= (int)$layer['height_cm'];
                $weightLeft -= (float)$layer['weight_kg'];

                if (!empty($layer['needs_separator'])) {
                    $separatorsUsed++;
                }

                if ($heightLeft <= 0 || $weightLeft <= 0) break;
                if (($remaining['tower'] + $remaining['laptop'] + $remaining['mini_pc']) <= 0) break;
            }

            // Si no hemos metido nada, abortamos para evitar bucles raros
            if (($load['tower'] + $load['laptop'] + $load['mini_pc']) === 0) {
                return [
                    'pallet_count' => 0,
                    'pallets' => [],
                    'metrics' => [
                        'error' => 'No se ha podido meter ninguna caja en este pallet (revisa límites/pesos).',
                        'pallet' => ['L' => $palletL, 'W' => $palletW, 'H' => $palletMaxH, 'kg' => $palletMaxKg],
                        'info' => $info,
                        'remaining' => $remaining,
                    ],
                    'warnings' => [],
                    'packed_items' => ['tower' => 0, 'laptop' => 0, 'mini_pc' => 0],
                    'remaining_items' => $remaining,
                    'limit_pallets' => $limitPallets,
                ];
            }

            $pallets[] = [
                'tower' => $load['tower'],
                'laptop' => $load['laptop'],
                'mini_pc' => $load['mini_pc'],
                'layers' => $layers,
                'separators_used' => $separatorsUsed,
                'remaining_capacity' => [
                    'height_cm_left' => $heightLeft,
                    'weight_kg_left' => round($weightLeft, 2),
                ],
            ];
        }

        // Métricas de utilización
        $utilizations = [];
        foreach ($pallets as $i => $p) {
            $utilizations[] = [
                'pallet_number' => $i + 1,
                ...$this->palletUtilization($p, $palletMaxH, $palletMaxKg),
            ];
        }

        // Avisos (último pallet infrautilizado)
        $warnings = $this->buildUnderutilizedWarnings($pallets, $palletMaxH, $palletMaxKg);

        // Qué hemos empaquetado vs lo que queda
        $packed = [
            'tower' => (int)($items['tower'] ?? 0) - $remaining['tower'],
            'laptop' => (int)($items['laptop'] ?? 0) - $remaining['laptop'],
            'mini_pc' => (int)($items['mini_pc'] ?? 0) - $remaining['mini_pc'],
        ];

        return [
            'pallet_count' => count($pallets),
            'pallets' => $pallets,
            'warnings' => $warnings,
            'metrics' => [
                'pallet' => [
                    'L_cm' => $palletL,
                    'W_cm' => $palletW,
                    'H_cm' => $palletMaxH,
                    'max_kg' => $palletMaxKg,
                ],
                'per_type' => $info,
                'utilizations' => $utilizations,
                'note' => 'Simulación por capas planas con relleno. Avisos si el último pallet está infrautilizado.',
            ],
            'packed_items' => $packed,
            'remaining_items' => $remaining,
            'limit_pallets' => $limitPallets,
        ];
    }

    /**
     * Elige el tipo base de la capa:
     * - primero el que tenga stock
     * - y que quepa por altura y peso (al menos 1 caja)
     */
    private function pickBaseType(array $remaining, array $info, int $heightLeft, float $weightLeft): ?string
    {
        foreach ($this->types as $code) {
            if (($remaining[$code] ?? 0) <= 0) continue;
            if (!isset($info[$code])) continue;

            $h = (int)$info[$code]['height_cm'];
            $w = (float)$info[$code]['weight_kg'];

            if ($h <= $heightLeft && $w <= $weightLeft) {
                return $code;
            }
        }
        return null;
    }

    /**
     * Construye una capa “plana”:
     * - baseType define el patrón (per_layer) y la altura de referencia.
     * - intentamos llenar las posiciones de la capa:
     *    1) con baseType
     *    2) si sobran huecos, rellenamos con otros tipos
     *
     * needs_separator = true si hay mezcla con alturas diferentes dentro de la capa.
     */
    private function buildFlatLayerWithFill(
        string $baseType,
        array $remaining,
        array $info,
        int $heightLeft,
        float $weightLeft,
        bool $allowSeparators
    ): ?array {
        if (!isset($info[$baseType])) return null;

        $perLayer = (int)$info[$baseType]['per_layer'];
        $baseH = (int)$info[$baseType]['height_cm'];

        if ($perLayer <= 0) return null;
        if ($baseH > $heightLeft) return null;

        // Si ni siquiera cabe una caja del baseType por peso, no podemos empezar
        if ((float)$info[$baseType]['weight_kg'] > $weightLeft) return null;

        $counts = ['tower' => 0, 'laptop' => 0, 'mini_pc' => 0];
        $layerWeight = 0.0;
        $maxHeightInLayer = 0;

        // 1) Meter lo máximo posible del baseType, hasta completar slots o quedarnos sin stock/peso
        $slots = $perLayer;

        $canBaseByStock = min($slots, (int)($remaining[$baseType] ?? 0));
        $canBaseByWeight = (int) floor($weightLeft / (float)$info[$baseType]['weight_kg']);

        $baseBoxes = max(0, min($canBaseByStock, $canBaseByWeight));
        if ($baseBoxes <= 0) return null;

        $counts[$baseType] += $baseBoxes;
        $slots -= $baseBoxes;
        $layerWeight += $baseBoxes * (float)$info[$baseType]['weight_kg'];
        $maxHeightInLayer = max($maxHeightInLayer, (int)$info[$baseType]['height_cm']);

        // Definimos con qué tipos se puede rellenar una capa según su base
        $fillOrder = match ($baseType) {
            'tower'  => ['mini_pc', 'laptop'], // preferimos minis para huecos de torres
            'laptop' => ['mini_pc'],           // portátiles se pueden completar con minis
            'mini_pc' => [],                   // minis normalmente ya rellenan bien
            default  => [],
        };

        // 2) Rellenar huecos (slots) con tipos permitidos
        foreach ($fillOrder as $code) {
            if ($slots <= 0) break;
            if (!isset($info[$code])) continue;
            if (($remaining[$code] ?? 0) <= 0) continue;

            // Si NO permitimos separadores, solo dejamos rellenar con misma altura
            if (!$allowSeparators) {
                if ((int)$info[$code]['height_cm'] !== (int)$info[$baseType]['height_cm']) {
                    continue;
                }
            }

            $boxKg = (float)$info[$code]['weight_kg'];

            $maxByStock = min($slots, (int)$remaining[$code]);
            $maxByWeight = (int) floor(($weightLeft - $layerWeight) / $boxKg);

            $add = max(0, min($maxByStock, $maxByWeight));
            if ($add <= 0) continue;

            $counts[$code] += $add;
            $slots -= $add;
            $layerWeight += $add * $boxKg;
            $maxHeightInLayer = max($maxHeightInLayer, (int)$info[$code]['height_cm']);
        }

        $total = $counts['tower'] + $counts['laptop'] + $counts['mini_pc'];
        if ($total <= 0) return null;

        // needs_separator:
        // Si hay más de un tipo y hay alturas distintas, hace falta separador rígido
        $needsSeparator = false;

        if ($allowSeparators) {
            $typesUsed = [];
            foreach ($counts as $c => $qty) {
                if ($qty > 0) $typesUsed[] = $c;
            }

            if (count($typesUsed) > 1) {
                $h0 = null;
                foreach ($typesUsed as $c) {
                    $h = (int)$info[$c]['height_cm'];
                    if ($h0 === null) $h0 = $h;
                    if ($h !== $h0) {
                        $needsSeparator = true;
                        break;
                    }
                }
            }
        }

        return [
            'base_type' => $baseType,
            'counts' => $counts,
            'height_cm' => $maxHeightInLayer,
            'weight_kg' => round($layerWeight, 2),
            'slots_total' => $perLayer,
            'slots_empty' => $slots, // si >0, huecos que NO se pudieron rellenar
            'needs_separator' => $needsSeparator,
            'allow_separators' => $allowSeparators,
        ];
    }

    /**
     * Cajas por capa en la base del pallet:
     * probamos sin girar y girando 90º y elegimos el máximo.
     */
    private function boxesPerLayer(int $palletL, int $palletW, int $boxL, int $boxW): int
    {
        $a = intdiv($palletL, $boxL) * intdiv($palletW, $boxW);
        $b = intdiv($palletL, $boxW) * intdiv($palletW, $boxL);
        return max($a, $b);
    }

    /**
     * % de utilización (0..1) usando altura y peso.
     * Cogemos el MAYOR de ambos porque si vas al límite de peso,
     * aunque falte altura, el pallet está "lleno" a efectos reales.
     */
    private function palletUtilization(array $pallet, int $palletMaxH, float $palletMaxKg): array
    {
        $heightLeft = (int)($pallet['remaining_capacity']['height_cm_left'] ?? $palletMaxH);
        $weightLeft = (float)($pallet['remaining_capacity']['weight_kg_left'] ?? $palletMaxKg);

        $usedH = max(0, $palletMaxH - $heightLeft);
        $usedKg = max(0.0, $palletMaxKg - $weightLeft);

        $uH = $palletMaxH > 0 ? ($usedH / $palletMaxH) : 0.0;
        $uW = $palletMaxKg > 0 ? ($usedKg / $palletMaxKg) : 0.0;

        $u = max($uH, $uW);

        return [
            'utilization' => round($u, 3),
            'utilization_height' => round($uH, 3),
            'utilization_weight' => round($uW, 3),
            'used_height_cm' => $usedH,
            'used_weight_kg' => round($usedKg, 2),
        ];
    }

    /**
     * Aviso simple: último pallet infrautilizado.
     * (Luego lo refinaremos para planes mixtos, si quieres.)
     */
    private function buildUnderutilizedWarnings(array $pallets, int $palletMaxH, float $palletMaxKg): array
    {
        if (count($pallets) === 0) return [];

        $warnings = [];

        $lastPalletThreshold = 0.25; // 25% o menos -> aviso
        $veryLowBoxesThreshold = 8;  // si el último pallet lleva poquísimas cajas

        $lastIdx = count($pallets) - 1;
        $last = $pallets[$lastIdx];

        $u = $this->palletUtilization($last, $palletMaxH, $palletMaxKg);

        $boxes =
            (int)($last['tower'] ?? 0) +
            (int)($last['laptop'] ?? 0) +
            (int)($last['mini_pc'] ?? 0);

        if ($u['utilization'] <= $lastPalletThreshold || $boxes <= $veryLowBoxesThreshold) {
            $warnings[] = [
                'type' => 'underutilized_last_pallet',
                'severity' => 'warning',
                'message' => 'El último pallet está muy vacío. Quizá compense esperar y consolidarlo con otro envío o revisar alternativas.',
                'details' => [
                    'last_pallet_index' => $lastIdx + 1,
                    'utilization' => $u,
                    'boxes' => $boxes,
                ],
            ];
        }

        return $warnings;
    }

    /**
     * 
     * Genera recomendaciones comparando alternativas por % del total.
     *
     * Criterios:
     * - Si best tiene warning underutilized_last_pallet
     * - y alguna alternativa dentro del % elimina ese warning o reduce nº pallets
     */
    private function buildRecommendations(array $best, array $alternatives, float $maxDeltaPct = 0.03): array
    {
        $recs = [];

        $bestTotal = (float)($best['total_price'] ?? 0);
        if ($bestTotal <= 0) return $recs;

        $bestPallets = (int)($best['pallet_count'] ?? 0);
        $bestHasUnderutilized = $this->hasWarning($best, 'underutilized_last_pallet');

        foreach ($alternatives as $alt) {
            $altTotal = (float)($alt['total_price'] ?? 0);
            if ($altTotal <= 0) continue;

            $deltaPct = ($altTotal - $bestTotal) / $bestTotal;

            // Solo alternativas ligeramente más caras (o igual)
            if ($deltaPct < -0.00001) continue;
            if ($deltaPct > $maxDeltaPct) continue;

            $altPallets = (int)($alt['pallet_count'] ?? 0);
            $altHasUnderutilized = $this->hasWarning($alt, 'underutilized_last_pallet');

            $improvesPalletCount = $altPallets > 0 && $altPallets < $bestPallets;
            $removesUnderutilized = $bestHasUnderutilized && !$altHasUnderutilized;

            if ($improvesPalletCount || $removesUnderutilized) {
                $recs[] = [
                    'type' => 'near_optimal_alternative',
                    'message' => $this->buildRecommendationMessage($best, $alt, $deltaPct, $improvesPalletCount, $removesUnderutilized),
                    'delta_pct' => round($deltaPct * 100, 2),
                    'best_total' => round($bestTotal, 2),
                    'alt_total' => round($altTotal, 2),
                    'alt' => [
                        'pallet_type_name' => $alt['pallet_type_name'] ?? '',
                        'pallet_count' => $altPallets,
                    ],
                ];
            }
        }

        return $recs;
    }

    /**
     * Comprueba si un candidato incluye un warning por type.
     */
    private function hasWarning(array $candidate, string $warningType): bool
    {
        $warnings = $candidate['warnings'] ?? [];
        if (!is_array($warnings)) return false;

        foreach ($warnings as $w) {
            if (($w['type'] ?? null) === $warningType) {
                return true;
            }
        }
        return false;
    }

    /**
     * (NUEVO) Genera un texto “humano” para la recomendación.
     */
    private function buildRecommendationMessage(
        array $best,
        array $alt,
        float $deltaPct,
        bool $improvesPalletCount,
        bool $removesUnderutilized
    ): string {
        $pct = round($deltaPct * 100, 2);

        $parts = [];
        $parts[] = "Alternativa +{$pct}%";

        if ($improvesPalletCount) {
            $parts[] = "reduce pallets";
        }

        if ($removesUnderutilized) {
            $parts[] = "evita el último pallet muy vacío";
        }

        $altName = $alt['pallet_type_name'] ?? 'alternativa';
        return implode(" · ", $parts) . " → {$altName}";
    }

    /**
     * Calcula coste TOTAL para un tipo de pallet (precio por tramo * nº pallets),
     * devolviendo null si no hay tarifas.
     */
    private function calculateCostForPalletType(int $zoneId, object $palletType, int $palletCount): ?float
    {
        if ($palletCount <= 0) return 0.0;

        $rate = DB::table('rates')
            ->where('zone_id', $zoneId)
            ->where('pallet_type_id', $palletType->id)
            ->where('min_pallets', '<=', $palletCount)
            ->where('max_pallets', '>=', $palletCount)
            ->orderBy('min_pallets')
            ->first();

        if (!$rate) {
            $rate = DB::table('rates')
                ->where('zone_id', $zoneId)
                ->where('pallet_type_id', $palletType->id)
                ->orderByDesc('max_pallets')
                ->first();
        }

        if (!$rate) return null;

        return (float) $rate->price_eur * $palletCount;
    }
}
