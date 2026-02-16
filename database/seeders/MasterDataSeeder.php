<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MasterDataSeeder extends Seeder
{
    public function run(): void
    {
        // -------------------------
        // BOX TYPES (demo)
        // -------------------------
        DB::table('box_types')->upsert([
            ['code' => 'laptop',  'name' => 'Portátil',       'length_cm' => 40, 'width_cm' => 40, 'height_cm' => 12, 'weight_kg' => 4.00,  'created_at' => now(), 'updated_at' => now()],
            ['code' => 'mini_pc', 'name' => 'Mini PC (Tiny)', 'length_cm' => 35, 'width_cm' => 25, 'height_cm' => 15, 'weight_kg' => 3.00,  'created_at' => now(), 'updated_at' => now()],
            ['code' => 'tower',   'name' => 'Torre oficina',  'length_cm' => 60, 'width_cm' => 30, 'height_cm' => 25, 'weight_kg' => 10.00, 'created_at' => now(), 'updated_at' => now()],
        ], ['code'], ['name', 'length_cm', 'width_cm', 'height_cm', 'weight_kg', 'updated_at']);


        $boxTypeId = fn (string $code) => DB::table('box_types')->where('code', $code)->value('id');

        // -------------------------
        // DEVICE MODELS (demo)
        // -------------------------
        DB::table('device_models')->upsert([
            [
                'brand' => 'Lenovo',
                'name' => 'ThinkPad T14 Gen 2',
                'sku' => 'LEN-T14G2',
                'box_type_id' => $boxTypeId('laptop'),
                'weight_kg' => 4.20,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'brand' => 'Dell',
                'name' => 'Latitude 5400',
                'sku' => 'DEL-LAT5400',
                'box_type_id' => $boxTypeId('laptop'),
                'weight_kg' => 4.10,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'brand' => 'HP',
                'name' => 'EliteDesk 800 G5 Mini',
                'sku' => 'HP-ED800G5M',
                'box_type_id' => $boxTypeId('mini_pc'),
                'weight_kg' => 3.20,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'brand' => 'Dell',
                'name' => 'OptiPlex 7080 Tower',
                'sku' => 'DEL-OP7080T',
                'box_type_id' => $boxTypeId('tower'),
                'weight_kg' => 10.13,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ], ['sku'], ['brand', 'name', 'box_type_id', 'weight_kg', 'is_active', 'updated_at']);

                // -------------------------
        // BOX PROVIDERS + BOX VARIANTS + STOCK (demo)
        // -------------------------
        DB::table('box_providers')->upsert([
            ['name' => 'Electronic Bazaar', 'provider_type' => 'reused_source', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Ledmax',            'provider_type' => 'reused_source', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Proveedor Cajas A', 'provider_type' => 'new_supplier',  'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Proveedor Cajas B', 'provider_type' => 'new_supplier',  'created_at' => now(), 'updated_at' => now()],
        ], ['name'], ['provider_type', 'updated_at']);

        $providerId = fn (string $name) => DB::table('box_providers')->where('name', $name)->value('id');

        $variants = [
            // Reutilizadas (proveedores de equipos)
            ['kind' => 'laptop',  'condition' => 'reused', 'provider' => 'Electronic Bazaar', 'length_cm' => 42, 'width_cm' => 32, 'height_cm' => 12, 'weight_kg' => 0.400, 'unit_cost_eur' => 0],
            ['kind' => 'tower',   'condition' => 'reused', 'provider' => 'Electronic Bazaar', 'length_cm' => 55, 'width_cm' => 30, 'height_cm' => 45, 'weight_kg' => 0.800, 'unit_cost_eur' => 0],
            ['kind' => 'mini_pc', 'condition' => 'reused', 'provider' => 'Electronic Bazaar', 'length_cm' => 30, 'width_cm' => 25, 'height_cm' => 12, 'weight_kg' => 0.250, 'unit_cost_eur' => 0],

            ['kind' => 'laptop',  'condition' => 'reused', 'provider' => 'Ledmax', 'length_cm' => 40, 'width_cm' => 30, 'height_cm' => 10, 'weight_kg' => 0.350, 'unit_cost_eur' => 0],
            ['kind' => 'tower',   'condition' => 'reused', 'provider' => 'Ledmax', 'length_cm' => 52, 'width_cm' => 28, 'height_cm' => 42, 'weight_kg' => 0.750, 'unit_cost_eur' => 0],
            ['kind' => 'mini_pc', 'condition' => 'reused', 'provider' => 'Ledmax', 'length_cm' => 28, 'width_cm' => 24, 'height_cm' => 11, 'weight_kg' => 0.220, 'unit_cost_eur' => 0],

            // Nuevas (proveedores de cajas)
            ['kind' => 'laptop',  'condition' => 'new', 'provider' => 'ByteBox Solutions', 'length_cm' => 41, 'width_cm' => 31, 'height_cm' => 11, 'weight_kg' => 0.380, 'unit_cost_eur' => 1.2500],
            ['kind' => 'tower',   'condition' => 'new', 'provider' => 'ByteBox Solutions', 'length_cm' => 54, 'width_cm' => 29, 'height_cm' => 44, 'weight_kg' => 0.780, 'unit_cost_eur' => 2.7000],
            ['kind' => 'mini_pc', 'condition' => 'new', 'provider' => 'ByteBox Solutions', 'length_cm' => 29, 'width_cm' => 24, 'height_cm' => 11, 'weight_kg' => 0.240, 'unit_cost_eur' => 0.9500],

            ['kind' => 'laptop',  'condition' => 'new', 'provider' => 'PrimePack', 'length_cm' => 43, 'width_cm' => 33, 'height_cm' => 12, 'weight_kg' => 0.420, 'unit_cost_eur' => 1.1000],
            ['kind' => 'tower',   'condition' => 'new', 'provider' => 'PrimePack', 'length_cm' => 56, 'width_cm' => 31, 'height_cm' => 46, 'weight_kg' => 0.820, 'unit_cost_eur' => 2.4000],
            ['kind' => 'mini_pc', 'condition' => 'new', 'provider' => 'PrimePack', 'length_cm' => 31, 'width_cm' => 26, 'height_cm' => 12, 'weight_kg' => 0.260, 'unit_cost_eur' => 0.8800],
        ];

        foreach ($variants as $v) {
            $pid = $providerId($v['provider']);
            if (!$pid) continue;

            $existingId = DB::table('box_variants')
                ->where('kind', $v['kind'])
                ->where('condition', $v['condition'])
                ->where('provider_id', $pid)
                ->value('id');

            if (!$existingId) {
                $existingId = DB::table('box_variants')->insertGetId([
                    'kind' => $v['kind'],
                    'condition' => $v['condition'],
                    'provider_id' => $pid,
                    'length_cm' => $v['length_cm'],
                    'width_cm' => $v['width_cm'],
                    'height_cm' => $v['height_cm'],
                    'weight_kg' => $v['weight_kg'],
                    'unit_cost_eur' => $v['unit_cost_eur'],
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                DB::table('box_variants')->where('id', $existingId)->update([
                    'length_cm' => $v['length_cm'],
                    'width_cm' => $v['width_cm'],
                    'height_cm' => $v['height_cm'],
                    'weight_kg' => $v['weight_kg'],
                    'unit_cost_eur' => $v['unit_cost_eur'],
                    'is_active' => true,
                    'updated_at' => now(),
                ]);
            }

            // stock demo
            DB::table('box_variant_stocks')->updateOrInsert(
                ['box_variant_id' => $existingId],
                [
                    'on_hand_qty' => 500, // demo (luego lo ajusta usuario)
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        // -------------------------
        // PALLET TYPES
        // -------------------------
        DB::table('pallet_types')->upsert([
            ['code' => 'mini_quarter', 'name' => '120×80 (110cm, 300kg)',  'base_length_cm' => 120, 'base_width_cm' => 80,  'max_height_cm' => 110, 'max_weight_kg' => 300,  'created_at' => now(), 'updated_at' => now()],
            ['code' => 'quarter',      'name' => '120×80 (110cm, 300kg)',  'base_length_cm' => 120, 'base_width_cm' => 80,  'max_height_cm' => 110, 'max_weight_kg' => 300,  'created_at' => now(), 'updated_at' => now()],
            ['code' => 'half',         'name' => '120×100 (160cm, 600kg)', 'base_length_cm' => 120, 'base_width_cm' => 100, 'max_height_cm' => 160, 'max_weight_kg' => 600,  'created_at' => now(), 'updated_at' => now()],
            ['code' => 'extra_light',  'name' => '120×100 (220cm, 450kg)', 'base_length_cm' => 120, 'base_width_cm' => 100, 'max_height_cm' => 220, 'max_weight_kg' => 450,  'created_at' => now(), 'updated_at' => now()],
            ['code' => 'light',        'name' => '120×100 (220cm, 750kg)', 'base_length_cm' => 120, 'base_width_cm' => 100, 'max_height_cm' => 220, 'max_weight_kg' => 750,  'created_at' => now(), 'updated_at' => now()],
            ['code' => 'full',         'name' => '120×100 (220cm, 1200kg)', 'base_length_cm' => 120, 'base_width_cm' => 100, 'max_height_cm' => 220, 'max_weight_kg' => 1200, 'created_at' => now(), 'updated_at' => now()],
        ], ['code'], ['name', 'base_length_cm', 'base_width_cm', 'max_height_cm', 'max_weight_kg', 'updated_at']);

        $palletId = fn (string $code) => DB::table('pallet_types')->where('code', $code)->value('id');

        // -------------------------
        // COUNTRIES
        // -------------------------
        DB::table('countries')->upsert([
            ['code' => 'ES', 'name' => 'España',    'created_at' => now(), 'updated_at' => now()],
            ['code' => 'PT', 'name' => 'Portugal', 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'IT', 'name' => 'Italia',   'created_at' => now(), 'updated_at' => now()],
            ['code' => 'RO', 'name' => 'Rumanía',  'created_at' => now(), 'updated_at' => now()],
            ['code' => 'PL', 'name' => 'Polonia',  'created_at' => now(), 'updated_at' => now()],
        ], ['code'], ['name', 'updated_at']);

        $countryId = fn (string $code) => DB::table('countries')->where('code', $code)->value('id');

        // -------------------------
        // CARRIERS
        // -------------------------
        DB::table('carriers')->upsert([
            ['code' => 'palletways',     'name' => 'Palletways',         'is_active' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'euro_fast',      'name' => 'EuroFast Logistics', 'is_active' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'budget_freight', 'name' => 'Budget Freight',     'is_active' => 1, 'created_at' => now(), 'updated_at' => now()],
        ], ['code'], ['name', 'is_active', 'updated_at']);

        $carrierId = fn (string $code) => DB::table('carriers')->where('code', $code)->value('id');

        // -------------------------
        // ZONES
        // -------------------------
        $zoneIds = [];               // Iberia por número (1..14)
        $intlZoneIdsByName = [];     // por país y nombre (IT/RO/PL)

        // ES zones except 10
        $esId = $countryId('ES');
        for ($i = 1; $i <= 14; $i++) {
            if ($i === 10) continue;
            $zoneName = "Zona {$i}";
            DB::table('zones')->updateOrInsert(
                ['country_id' => $esId, 'name' => $zoneName],
                ['updated_at' => now(), 'created_at' => now()]
            );
            $zoneIds[$i] = DB::table('zones')->where('country_id', $esId)->where('name', $zoneName)->value('id');
        }

        // PT zone 10
        $ptId = $countryId('PT');
        DB::table('zones')->updateOrInsert(
            ['country_id' => $ptId, 'name' => 'Zona 10'],
            ['updated_at' => now(), 'created_at' => now()]
        );
        $zoneIds[10] = DB::table('zones')->where('country_id', $ptId)->where('name', 'Zona 10')->value('id');

        // IT/RO/PL zones
        $realZones = [
            'IT' => ['Lombardia (Milán)', 'Lazio (Roma)', 'Campania (Nápoles)', 'Veneto (Venecia)', 'Piemonte (Turín)'],
            'PL' => ['Mazowieckie (Varsovia)', 'Małopolskie (Cracovia)', 'Śląskie (Katowice)', 'Wielkopolskie (Poznań)', 'Pomorskie (Gdańsk)'],
            'RO' => ['București-Ilfov (Bucarest)', 'Cluj (Cluj-Napoca)', 'Timiș (Timișoara)', 'Iași', 'Constanța'],
        ];

        foreach ($realZones as $cc => $names) {
            $cid = $countryId($cc);

            foreach ($names as $zoneName) {
                DB::table('zones')->updateOrInsert(
                    ['country_id' => $cid, 'name' => $zoneName],
                    ['updated_at' => now(), 'created_at' => now()]
                );

                $intlZoneIdsByName[$cc][$zoneName] = DB::table('zones')
                    ->where('country_id', $cid)
                    ->where('name', $zoneName)
                    ->value('id');
            }
        }

        // -------------------------
        // PROVINCES (ES)
        // -------------------------
        $zoneProvinces = [
            1  => ['Cádiz', 'Córdoba', 'Granada', 'Jaen', 'Málaga', 'Sevilla'],
            2  => ['Almería', 'Campo Gibraltar', 'Huelva'],
            3  => ['Badajoz', 'Ciudad Real', 'Guadalajara', 'Madrid', 'Murcia'],
            4  => ['Albacete', 'Toledo'],
            5  => ['Burgos', 'La Rioja', 'Segovia', 'Valladolid', 'Zaragoza'],
            6  => ['Álava', 'Avila', 'Cuenca', 'Huesca', 'León', 'Navarra', 'Palencia', 'Salamanca', 'Soria', 'Teruel', 'Valencia', 'Zamora'],
            7  => ['Alicante', 'Asturias', 'Cantabria', 'Castellón', 'Guipuzcoa', 'Lérida', 'Tarragona', 'Vizcaya'],
            8  => ['Barcelona', 'Cáceres'],
            9  => ['Coruña', 'Gerona', 'Lugo', 'Orense', 'Pontevedra'],
            11 => ['Mallorca'],
            12 => ['Ibiza y Menorca'],
            13 => ['Gran Canaria', 'Tenerife'],
            14 => ['Fuenteventura', 'Lanzarote', 'La Palma', 'La Gomera', 'El Hierro'],
        ];

        foreach ($zoneProvinces as $zoneNum => $provList) {
            foreach ($provList as $provName) {
                DB::table('provinces')->updateOrInsert(
                    ['name' => $provName],
                    ['zone_id' => $zoneIds[$zoneNum], 'updated_at' => now(), 'created_at' => now()]
                );
            }
        }

        // -------------------------
        // RATES PALLETWAYS (IBERIA) - base
        // -------------------------
        $rates = [];

        $miniQuarter = [
            1 => 38.91, 2 => 41.21, 3 => 42.84, 4 => 44.50, 5 => 46.27, 6 => 51.26,
            7 => 53.38, 8 => 54.23, 9 => 55.40, 10 => 64.60, 11 => 91.11, 12 => 93.46,
        ];
        $quarter = [
            1 => 42.02, 2 => 44.43, 3 => 49.06, 4 => 50.72, 5 => 52.47, 6 => 57.48,
            7 => 59.66, 8 => 62.21, 9 => 63.29, 10 => 77.69, 11 => 114.37, 12 => 118.30,
        ];
        $half = [
            1 => 55.11, 2 => 59.60, 3 => 64.04, 4 => 66.53, 5 => 69.95, 6 => 71.62,
            7 => 74.78, 8 => 83.28, 9 => 92.40, 10 => 117.58, 11 => 169.71, 12 => 173.63,
        ];

        foreach ($miniQuarter as $z => $price) $rates[] = ['zone' => $z, 'pallet' => 'mini_quarter', 'min' => 1, 'max' => 1, 'price' => $price];
        foreach ($quarter as $z => $price)     $rates[] = ['zone' => $z, 'pallet' => 'quarter',      'min' => 1, 'max' => 1, 'price' => $price];
        foreach ($half as $z => $price)        $rates[] = ['zone' => $z, 'pallet' => 'half',         'min' => 1, 'max' => 1, 'price' => $price];

        $light = [
            1 => [65.76, 63.19, 60.05, 57.61, 56.91],
            2 => [70.46, 67.79, 64.57, 62.28, 61.38],
            3 => [72.74, 70.21, 66.86, 66.03, 65.17],
            4 => [77.78, 75.24, 70.21, 70.21, 68.53],
            5 => [82.90, 80.40, 74.50, 73.67, 72.81],
            6 => [89.64, 87.11, 81.21, 80.40, 78.71],
            7 => [95.60, 93.02, 86.18, 85.34, 84.47],
            8 => [104.17, 100.75, 93.89, 93.02, 91.32],
            9 => [119.02, 115.67, 108.09, 107.29, 105.60],
            10 => [165.55, 162.09, 152.64, 150.91, 148.34],
            11 => [226.84, 222.87, 218.91, 212.59, 209.40],
            12 => [243.45, 239.49, 234.73, 223.65, 218.11],
        ];
        foreach ($light as $z => $prices) {
            for ($i = 1; $i <= 5; $i++) $rates[] = ['zone' => $z, 'pallet' => 'light', 'min' => $i, 'max' => $i, 'price' => $prices[$i - 1]];
        }

        $extraLight = [
            1 => [64.96, 62.44, 59.30],
            2 => [69.59, 66.95, 63.75],
            3 => [72.09, 69.59, 67.93],
            4 => [74.59, 72.92, 71.25],
            5 => [78.00, 76.34, 74.67],
            6 => [82.17, 81.31, 80.51],
            7 => [86.25, 85.40, 84.54],
            8 => [93.86, 93.01, 92.19],
            9 => [104.63, 103.80, 102.96],
            10 => [140.97, 140.12, 139.25],
            11 => [194.17, 193.39, 192.59],
            12 => [202.00, 201.22, 200.44],
        ];
        foreach ($extraLight as $z => $prices) {
            for ($i = 1; $i <= 3; $i++) $rates[] = ['zone' => $z, 'pallet' => 'extra_light', 'min' => $i, 'max' => $i, 'price' => $prices[$i - 1]];
        }

        $full = [
            1 => [68.37, 65.81, 62.70, 60.39, 59.55],
            2 => [73.12, 70.47, 67.27, 64.95, 64.07],
            3 => [75.40, 72.92, 69.59, 68.75, 67.93],
            4 => [80.41, 77.91, 73.74, 72.92, 71.25],
            5 => [84.65, 82.99, 77.16, 76.34, 75.50],
            6 => [92.14, 89.65, 82.99, 82.17, 81.31],
            7 => [98.11, 95.56, 88.80, 87.93, 87.10],
            8 => [111.68, 108.28, 100.67, 99.82, 98.11],
            9 => [126.25, 122.93, 114.61, 113.79, 112.12],
            10 => [169.94, 167.39, 156.31, 154.61, 152.06],
            11 => [264.77, 260.05, 256.91, 248.28, 242.00],
            12 => [282.00, 278.08, 274.15, 259.26, 252.21],
        ];
        foreach ($full as $z => $prices) {
            for ($i = 1; $i <= 5; $i++) $rates[] = ['zone' => $z, 'pallet' => 'full', 'min' => $i, 'max' => $i, 'price' => $prices[$i - 1]];
        }

        // Insert Palletways base rates
        $palletwaysId = $carrierId('palletways');

        foreach ($rates as $r) {
            DB::table('rates')->updateOrInsert(
                [
                    'carrier_id' => $palletwaysId,
                    'zone_id' => $zoneIds[$r['zone']],
                    'pallet_type_id' => $palletId($r['pallet']),
                    'min_pallets' => $r['min'],
                    'max_pallets' => $r['max'],
                ],
                [
                    'price_eur' => $r['price'],
                    'carrier_rate_name' => $this->getPalletwaysRateName($r['pallet']),
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }

        // -------------------------
        // RATES (IBERIA) - EURO_FAST & BUDGET_FREIGHT
        // Basados en Palletways pero con:
        // - catálogo de pallets distinto
        // - ajuste por tramo (1..5)
        // - ajuste por "tipo" (full/half/...)
        // -------------------------
        $euroFastId = $carrierId('euro_fast');
        $budgetId   = $carrierId('budget_freight');

        // Qué "tarifas" (pallet_types) ofrece cada carrier en Iberia
        $carrierOffer = [
            'euro_fast' => ['quarter', 'half', 'extra_light', 'light', 'full'],
            'budget_freight' => ['half', 'light', 'full'],
        ];

        // Ajuste por tramo: EuroFast penaliza 1 pallet pero mejora con volumen; Budget es barato siempre
        $carrierTramoAdj = [
            'euro_fast' => [
                1 => 1.08,
                2 => 1.04,
                3 => 1.01,
                4 => 0.99,
                5 => 0.98,
            ],
            'budget_freight' => [
                1 => 0.97,
                2 => 0.95,
                3 => 0.94,
                4 => 0.93,
                5 => 0.92,
            ],
        ];

        // Ajuste por tipo de pallet
        $typeAdj = [
            'mini_quarter' => 1.02,
            'quarter'      => 1.03,
            'half'         => 1.04,
            'extra_light'  => 1.00,
            'light'        => 1.00,
            'full'         => 1.06,
        ];

        foreach (['euro_fast' => $euroFastId, 'budget_freight' => $budgetId] as $carrierCode => $cid) {
            $offer = $carrierOffer[$carrierCode] ?? [];

            foreach ($rates as $r) {
                // Solo Iberia zonas 1..12 (incluye PT zona 10)
                if (($r['zone'] ?? 0) < 1 || ($r['zone'] ?? 0) > 12) continue;

                // Solo los "pallet types" que ofrece el carrier
                if (!in_array($r['pallet'], $offer, true)) continue;

                $tramo = (int)($r['min'] ?? 1);
                $adjTramo = $carrierTramoAdj[$carrierCode][$tramo] ?? 1.00;
                $adjType  = $typeAdj[$r['pallet']] ?? 1.00;

                $price = round(((float)$r['price']) * $adjTramo * $adjType, 2);

                DB::table('rates')->updateOrInsert(
                    [
                        'carrier_id' => $cid,
                        'zone_id' => $zoneIds[$r['zone']],
                        'pallet_type_id' => $palletId($r['pallet']),
                        'min_pallets' => $r['min'],
                        'max_pallets' => $r['max'],
                    ],
                    [
                        'price_eur' => $price,
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );
            }
        }

        // -------------------------
        // RATES DEMO (IT/RO/PL) para 2 carriers
        // -------------------------
        $demoPallets = ['light', 'full'];
        $demoTramos  = [1, 2, 3];

        $base = [
            'IT' => ['euro_fast' => 120, 'budget_freight' => 110],
            'RO' => ['euro_fast' => 150, 'budget_freight' => 135],
            'PL' => ['euro_fast' => 160, 'budget_freight' => 145],
        ];

        $mult = [
            'light' => 1.00,
            'full'  => 1.18,
        ];

        $disc = [
            1 => 1.00,
            2 => 0.97,
            3 => 0.95,
        ];

        foreach (['IT', 'RO', 'PL'] as $cc) {
            foreach (['euro_fast' => $euroFastId, 'budget_freight' => $budgetId] as $carrierCode => $cid) {
                foreach (($realZones[$cc] ?? []) as $zoneName) {
                    $zoneId = $intlZoneIdsByName[$cc][$zoneName] ?? null;
                    if (!$zoneId) continue;

                    foreach ($demoPallets as $pCode) {
                        foreach ($demoTramos as $n) {
                            $price = $base[$cc][$carrierCode] * $mult[$pCode] * $disc[$n];

                            DB::table('rates')->updateOrInsert(
                                [
                                    'carrier_id' => $cid,
                                    'zone_id' => $zoneId,
                                    'pallet_type_id' => $palletId($pCode),
                                    'min_pallets' => $n,
                                    'max_pallets' => $n,
                                ],
                                [
                                    'price_eur' => round($price, 2),
                                    'updated_at' => now(),
                                    'created_at' => now(),
                                ]
                            );
                        }
                    }
                }
            }
        }
    }

    private function getPalletwaysRateName(string $palletCode): ?string
    {
        return match ($palletCode) {
            'mini_quarter' => 'Mini-Quarter Pallet',
            'quarter'      => 'Quarter Pallet',
            'half'         => 'Half Pallet',
            'extra_light'  => 'Extra Light Pallet',
            'light'        => 'Light Pallet',
            'full'         => 'Full Pallet',
            default        => null,
        };
    }
}