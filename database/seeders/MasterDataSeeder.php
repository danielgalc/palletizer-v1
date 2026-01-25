<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MasterDataSeeder extends Seeder
{
    public function run(): void
    {
        // -------------------------
        // BOX TYPES (suposiciones iniciales)
        // -------------------------
        DB::table('box_types')->upsert([
            ['code' => 'laptop',  'name' => 'Portátil', 'length_cm' => 40, 'width_cm' => 40, 'height_cm' => 12, 'weight_kg' => 4.00, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'mini_pc', 'name' => 'Mini PC (Tiny)', 'length_cm' => 35, 'width_cm' => 25, 'height_cm' => 15, 'weight_kg' => 3.00, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'tower',   'name' => 'Torre oficina', 'length_cm' => 60, 'width_cm' => 30, 'height_cm' => 25, 'weight_kg' => 10.00, 'created_at' => now(), 'updated_at' => now()],
        ], ['code'], ['name','length_cm','width_cm','height_cm','weight_kg','updated_at']);

        // -------------------------
        // PALLET TYPES (según PDF; alturas/pesos como en tu versión actual)
        // -------------------------
        DB::table('pallet_types')->upsert([
            // Ojo: en el PDF hay mini-quarter y quarter; ambos con base 120x80 en el documento de ejemplo.
            ['code' => 'mini_quarter', 'name' => 'Mini-quarter pallet', 'base_length_cm' => 120, 'base_width_cm' => 80,  'max_height_cm' => 110, 'max_weight_kg' => 300,  'created_at' => now(), 'updated_at' => now()],
            ['code' => 'quarter',      'name' => 'Quarter pallet',      'base_length_cm' => 120, 'base_width_cm' => 80,  'max_height_cm' => 110, 'max_weight_kg' => 300,  'created_at' => now(), 'updated_at' => now()],
            ['code' => 'half',         'name' => 'Half pallet',         'base_length_cm' => 120, 'base_width_cm' => 100, 'max_height_cm' => 160, 'max_weight_kg' => 600,  'created_at' => now(), 'updated_at' => now()],
            ['code' => 'extra_light',  'name' => 'Extra light pallet',  'base_length_cm' => 120, 'base_width_cm' => 100, 'max_height_cm' => 220, 'max_weight_kg' => 450,  'created_at' => now(), 'updated_at' => now()],
            ['code' => 'light',        'name' => 'Light pallet',        'base_length_cm' => 120, 'base_width_cm' => 100, 'max_height_cm' => 220, 'max_weight_kg' => 750,  'created_at' => now(), 'updated_at' => now()],
            ['code' => 'full',         'name' => 'Full pallet',         'base_length_cm' => 120, 'base_width_cm' => 100, 'max_height_cm' => 220, 'max_weight_kg' => 1200, 'created_at' => now(), 'updated_at' => now()],
        ], ['code'], ['name','base_length_cm','base_width_cm','max_height_cm','max_weight_kg','updated_at']);

        // Helpers
        $palletId = fn(string $code) => DB::table('pallet_types')->where('code', $code)->value('id');

        // -------------------------
        // ZONES (1..14)
        // -------------------------
        $zoneIds = [];
        for ($i = 1; $i <= 14; $i++) {
            $zoneName = "Zona {$i}";
            DB::table('zones')->updateOrInsert(
                ['name' => $zoneName],
                ['updated_at' => now(), 'created_at' => now()]
            );
            $zoneIds[$i] = DB::table('zones')->where('name', $zoneName)->value('id');
        }

        // -------------------------
        // PROVINCES por zona (tal y como aparecen en el PDF)
        // Nota: seeding con nombres “tal cual”; luego añadiremos normalización de entrada del usuario.
        // -------------------------
        $zoneProvinces = [
            1 => ['Cádiz','Córdoba','Granada','Jaen','Málaga','Sevilla'],
            2 => ['Almería','Campo Gibraltar','Huelva'],
            3 => ['Badajoz','Ciudad Real','Guadalajara','Madrid','Murcia'],
            4 => ['Albacete','Toledo'],
            5 => ['Burgos','La Rioja','Segovia','Valladolid','Zaragoza'],
            6 => ['Álava','Avila','Cuenca','Huesca','León','Navarra','Palencia','Salamanca','Soria','Teruel','Valencia','Zamora'],
            7 => ['Alicante','Asturia','Cantabria','Castellón','Guipuzcoa','Lérida','Tarragona','Vizcaya'],
            8 => ['Barcelona','Cáceres'],
            9 => ['Coruña','Gerona','Lugo','Orense','Pontevedra'],
            // 10 es Portugal resto CP (no es “provincia” española) -> lo dejamos fuera del seeder de provinces
            11 => ['Mallorca'],
            12 => ['Ibiza y Menorca'],
            13 => ['Gran Canaria','Tenerife'],
            14 => ['Fuenteventura','Lanzarote','La Palma','La Gomera','El Hierro'],
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
        // RATES (Zonas 1..12 con precio; 13/14 "Consultar precio")
        // Fuente: tablas del PDF
        // -------------------------

        $rates = [];

        // mini_quarter / quarter / half -> solo 1 pallet (una columna)
        $miniQuarter = [
            1=>38.91, 2=>41.21, 3=>42.84, 4=>44.50, 5=>46.27, 6=>51.26, 7=>53.38, 8=>54.23, 9=>55.40, 10=>64.60, 11=>91.11, 12=>93.46,
        ];
        $quarter = [
            1=>42.02, 2=>44.43, 3=>49.06, 4=>50.72, 5=>52.47, 6=>57.48, 7=>59.66, 8=>62.21, 9=>63.29, 10=>77.69, 11=>114.37, 12=>118.30,
        ];
        $half = [
            1=>55.11, 2=>59.60, 3=>64.04, 4=>66.53, 5=>69.95, 6=>71.62, 7=>74.78, 8=>83.28, 9=>92.40, 10=>117.58, 11=>169.71, 12=>173.63,
        ];

        foreach ($miniQuarter as $z => $price) {
            $rates[] = ['zone' => $z, 'pallet' => 'mini_quarter', 'min' => 1, 'max' => 1, 'price' => $price];
        }
        foreach ($quarter as $z => $price) {
            $rates[] = ['zone' => $z, 'pallet' => 'quarter', 'min' => 1, 'max' => 1, 'price' => $price];
        }
        foreach ($half as $z => $price) {
            $rates[] = ['zone' => $z, 'pallet' => 'half', 'min' => 1, 'max' => 1, 'price' => $price];
        }

        // light -> 1..5 pallets
        $light = [
            1=>[65.76,63.19,60.05,57.61,56.91],
            2=>[70.46,67.79,64.57,62.28,61.38],
            3=>[72.74,70.21,66.86,66.03,65.17],
            4=>[77.78,75.24,70.21,70.21,68.53],
            5=>[82.90,80.40,74.50,73.67,72.81],
            6=>[89.64,87.11,81.21,80.40,78.71],
            7=>[95.60,93.02,86.18,85.34,84.47],
            8=>[104.17,100.75,93.89,93.02,91.32],
            9=>[119.02,115.67,108.09,107.29,105.60],
            10=>[165.55,162.09,152.64,150.91,148.34],
            11=>[226.84,222.87,218.91,212.59,209.40],
            12=>[243.45,239.49,234.73,223.65,218.11],
        ];
        foreach ($light as $z => $prices) {
            for ($i = 1; $i <= 5; $i++) {
                $rates[] = ['zone' => $z, 'pallet' => 'light', 'min' => $i, 'max' => $i, 'price' => $prices[$i-1]];
            }
        }

        // extra_light -> 1..3 pallets
        $extraLight = [
            1=>[64.96,62.44,59.30],
            2=>[69.59,66.95,63.75],
            3=>[72.09,69.59,67.93],
            4=>[74.59,72.92,71.25],
            5=>[78.00,76.34,74.67],
            6=>[82.17,81.31,80.51],
            7=>[86.25,85.40,84.54],
            8=>[93.86,93.01,92.19],
            9=>[104.63,103.80,102.96],
            10=>[140.97,140.12,139.25],
            11=>[194.17,193.39,192.59],
            12=>[202.00,201.22,200.44],
        ];
        foreach ($extraLight as $z => $prices) {
            for ($i = 1; $i <= 3; $i++) {
                $rates[] = ['zone' => $z, 'pallet' => 'extra_light', 'min' => $i, 'max' => $i, 'price' => $prices[$i-1]];
            }
        }

        // full -> 1..5 pallets
        $full = [
            1=>[68.37,65.81,62.70,60.39,59.55],
            2=>[73.12,70.47,67.27,64.95,64.07],
            3=>[75.40,72.92,69.59,68.75,67.93],
            4=>[80.41,77.91,73.74,72.92,71.25],
            5=>[84.65,82.99,77.16,76.34,75.50],
            6=>[92.14,89.65,82.99,82.17,81.31],
            7=>[98.11,95.56,88.80,87.93,87.10],
            8=>[111.68,108.28,100.67,99.82,98.11],
            9=>[126.25,122.93,114.61,113.79,112.12],
            10=>[169.94,167.39,156.31,154.61,152.06],
            11=>[264.77,260.05,256.91,248.28,242.00],
            12=>[282.00,278.08,274.15,259.26,252.21],
        ];
        foreach ($full as $z => $prices) {
            for ($i = 1; $i <= 5; $i++) {
                $rates[] = ['zone' => $z, 'pallet' => 'full', 'min' => $i, 'max' => $i, 'price' => $prices[$i-1]];
            }
        }

        // Insert / update rates
        foreach ($rates as $r) {
            DB::table('rates')->updateOrInsert(
                [
                    'zone_id' => $zoneIds[$r['zone']],
                    'pallet_type_id' => $palletId($r['pallet']),
                    'min_pallets' => $r['min'],
                    'max_pallets' => $r['max'],
                ],
                [
                    'price_eur' => $r['price'],
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }
}
