<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class PalletizationService
{
    // Orden “operativo”: torres abajo, luego portátiles, luego minis
    private array $types = ['tower', 'laptop', 'mini_pc'];

    public function calculateBestPlan(int $zoneId, array $items, ?array $allowedPalletTypeCodes = null, bool $allowSeparators = true): array
    {
        $boxTypes = DB::table('box_types')->get()->keyBy('code');

        $query = DB::table('pallet_types')->orderBy('id');
        if (is_array($allowedPalletTypeCodes) && count($allowedPalletTypeCodes) > 0) {
            $query->whereIn('code', $allowedPalletTypeCodes);
        }
        $palletTypes = $query->get();

        $candidates = [];

        foreach ($palletTypes as $palletType) {
            $sim = $this->simulatePackingForPalletType($palletType, $boxTypes, $items, $allowSeparators);

            if (($sim['pallet_count'] ?? 0) <= 0) continue;

            $rate = DB::table('rates')
                ->where('zone_id', $zoneId)
                ->where('pallet_type_id', $palletType->id)
                ->where('min_pallets', '<=', $sim['pallet_count'])
                ->where('max_pallets', '>=', $sim['pallet_count'])
                ->orderBy('min_pallets')
                ->first();

            if (!$rate) {
                $rate = DB::table('rates')
                    ->where('zone_id', $zoneId)
                    ->where('pallet_type_id', $palletType->id)
                    ->orderByDesc('max_pallets')
                    ->first();
            }

            if (!$rate) continue;

            $pricePerPallet = (float) $rate->price_eur;
            $totalPrice = $pricePerPallet * $sim['pallet_count'];

            $candidates[] = [
                'pallet_type_code' => $palletType->code,
                'pallet_type_name' => $palletType->name,
                'pallet_count' => $sim['pallet_count'],
                'price_per_pallet' => $pricePerPallet,
                'total_price' => $totalPrice,
                'pallets' => $sim['pallets'],
                'metrics' => $sim['metrics'],
            ];
        }

        if (empty($candidates)) {
            return ['error' => 'No hay candidatos: revisa pallet_types y rates para esa zona.'];
        }

        usort($candidates, fn($a, $b) => $a['total_price'] <=> $b['total_price']);

        return [
            'best' => $candidates[0],
            'alternatives' => array_slice($candidates, 1, 5),
        ];
    }

    /**
     * Capa “plana con separador”:
     * - Intentamos capa completa del tipo base.
     * - Si no se puede (stock/peso), rellenamos huecos con el siguiente tipo(s)
     *   intentando completar el número total de posiciones de la capa.
     * - Si mezclamos alturas distintas dentro de la capa => needs_separator=true
     * - Solo aceptamos que quede “hueco” si ya no cabe nada más (última capa).
     */
    private function simulatePackingForPalletType(object $palletType, $boxTypes, array $items, bool $allowSeparators): array
    {
        $remaining = [
            'tower' => (int)($items['tower'] ?? 0),
            'laptop' => (int)($items['laptop'] ?? 0),
            'mini_pc' => (int)($items['mini_pc'] ?? 0),
        ];

        $palletL = (int)$palletType->base_length_cm;
        $palletW = (int)$palletType->base_width_cm;
        $palletMaxH = (int)$palletType->max_height_cm;
        $palletMaxKg = (float)$palletType->max_weight_kg;

        // Info por tipo
        $info = [];
        foreach ($this->types as $code) {
            if (!isset($boxTypes[$code])) continue;
            $b = $boxTypes[$code];

            $perLayer = $this->boxesPerLayer($palletL, $palletW, (int)$b->length_cm, (int)$b->width_cm);

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
                ];
            }
        }

        $pallets = [];
        $guard = 0;

        while (($remaining['tower'] + $remaining['laptop'] + $remaining['mini_pc']) > 0) {
            $guard++;
            if ($guard > 20000) break;

            $heightLeft = $palletMaxH;
            $weightLeft = $palletMaxKg;

            $load = ['tower' => 0, 'laptop' => 0, 'mini_pc' => 0];
            $layers = [];
            $separatorsUsed = 0;

            // Vamos capa a capa
            $layerIndex = 0;
            while (true) {
                // Elegimos tipo base para esta capa: el primero con stock que quepa por altura/peso
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

                $heightLeft -= $layer['height_cm'];
                $weightLeft -= $layer['weight_kg'];

                if ($layer['needs_separator']) {
                    $separatorsUsed++;
                }

                $layerIndex++;

                if ($heightLeft <= 0 || $weightLeft <= 0) break;
                if (($remaining['tower'] + $remaining['laptop'] + $remaining['mini_pc']) <= 0) break;
            }

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

        return [
            'pallet_count' => count($pallets),
            'pallets' => $pallets,
            'metrics' => [
                'note' => 'Capas planas: se rellena una capa incompleta con otros tipos SOLO si mantiene plano mediante separador. Huecos solo en última capa.',
                'pallet' => [
                    'L_cm' => $palletL,
                    'W_cm' => $palletW,
                    'H_cm' => $palletMaxH,
                    'max_kg' => $palletMaxKg,
                ],
                'per_type' => $info,
            ],
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

            $h = $info[$code]['height_cm'];
            $w = $info[$code]['weight_kg'];

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
     *    2) si sobran huecos, rellenamos con otros tipos (laptop/mini_pc)
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
        if ($info[$baseType]['weight_kg'] > $weightLeft) return null;

        $counts = ['tower' => 0, 'laptop' => 0, 'mini_pc' => 0];
        $layerWeight = 0.0;
        $maxHeightInLayer = 0;

        // 1) Meter lo máximo posible del baseType, hasta completar posiciones o quedarnos sin stock/peso
        $slots = $perLayer;

        $canBaseByStock = min($slots, (int)($remaining[$baseType] ?? 0));
        $canBaseByWeight = (int) floor($weightLeft / $info[$baseType]['weight_kg']);
        $baseBoxes = max(0, min($canBaseByStock, $canBaseByWeight));

        if ($baseBoxes <= 0) return null;

        $counts[$baseType] += $baseBoxes;
        $slots -= $baseBoxes;
        $layerWeight += $baseBoxes * $info[$baseType]['weight_kg'];
        $maxHeightInLayer = max($maxHeightInLayer, $info[$baseType]['height_cm']);

        // Definimos con qué tipos se puede rellenar una capa según su base
        $fillOrder = match ($baseType) {
            'tower'  => ['mini_pc', 'laptop'], // preferimos minis para huecos de torres
            'laptop' => ['mini_pc'],           // portátiles se pueden completar con minis
            'mini_pc' => [],                    // minis normalmente ya rellenan bien
            default  => [],
        };

        // 2) Rellenar huecos (slots) con tipos permitidos
        foreach ($fillOrder as $code) {
            if ($slots <= 0) break;
            if (!isset($info[$code])) continue;
            if (($remaining[$code] ?? 0) <= 0) continue;

            // Si NO permitimos separadores, solo dejamos rellenar con misma altura
            if (!$allowSeparators) {
                if ($info[$code]['height_cm'] !== $info[$baseType]['height_cm']) {
                    continue;
                }
            }

            $boxKg = $info[$code]['weight_kg'];

            $maxByStock = min($slots, (int)$remaining[$code]);
            $maxByWeight = (int) floor(($weightLeft - $layerWeight) / $boxKg);

            $add = max(0, min($maxByStock, $maxByWeight));
            if ($add <= 0) continue;

            $counts[$code] += $add;
            $slots -= $add;
            $layerWeight += $add * $boxKg;
            $maxHeightInLayer = max($maxHeightInLayer, $info[$code]['height_cm']);
        }

        $total = $counts['tower'] + $counts['laptop'] + $counts['mini_pc'];
        if ($total <= 0) return null;

        // needs_separator:
        // Si hemos metido más de un tipo Y hay alturas distintas, hace falta separador rígido
        $typesUsed = [];
        foreach ($counts as $code => $qty) {
            if ($qty > 0) $typesUsed[] = $code;
        }

        $needsSeparator = false;

        // Solo tiene sentido si allowSeparators = true. Si está OFF, nunca deberíamos mezclar alturas.
        if ($allowSeparators) {
            $typesUsed = [];
            foreach ($counts as $c => $qty) {
                if ($qty > 0) $typesUsed[] = $c;
            }

            if (count($typesUsed) > 1) {
                $h0 = null;
                foreach ($typesUsed as $c) {
                    $h = $info[$c]['height_cm'];
                    if ($h0 === null) $h0 = $h;
                    if ($h !== $h0) {
                        $needsSeparator = true;
                        break;
                    }
                }
            }
        }


        // La altura consumida por la capa es la altura máxima presente en la capa
        // (para que la siguiente capa apoye en plano sobre un separador)
        return [
            'base_type' => $baseType,
            'counts' => $counts,
            'height_cm' => $maxHeightInLayer,
            'weight_kg' => round($layerWeight, 2),
            'slots_total' => $perLayer,
            'slots_empty' => $slots, // si >0, son huecos que NO se pudieron rellenar (solo debería pasar si ya no cabe nada)
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
}
