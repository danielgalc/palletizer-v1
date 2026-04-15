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
    private array $types = ['tower', 'tower_sff', 'laptop', 'mini_pc'];

    /** Tara del pallet vacío descontada del espacio útil para equipos */
    private const PALLET_TARE_HEIGHT_CM = 14.4;
    private const PALLET_TARE_WEIGHT_G  = 20000;

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
        // Adjuntar variantes de embalaje (box_variants) si vienen en el request
        // 1) Si el request trae packaging, cargamos las box_variants seleccionadas (modo A)
        $items = $this->attachPackagingVariants($items);

        // 2) Calculamos unidades por tipo y coste de cajas + validación de stock (modo A)
        $packagingSummary = $this->computePackagingSummary($items);

        // Si hay selección de packaging y es inválida (falta variante / sin stock), paramos aquí
        if (!empty($packagingSummary['errors'])) {
            return [
                'error' => 'Selección de cajas inválida.',
                'packaging' => $packagingSummary,
            ];
        }



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
                'carrier_rate_name' => $rate->carrier_rate_name ?? null,
                'pallet_count' => (int) $sim['pallet_count'],
                'price_per_pallet' => $pricePerPallet,
                'total_price' => $totalPrice,
                // Coste de cajas: se añade al total pero NO influye en la ordenación
                'total_box_cost' => (float)($packagingSummary['total_box_cost'] ?? 0),
                'total_cost' => $totalPrice + (float)($packagingSummary['total_box_cost'] ?? 0),
                'box_cost_breakdown' => $packagingSummary['breakdown'] ?? [],
                'packaging' => $packagingSummary['selected'] ?? [],
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
        usort($monoCandidates, fn($a, $b) => ($a['total_price'] ?? INF) <=> ($b['total_price'] ?? INF));

        // Cogemos códigos de los mejores N tipos únicos para probar mezcla
        $mixTypeCodes = array_slice(
            array_unique(array_map(fn($c) => $c['pallet_type_code'], $monoCandidates)),
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

                    if (($simA['pallet_count'] ?? 0) <= 0 || ($simB['pallet_count'] ?? 0) <= 0) {
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
                        'carrier_rate_name' => null,
                        'pallet_count' => (int) ($simA['pallet_count'] ?? 0) + (int) ($simB['pallet_count'] ?? 0),
                        'price_per_pallet' => null,
                        'total_price' => $totalPrice,
                        'pallets' => array_merge($simA['pallets'] ?? [], $simB['pallets'] ?? []),
                        'metrics' => $simA['metrics'] ?? [],
                        'warnings' => array_merge($simA['warnings'] ?? [], $simB['warnings'] ?? []),
                        'mix' => [
                            'a' => [
                                'pallet_type_code' => $typeA->code,
                                'pallet_type_name' => $typeA->name,
                                'carrier_rate_name' => $this->getCarrierRateName($zoneId, $typeA, (int)($simA['pallet_count'] ?? 0), $carrierId),
                                'pallet_count' => (int) ($simA['pallet_count'] ?? 0),
                                'total' => $costA,
                            ],
                            'b' => [
                                'pallet_type_code' => $typeB->code,
                                'pallet_type_name' => $typeB->name,
                                'carrier_rate_name' => $this->getCarrierRateName($zoneId, $typeB, (int)($simB['pallet_count'] ?? 0), $carrierId),
                                'pallet_count' => (int) ($simB['pallet_count'] ?? 0),
                                'total' => $costB,
                            ],
                        ],
                        'total_box_cost' => (float)($packagingSummary['total_box_cost'] ?? 0),
                        'total_cost' => (float)$totalPrice + (float)($packagingSummary['total_box_cost'] ?? 0),
                        'box_cost_breakdown' => $packagingSummary['breakdown'] ?? [],
                        'packaging' => $packagingSummary['selected'] ?? [],
                    ];
                }
            }
        }

        // ==========================================
        // 3) SELECCIÓN FINAL + ALTERNATIVAS
        // ==========================================
        $all = array_merge($candidates, $mixCandidates);

        // IMPORTANTE: el mejor plan se elige SOLO por total_price (coste de transporte).
        // El coste de cajas (total_box_cost) se suma al mostrar el resultado pero NO influye
        // en la selección del plan óptimo.
        usort($all, fn($a, $b) => ($a['total_price'] ?? INF) <=> ($b['total_price'] ?? INF));

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
        return $this->boxesPerLayerDetail($palletL, $palletW, $boxL, $boxW)['count'];
    }

    /**
     * Igual que boxesPerLayer pero devuelve además la geometría de la distribución óptima:
     * - count:    número de cajas horizontales que caben
     * - cols/rows: columnas y filas en la orientación ganadora
     * - used_L/used_W: espacio ocupado por las cajas horizontales (cm)
     * - gap_L/gap_W:   hueco sobrante en cada eje (cm)
     * - box_L/box_W:   dimensiones de la caja en la orientación ganadora
     */
    private function boxesPerLayerDetail(int $palletL, int $palletW, int $boxL, int $boxW): array
    {
        if ($boxL <= 0 || $boxW <= 0) {
            return ['count'=>0,'cols'=>0,'rows'=>0,'used_L'=>0,'used_W'=>0,'gap_L'=>$palletL,'gap_W'=>$palletW,'box_L'=>$boxL,'box_W'=>$boxW];
        }

        // Orientación A: caja tal cual (L×W)
        $colsA = (int) floor($palletL / $boxL);
        $rowsA = (int) floor($palletW / $boxW);
        $countA = $colsA * $rowsA;

        // Orientación B: caja girada 90° (W×L)
        $colsB = (int) floor($palletL / $boxW);
        $rowsB = (int) floor($palletW / $boxL);
        $countB = $colsB * $rowsB;

        if ($countB > $countA) {
            // Ganó orientación B (girada)
            $usedL = $colsB * $boxW;
            $usedW = $rowsB * $boxL;
            return [
                'count'  => $countB,
                'cols'   => $colsB,
                'rows'   => $rowsB,
                'used_L' => $usedL,
                'used_W' => $usedW,
                'gap_L'  => $palletL - $usedL,
                'gap_W'  => $palletW - $usedW,
                'box_L'  => $boxW,   // dimensión que ocupa el eje L del pallet
                'box_W'  => $boxL,   // dimensión que ocupa el eje W del pallet
            ];
        }

        // Ganó orientación A (normal)
        $usedL = $colsA * $boxL;
        $usedW = $rowsA * $boxW;
        return [
            'count'  => $countA,
            'cols'   => $colsA,
            'rows'   => $rowsA,
            'used_L' => $usedL,
            'used_W' => $usedW,
            'gap_L'  => $palletL - $usedL,
            'gap_W'  => $palletW - $usedW,
            'box_L'  => $boxL,
            'box_W'  => $boxW,
        ];
    }

    /**
     * Calcula cuántas cajas de un tipo dado caben en vertical dentro de un hueco lateral.
     *
     * Una caja en vertical se apoya sobre su cara L×H (la más estrecha pasa al eje del hueco):
     *   - Huella en el hueco: height_cm (nuevo ancho) × length_cm (nuevo largo)
     *   - Nueva altura que añade al pallet: width_cm
     *
     * El hueco puede ser:
     *   - Franja lateral (gap_W > 0): ancho disponible = gap_W, largo disponible = palletL
     *   - Franja frontal (gap_L > 0): ancho disponible = gap_L, largo disponible = palletW
     *
     * Devuelve array de candidatos verticales ordenados por cantidad descendente:
     *   [['type'=>code, 'count'=>N, 'vert_height_cm'=>M, 'in_gap'=>'W'|'L'], ...]
     */
    private function calcVerticalFill(
        int $palletL,
        int $palletW,
        array $layerDetail,   // resultado de boxesPerLayerDetail para la capa principal
        array $info,          // $info completo con dimensiones por tipo
        array $remaining,     // unidades pendientes por tipo
        int $remainingWeightG // peso disponible en el pallet antes de estas cajas verticales
    ): array
    {
        $results = [];

        // Dos huecos posibles tras colocar las cajas horizontales:
        // gap_W: franja a lo largo del eje L, con ancho = gap_W cm
        // gap_L: franja a lo largo del eje W, con ancho = gap_L cm
        $gaps = [];
        if ($layerDetail['gap_W'] > 0) {
            $gaps[] = ['available_narrow' => $layerDetail['gap_W'], 'available_long' => $palletL];
        }
        if ($layerDetail['gap_L'] > 0) {
            $gaps[] = ['available_narrow' => $layerDetail['gap_L'], 'available_long' => $palletW];
        }

        if (empty($gaps)) return [];

        foreach ($this->types as $code) {
            if (($remaining[$code] ?? 0) <= 0) continue;
            if (!isset($info[$code])) continue;

            $boxLen = (int)($info[$code]['box_L'] ?? 0);  // dimensión larga de la caja horizontal
            $boxWid = (int)($info[$code]['box_W'] ?? 0);  // dimensión corta de la caja horizontal
            $boxHei = (int)($info[$code]['height_cm']);    // altura de la caja horizontal = nueva profundidad vertical

            if ($boxHei <= 0 || $boxLen <= 0) continue;

            // Altura que añade la caja en vertical = boxWid (la que antes era el ancho de apilado)
            $vertHeight = $boxWid;
            if ($vertHeight <= 0) continue;

            $totalVertical = 0;

            foreach ($gaps as $gap) {
                // La caja vertical necesita 'boxHei' cm en el eje estrecho del hueco
                if ($boxHei > $gap['available_narrow']) continue;

                // Cuántas columnas de cajas verticales caben en el eje estrecho
                $vertCols = (int) floor($gap['available_narrow'] / $boxHei);
                if ($vertCols <= 0) continue;

                // Cuántas cajas por columna (a lo largo del eje largo del hueco)
                // La caja vertical ocupa boxLen cm a lo largo
                $vertRows = (int) floor($gap['available_long'] / $boxLen);
                if ($vertRows <= 0) continue;

                $totalVertical += $vertCols * $vertRows;
            }

            if ($totalVertical <= 0) continue;

            // Limitar por unidades disponibles y peso
            $maxByUnits = min($totalVertical, $remaining[$code]);
            $unitG = (int)($info[$code]['weight_g'] ?? 0);
            $maxByWeight = $unitG > 0 ? intdiv($remainingWeightG, $unitG) : $maxByUnits;
            $count = min($maxByUnits, $maxByWeight);

            if ($count <= 0) continue;

            $results[] = [
                'type'            => $code,
                'count'           => $count,
                'max_slots'       => $totalVertical,
                'vert_height_cm'  => $vertHeight,
                'weight_g'        => $count * $unitG,
            ];
        }

        // Ordenar por más cajas primero
        usort($results, fn($a, $b) => $b['count'] <=> $a['count']);

        return $results;
    }

    function simulatePackingForPalletType(
        object $palletType,
        $boxTypes,
        array $items,
        bool $allowSeparators = true,
        ?int $limitPallets = null
    ): array {
        $remaining = [
            'tower'     => (int)($items['tower'] ?? 0),
            'tower_sff' => (int)($items['tower_sff'] ?? 0),
            'laptop'    => (int)($items['laptop'] ?? 0),
            'mini_pc'   => (int)($items['mini_pc'] ?? 0),
        ];

        // Si vienen lines, calculamos el peso por tipo a partir de device_models.weight_kg
        $weightByCode = [];

        if (isset($items['lines']) && is_array($items['lines']) && count($items['lines']) > 0) {
            $modelQty = [];
            foreach ($items['lines'] as $line) {
                $id = (int) ($line['device_model_id'] ?? 0);
                $qty = (int) ($line['qty'] ?? 0);
                if ($id > 0 && $qty > 0) {
                    $modelQty[$id] = ($modelQty[$id] ?? 0) + $qty;
                }
            }

            if (!empty($modelQty)) {
                $rows = DB::table('device_models as dm')
                    ->join('box_types as bt', 'bt.id', '=', 'dm.box_type_id')
                    ->whereIn('dm.id', array_keys($modelQty))
                    ->select([
                        'dm.id',
                        'dm.weight_kg as model_weight_kg',
                        'bt.code as box_code',
                    ])
                    ->get();

                $sumW = [];   // box_code => sum(qty * weight)
                $sumQ = [];   // box_code => sum(qty)

                foreach ($rows as $r) {
                    $id = (int) $r->id;
                    $code = (string) ($r->box_code ?? '');
                    if ($code === '') continue;

                    $qty = (int) ($modelQty[$id] ?? 0);
                    if ($qty <= 0) continue;

                    $w = $r->model_weight_kg !== null ? (float) $r->model_weight_kg : 0.0;
                    if ($w <= 0) continue;

                    $sumW[$code] = ($sumW[$code] ?? 0) + ($qty * $w);
                    $sumQ[$code] = ($sumQ[$code] ?? 0) + $qty;
                }

                foreach ($sumQ as $code => $q) {
                    if ($q > 0 && isset($sumW[$code])) {
                        $weightByCode[$code] = $sumW[$code] / $q; // peso medio por unidad para ese box_code
                    }
                }
            }
        }

        $palletL = (int)$palletType->base_length_cm;
        $palletW = (int)$palletType->base_width_cm;
        $palletMaxH = (int)$palletType->max_height_cm;
        $palletMaxKg = (float)$palletType->max_weight_kg;
        $palletMaxG = (int) round($palletMaxKg * 1000); // gramos

        // Tara del pallet vacío: 14.4 cm de altura + 20 kg de peso.
        // El espacio útil para los equipos se reduce en consecuencia.
        $palletMaxH = (int) floor($palletMaxH - self::PALLET_TARE_HEIGHT_CM);
        $palletMaxG = $palletMaxG - self::PALLET_TARE_WEIGHT_G;


        // Info por tipo (cajas/capa, altura, peso)
        $info = [];
        foreach ($this->types as $code) {
            if (!isset($boxTypes[$code])) continue;
            $b = $boxTypes[$code];

            $pv = $items['_packaging_variants'][$code] ?? null;

            // Dimensiones para apilar (si hay variante seleccionada, manda)
            $boxLen = (int)($pv->length_cm ?? $b->length_cm);
            $boxWid = (int)($pv->width_cm  ?? $b->width_cm);
            $boxHei = (int)($pv->height_cm ?? $b->height_cm);

            $layerDetail = $this->boxesPerLayerDetail(
                $palletL, $palletW, $boxLen, $boxWid
            );

            // Peso equipo + cartón de la caja
            $unitKg = (float)($weightByCode[$code] ?? 0) + (float)($b->carton_weight_kg ?? 0);
            $unitG  = (int) round($unitKg * 1000);

            $info[$code] = [
                'per_layer'    => $layerDetail['count'],
                'height_cm'    => $boxHei,
                'weight_kg'    => $unitKg,
                'weight_g'     => $unitG,
                // Geometría de la orientación óptima horizontal (para calcular huecos verticales)
                'box_L'        => $layerDetail['box_L'],
                'box_W'        => $layerDetail['box_W'],
                'layer_detail' => $layerDetail,
                // Separador de seguridad cada N capas (null = sin separador)
                'sec_sep_n'    => $b->security_separator_every_n_layers !== null
                                    ? (int)$b->security_separator_every_n_layers
                                    : null,

                'box_variant' => $pv ? [
                    'id' => (int)$pv->id,
                    'condition' => (string)$pv->condition,
                    'provider_name' => (string)$pv->provider_name,
                    'unit_cost_eur' => (float)$pv->unit_cost_eur,
                    'on_hand_qty' => (int)$pv->on_hand_qty,
                    'length_cm' => (int)$pv->length_cm,
                    'width_cm' => (int)$pv->width_cm,
                    'height_cm' => (int)$pv->height_cm,
                ] : null,
            ];
        }

        // N efectivo de separador de seguridad para este pallet:
        // el más restrictivo (mínimo) entre los tipos con unidades pendientes que tengan N definido.
        $secSepN = null;
        foreach ($this->types as $code) {
            if (($remaining[$code] ?? 0) <= 0) continue;
            $n = $info[$code]['sec_sep_n'] ?? null;
            if ($n === null) continue;
            $secSepN = $secSepN === null ? $n : min($secSepN, $n);
        }

        // Validación mínima — solo para tipos con unidades pendientes de empaquetar
        foreach ($info as $code => $t) {
            if (($remaining[$code] ?? 0) <= 0) continue; // tipo sin unidades: no necesita ser válido
            if ($t['per_layer'] <= 0 || $t['height_cm'] <= 0 || ($t['weight_g'] ?? 0) <= 0) {
                return [
                    'pallet_count' => 0,
                    'pallets' => [],
                    'metrics' => [
                        'error' => "Tipo {$code}: datos inválidos (per_layer/height/weight).",
                        'info' => $info,
                    ],
                    'warnings' => [],
                    'packed_items' => ['tower' => 0, 'tower_sff' => 0, 'laptop' => 0, 'mini_pc' => 0],
                    'remaining_items' => $remaining,
                    'limit_pallets' => $limitPallets,
                ];
            }
        }

        $pallets = [];
        $guard = 0;

        // Si limitPallets es null => hasta terminar; si no => máximo N pallets
        while (($remaining['tower'] + $remaining['tower_sff'] + $remaining['laptop'] + $remaining['mini_pc']) > 0) {
            if ($limitPallets !== null && count($pallets) >= $limitPallets) {
                break;
            }

            // Guardia anti-loops
            $guard++;
            if ($guard > 5000) break;

            $pallet = [
                'layers' => [],
                'height_cm' => 0,
                'weight_g' => 0,   // cálculo exacto
                'weight_kg' => 0,  // derivado (para UI legacy)
                'boxes' => [
                    'tower'     => 0,
                    'tower_sff' => 0,
                    'laptop'    => 0,
                    'mini_pc'   => 0,
                ],
            ];

            // Contador de capas desde el último separador de seguridad (o desde el inicio del pallet).
            // Cuando llega a $secSepN se inserta un separador y se reinicia.
            $layersSinceSecSep = 0;

            // Indica si el vertical ya fue mostrado desde el último separador de seguridad.
            // Se reinicia a false tras cada separador para permitir otro bloque vertical.
            $verticalShownSinceSecSep = false;


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

                $unitG = (int) ($info[$chosen]['weight_g'] ?? 0);
                $layerWeightG = $want * $unitG;

                $remainingG = $palletMaxG - (int)$pallet['weight_g'];
                if ($layerWeightG > $remainingG) {
                    $can = $unitG > 0 ? intdiv($remainingG, $unitG) : 0;
                    $want = max(0, min($can, $cap, $remaining[$chosen]));
                    $layerWeightG = $want * $unitG;
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

                        $unitG2 = (int) ($info[$t2]['weight_g'] ?? 0);
                        $fillWeightG = $fill * $unitG2;

                        $remainingG2 = $palletMaxG - ((int)$pallet['weight_g'] + (int)$layerWeightG);
                        if ($fillWeightG > $remainingG2) {
                            $can2 = $unitG2 > 0 ? intdiv($remainingG2, $unitG2) : 0;
                            $fill = max(0, min($can2, $slots, $remaining[$t2]));
                            $fillWeightG = $fill * $unitG2;
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
                        $layerWeightG += $fillWeightG;

                        if ($slots <= 0) break;
                    }
                }

                // Aplicar principal
                $remaining[$chosen] -= $want;
                $pallet['boxes'][$chosen] += $want;

                // ── RELLENO VERTICAL DEL HUECO ──────────────────────────────────────
                // Solo se calcula y muestra en la primera capa de cada bloque
                // (entre separadores de seguridad). Las siguientes capas del mismo bloque
                // no repiten el vertical porque el hueco ya está ocupado físicamente.
                $layer['vertical'] = [];
                $vertWeightG = 0;

                if (!$verticalShownSinceSecSep) {
                    $remainingGBeforeVert = $palletMaxG - ((int)$pallet['weight_g'] + (int)$layerWeightG);

                    $vertCandidates = $this->calcVerticalFill(
                        $palletL,
                        $palletW,
                        $info[$chosen]['layer_detail'],
                        $info,
                        $remaining,
                        $remainingGBeforeVert
                    );

                    foreach ($vertCandidates as $vc) {
                        $vcCode  = $vc['type'];
                        $vcCount = $vc['count'];

                        $availG = $remainingGBeforeVert - $vertWeightG;
                        $unitGv = (int)($info[$vcCode]['weight_g'] ?? 0);
                        $maxByW = $unitGv > 0 ? intdiv($availG, $unitGv) : $vcCount;
                        $vcCount = min($vcCount, $remaining[$vcCode], $maxByW);

                        if ($vcCount <= 0) continue;

                        $layer['vertical'][] = [
                            'type'           => $vcCode,
                            'count'          => $vcCount,
                            'vert_height_cm' => $vc['vert_height_cm'],
                        ];

                        $remaining[$vcCode]      -= $vcCount;
                        $pallet['boxes'][$vcCode] += $vcCount;
                        $vertWeightG             += $vcCount * $unitGv;
                    }

                    if (!empty($layer['vertical'])) {
                        $verticalShownSinceSecSep = true;
                    }
                }

                // Las cajas verticales NO suman a la altura de la capa (van dentro del hueco lateral)
                // pero SÍ suman al peso total del pallet
                $layer['has_vertical'] = !empty($layer['vertical']);
                $layerWeightG += $vertWeightG;
                // ────────────────────────────────────────────────────────────────────

                $layer['height_cm'] = $info[$chosen]['height_cm'];
                $layer['weight_g']  = (int) $layerWeightG;
                $layer['weight_kg'] = round(((int)$layerWeightG) / 1000, 3);
                $pallet['layers'][] = $layer;
                $pallet['height_cm'] += $info[$chosen]['height_cm'];
                $pallet['weight_g']  += (int)$layerWeightG;

                // derivado "bonito" (exacto a gramos)
                $pallet['weight_kg'] = round(((int)$pallet['weight_g']) / 1000, 3);

                // ── SEPARADOR DE SEGURIDAD ───────────────────────────────────────────
                // Tras añadir la capa, incrementamos el contador. Si alcanza el N efectivo,
                // insertamos un separador de seguridad (no suma altura ni peso) y reiniciamos
                // el bloque: el vertical podrá aparecer de nuevo en la siguiente capa.
                $layersSinceSecSep++;

                if ($secSepN !== null && $layersSinceSecSep >= $secSepN) {
                    $stillRemaining = ($remaining['tower'] + $remaining['tower_sff'] + $remaining['laptop'] + $remaining['mini_pc']) > 0;
                    $heightOk = $pallet['height_cm'] < $palletMaxH;
                    $weightOk = $pallet['weight_g']  < $palletMaxG;

                    if ($stillRemaining && $heightOk && $weightOk) {
                        $pallet['layers'][] = [
                            'type'               => 'security_separator',
                            'security_separator' => true,
                            'count'              => 0,
                            'per_layer'          => 0,
                            'is_mixed'           => false,
                            'separator'          => false,
                            'vertical'           => [],
                            'has_vertical'       => false,
                            'weight_g'           => 0,
                            'weight_kg'          => 0.0,
                        ];

                        $layersSinceSecSep        = 0;
                        $verticalShownSinceSecSep = false;
                    }
                }
                // ────────────────────────────────────────────────────────────────────

                if ($pallet['height_cm'] >= $palletMaxH) break;
                if ($pallet['weight_g']  >= $palletMaxG) break;
                if (($remaining['tower'] + $remaining['tower_sff'] + $remaining['laptop'] + $remaining['mini_pc']) <= 0) break;
            }

            $totalBoxes = array_sum($pallet['boxes']);
            if ($totalBoxes > 0) {
                $pallets[] = $pallet;
            } else {
                break;
            }
        }

        $packed = [
            'tower'     => (int)($items['tower'] ?? 0)     - $remaining['tower'],
            'tower_sff' => (int)($items['tower_sff'] ?? 0) - $remaining['tower_sff'],
            'laptop'    => (int)($items['laptop'] ?? 0)    - $remaining['laptop'],
            'mini_pc'   => (int)($items['mini_pc'] ?? 0)   - $remaining['mini_pc'],
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

        // Agregar cajas colocadas en vertical por tipo a lo largo de todos los pallets
        $verticalTotals = ['tower' => 0, 'tower_sff' => 0, 'laptop' => 0, 'mini_pc' => 0];
        foreach ($pallets as $p) {
            foreach ($p['layers'] as $lay) {
                if (!empty($lay['vertical'])) {
                    foreach ($lay['vertical'] as $v) {
                        $vt = $v['type'] ?? null;
                        if ($vt !== null && array_key_exists($vt, $verticalTotals)) {
                            $verticalTotals[$vt] += (int)($v['count'] ?? 0);
                        }
                    }
                }
            }
        }
        $verticalTotal = array_sum($verticalTotals);

        $metrics = [
            'pallet' => [
                'L_cm' => $palletL,
                'W_cm' => $palletW,
                'H_cm' => $palletMaxH,
                'max_kg' => $palletMaxKg,
                'max_weight_g' => $palletMaxG,
                'weight_g' => $info['tower']['weight_g'] ?? ($info['tower_sff']['weight_g'] ?? 0),
            ],
            'vertical_totals' => $verticalTotals,
            'vertical_total'  => $verticalTotal,
            'per_type' => [
                'tower' => [
                    'per_layer' => $info['tower']['per_layer'] ?? 0,
                    'height_cm' => $info['tower']['height_cm'] ?? 0,
                    'weight_kg' => $info['tower']['weight_kg'] ?? 0,
                ],
                'tower_sff' => [
                    'per_layer' => $info['tower_sff']['per_layer'] ?? 0,
                    'height_cm' => $info['tower_sff']['height_cm'] ?? 0,
                    'weight_kg' => $info['tower_sff']['weight_kg'] ?? 0,
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

        $bestTotal = (float) ($best['total_cost'] ?? ($best['total_price'] ?? 0));

        foreach ($alternatives as $alt) {
            $altTotal = (float) ($alt['total_cost'] ?? ($alt['total_price'] ?? 0));
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

    /**
     * Calcula el mejor plan comparando todos los transportistas disponibles.
     *
     * - Para España ($provinceId): cada transportista tiene su propia zona asignada
     *   a esa provincia (province_zones → zones). Se busca la zona de cada carrier
     *   y se calcula su plan independientemente.
     *
     * - Para otros países ($zoneId): la zona ya implica el transportista (zones.carrier_id).
     *   Se obtiene el carrier de la zona y se calcula un único plan.
     */
    public function calculateBestPlanAcrossCarriers(
        array $items,
        ?int $provinceId = null,
        ?int $zoneId = null,
        ?array $allowedPalletTypeCodes = null,
        bool $allowSeparators = true,
        ?array $carrierIds = null
    ): array {
        // Construir mapa carrier → zone_id
        if ($provinceId !== null) {
            // España: cada carrier puede tener su propia zona para esta provincia
            $carrierZones = DB::table('province_zones as pz')
                ->join('zones as z', 'z.id', '=', 'pz.zone_id')
                ->join('carriers as c', 'c.id', '=', 'z.carrier_id')
                ->where('pz.province_id', $provinceId)
                ->where('c.is_active', true)
                ->select('c.id as carrier_id', 'c.code as carrier_code', 'c.name as carrier_name', 'z.id as zone_id')
                ->get();
        } else {
            // Otro país: la zona ya implica el carrier
            $cz = DB::table('zones as z')
                ->join('carriers as c', 'c.id', '=', 'z.carrier_id')
                ->where('z.id', $zoneId)
                ->where('c.is_active', true)
                ->select('c.id as carrier_id', 'c.code as carrier_code', 'c.name as carrier_name', 'z.id as zone_id')
                ->first();
            $carrierZones = $cz ? collect([$cz]) : collect();
        }

        // Filtrar por selección manual de carriers en la UI
        if (is_array($carrierIds) && count($carrierIds) > 0) {
            $ids = array_values(array_unique(array_filter(array_map('intval', $carrierIds), fn($v) => $v > 0)));
            $carrierZones = $carrierZones->whereIn('carrier_id', $ids)->values();
        }

        if ($carrierZones->isEmpty()) {
            return ['error' => 'No hay transportistas con tarifas para ese destino (o no coinciden con la selección).'];
        }

        $allCandidates = [];

        foreach ($carrierZones as $cz) {
            $plan = $this->calculateBestPlan(
                (int) $cz->zone_id,
                $items,
                $allowedPalletTypeCodes,
                $allowSeparators,
                (int) $cz->carrier_id
            );

            if (!empty($plan['error'])) {
                continue;
            }

            $best = $plan['best'] ?? null;
            $alts = $plan['alternatives'] ?? [];

            if ($best) {
                $best['carrier_id']   = (int) $cz->carrier_id;
                $best['carrier_code'] = (string) $cz->carrier_code;
                $best['carrier_name'] = (string) $cz->carrier_name;
                $allCandidates[] = $best;
            }

            if (is_array($alts)) {
                foreach ($alts as $a) {
                    $a['carrier_id']   = (int) $cz->carrier_id;
                    $a['carrier_code'] = (string) $cz->carrier_code;
                    $a['carrier_name'] = (string) $cz->carrier_name;
                    $allCandidates[] = $a;
                }
            }
        }

        if (empty($allCandidates)) {
            return ['error' => 'No se pudo calcular ningún plan con las tarifas disponibles.'];
        }

        usort($allCandidates, fn($a, $b) => ($a['total_price'] ?? INF) <=> ($b['total_price'] ?? INF));

        $best         = $allCandidates[0];
        $alternatives = array_slice($allCandidates, 1, 5);

        $recommendations = $this->buildRecommendations($best, $alternatives, 0.03);

        return [
            'best'            => $best,
            'alternatives'    => $alternatives,
            'recommendations' => $recommendations,
        ];
    }

    private function attachPackagingVariants(array $items): array
    {
        $pack = $items['packaging'] ?? null;
        if (!is_array($pack) || empty($pack)) return $items;

        $wanted = [];
        foreach (['tower', 'tower_sff', 'laptop', 'mini_pc'] as $k) {
            $id = isset($pack[$k]) ? (int)$pack[$k] : 0;
            if ($id > 0) $wanted[$k] = $id;
        }
        if (empty($wanted)) return $items;

        $rows = DB::table('box_variants as bv')
            ->join('box_providers as bp', 'bp.id', '=', 'bv.provider_id')
            ->whereIn('bv.id', array_values($wanted))
            ->select([
                'bv.id',
                'bv.kind',
                'bv.condition',
                'bv.provider_id',
                'bp.name as provider_name',
                'bp.provider_type',
                'bv.length_cm',
                'bv.width_cm',
                'bv.height_cm',
                'bv.unit_cost_eur',
                'bv.on_hand_qty',
                'bv.is_active',
            ])
            ->get();

        $map = [];
        foreach ($rows as $r) {
            $kind = (string)($r->kind ?? '');
            if (!in_array($kind, ['tower', 'tower_sff', 'laptop', 'mini_pc'], true)) continue;
            if (!isset($wanted[$kind]) || (int)$wanted[$kind] !== (int)$r->id) continue;
            if (!(bool)$r->is_active) continue;
            $map[$kind] = $r;
        }

        if (!empty($map)) $items['_packaging_variants'] = $map;
        return $items;
    }


    private function computePackagingSummary(array $items): array
    {
        // Unidades por tipo lógico (desde lines si vienen)
        $qty = [
            'tower'     => (int)($items['tower'] ?? 0),
            'tower_sff' => (int)($items['tower_sff'] ?? 0),
            'laptop'    => (int)($items['laptop'] ?? 0),
            'mini_pc'   => (int)($items['mini_pc'] ?? 0),
        ];

        if (!empty($items['lines']) && is_array($items['lines'])) {
            $modelQty = [];
            foreach ($items['lines'] as $line) {
                $id = (int)($line['device_model_id'] ?? 0);
                $q  = (int)($line['qty'] ?? 0);
                if ($id > 0 && $q > 0) $modelQty[$id] = ($modelQty[$id] ?? 0) + $q;
            }

            if (!empty($modelQty)) {
                $rows = DB::table('device_models as dm')
                    ->join('box_types as bt', 'bt.id', '=', 'dm.box_type_id')
                    ->whereIn('dm.id', array_keys($modelQty))
                    ->select(['dm.id', 'bt.code as box_code'])
                    ->get();

                $qty = ['tower' => 0, 'tower_sff' => 0, 'laptop' => 0, 'mini_pc' => 0];
                foreach ($rows as $r) {
                    $code = (string)($r->box_code ?? '');
                    $id = (int)$r->id;
                    if (!isset($qty[$code])) continue;
                    $qty[$code] += (int)($modelQty[$id] ?? 0);
                }
            }
        }

        // packRequested = true solo si al menos un tipo tiene un variant_id real (> 0).
        // El frontend envía packaging: { tower: null, tower_sff: null, … } aunque no haya
        // selección, por lo que count() > 0 siempre — no sirve como indicador.
        $packRequested = false;
        if (is_array($items['packaging'] ?? null)) {
            foreach ($items['packaging'] as $v) {
                if ($v !== null && (int)$v > 0) { $packRequested = true; break; }
            }
        }
        $variants = $items['_packaging_variants'] ?? [];

        $selected = [];
        $errors = [];
        $warnings = [];
        $totalBoxCost = 0.0;
        $breakdown = [];

        foreach (['tower', 'tower_sff', 'laptop', 'mini_pc'] as $kind) {
            $need = (int)($qty[$kind] ?? 0);
            $selId = isset($items['packaging'][$kind]) ? (int)$items['packaging'][$kind] : null;
            $v = $variants[$kind] ?? null;

            if ($packRequested && $need > 0) {
                if (!$selId) {
                    $errors[] = "Falta seleccionar caja para {$kind}.";
                    continue;
                }
                if (!$v) {
                    $errors[] = "La caja seleccionada para {$kind} no existe/no está activa.";
                    continue;
                }
                if ((int)$v->on_hand_qty < $need) {
                    $warnings[] = "Stock bajo para {$kind}: necesitas {$need} y hay " . (int)$v->on_hand_qty . ".";
                    // No bloqueamos — el stock registrado puede estar desactualizado
                }
            }

            if ($v) {
                $selected[$kind] = [
                    'id' => (int)$v->id,
                    'kind' => (string)$v->kind,
                    'condition' => (string)$v->condition,
                    'provider_name' => (string)$v->provider_name,
                    'unit_cost_eur' => (float)$v->unit_cost_eur,
                    'on_hand_qty' => (int)$v->on_hand_qty,
                    'length_cm' => (int)$v->length_cm,
                    'width_cm' => (int)$v->width_cm,
                    'height_cm' => (int)$v->height_cm,
                ];

                $unitCost = (float)$v->unit_cost_eur;
                $isNew = ((string)$v->condition) === 'new';
                $cost = ($isNew && $need > 0) ? ($need * $unitCost) : 0.0;

                $breakdown[$kind] = [
                    'qty' => $need,
                    'unit_cost_eur' => $unitCost,
                    'is_new' => $isNew,
                    'total_cost_eur' => $cost,
                ];

                $totalBoxCost += $cost;
            }
        }

        return [
            'qty_by_kind' => $qty,
            'selected' => $selected,
            'breakdown' => $breakdown,
            'total_box_cost' => $totalBoxCost,
            'errors' => $errors,
            'warnings' => $warnings,
            'packaging_requested' => $packRequested,
        ];
    }

    /**
     * Devuelve el carrier_rate_name para un tipo de pallet + zona + carrier.
     * Usado para rellenar mix.a y mix.b con el nombre comercial de la tarifa.
     */
    private function getCarrierRateName(int $zoneId, object $palletType, int $palletCount, ?int $carrierId): ?string
    {
        if ($palletCount <= 0) return null;

        $q = DB::table('rates')
            ->where('zone_id', $zoneId)
            ->where('pallet_type_id', $this->resolvePalletTypeId($palletType));

        if ($carrierId !== null) $q->where('carrier_id', $carrierId);

        $rate = $q->where('min_pallets', '<=', $palletCount)
                  ->where('max_pallets', '>=', $palletCount)
                  ->orderBy('min_pallets')
                  ->first();

        if (!$rate) {
            $fb = DB::table('rates')
                ->where('zone_id', $zoneId)
                ->where('pallet_type_id', $this->resolvePalletTypeId($palletType));
            if ($carrierId !== null) $fb->where('carrier_id', $carrierId);
            $rate = $fb->orderByDesc('max_pallets')->first();
        }

        return $rate->carrier_rate_name ?? null;
    }
}