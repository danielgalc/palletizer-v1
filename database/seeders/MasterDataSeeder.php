<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MasterDataSeeder extends Seeder
{
    public function run(): void
    {
        // ─────────────────────────────────────────────────────────────────────
        // BOX TYPES
        // tower_sff = Small Form Factor (SFF/Slim): Dell SFF, HP SFF, Lenovo S
        // tower     = Mid-Tower / Tower clásico vertical grande
        // ─────────────────────────────────────────────────────────────────────
        DB::table('box_types')->upsert([
            ['code' => 'laptop',    'name' => 'Portátil',         'length_cm' => 40, 'width_cm' => 30, 'height_cm' => 12, 'weight_kg' => 4.50, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'mini_pc',   'name' => 'Mini PC (Tiny)',    'length_cm' => 35, 'width_cm' => 25, 'height_cm' => 15, 'weight_kg' => 3.20, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'tower_sff', 'name' => 'Torre SFF/Slim',    'length_cm' => 45, 'width_cm' => 28, 'height_cm' => 38, 'weight_kg' => 8.00, 'created_at' => now(), 'updated_at' => now()],
            ['code' => 'tower',     'name' => 'Torre (MT/Tower)',  'length_cm' => 60, 'width_cm' => 35, 'height_cm' => 50, 'weight_kg' => 10.00, 'created_at' => now(), 'updated_at' => now()],
        ], ['code'], ['name', 'length_cm', 'width_cm', 'height_cm', 'weight_kg', 'updated_at']);

        $boxTypeId = fn(string $code) => DB::table('box_types')->where('code', $code)->value('id');

        // ─────────────────────────────────────────────────────────────────────
        // DEVICE MODELS
        // Catálogo de equipos del mercado refurbished / corporativo real
        // weight_kg = peso del equipo (sin embalaje)
        // ─────────────────────────────────────────────────────────────────────
        $models = [
            // ── PORTÁTILES (laptop) ──────────────────────────────────────────
            // Lenovo ThinkPad T-series
            ['brand' => 'Lenovo', 'name' => 'ThinkPad T14 Gen 1',     'sku' => 'LEN-T14G1',   'box' => 'laptop', 'kg' => 1.55],
            ['brand' => 'Lenovo', 'name' => 'ThinkPad T14 Gen 2',     'sku' => 'LEN-T14G2',   'box' => 'laptop', 'kg' => 1.57],
            ['brand' => 'Lenovo', 'name' => 'ThinkPad T14 Gen 3',     'sku' => 'LEN-T14G3',   'box' => 'laptop', 'kg' => 1.54],
            ['brand' => 'Lenovo', 'name' => 'ThinkPad T14s Gen 1',    'sku' => 'LEN-T14SG1',  'box' => 'laptop', 'kg' => 1.40],
            ['brand' => 'Lenovo', 'name' => 'ThinkPad T14s Gen 2',    'sku' => 'LEN-T14SG2',  'box' => 'laptop', 'kg' => 1.41],
            ['brand' => 'Lenovo', 'name' => 'ThinkPad T490',          'sku' => 'LEN-T490',    'box' => 'laptop', 'kg' => 1.68],
            ['brand' => 'Lenovo', 'name' => 'ThinkPad T480',          'sku' => 'LEN-T480',    'box' => 'laptop', 'kg' => 1.58],
            ['brand' => 'Lenovo', 'name' => 'ThinkPad T470',          'sku' => 'LEN-T470',    'box' => 'laptop', 'kg' => 1.68],
            ['brand' => 'Lenovo', 'name' => 'ThinkPad L14 Gen 1',     'sku' => 'LEN-L14G1',   'box' => 'laptop', 'kg' => 1.68],
            ['brand' => 'Lenovo', 'name' => 'ThinkPad L14 Gen 2',     'sku' => 'LEN-L14G2',   'box' => 'laptop', 'kg' => 1.68],
            ['brand' => 'Lenovo', 'name' => 'ThinkPad X1 Carbon G9',  'sku' => 'LEN-X1CG9',   'box' => 'laptop', 'kg' => 1.12],
            ['brand' => 'Lenovo', 'name' => 'ThinkPad X1 Carbon G10', 'sku' => 'LEN-X1CG10',  'box' => 'laptop', 'kg' => 1.12],
            ['brand' => 'Lenovo', 'name' => 'ThinkPad E14 Gen 2',     'sku' => 'LEN-E14G2',   'box' => 'laptop', 'kg' => 1.75],
            ['brand' => 'Lenovo', 'name' => 'ThinkPad E14 Gen 3',     'sku' => 'LEN-E14G3',   'box' => 'laptop', 'kg' => 1.77],
            // Dell Latitude
            ['brand' => 'Dell', 'name' => 'Latitude 5400',            'sku' => 'DEL-LAT5400', 'box' => 'laptop', 'kg' => 1.79],
            ['brand' => 'Dell', 'name' => 'Latitude 5410',            'sku' => 'DEL-LAT5410', 'box' => 'laptop', 'kg' => 1.74],
            ['brand' => 'Dell', 'name' => 'Latitude 5420',            'sku' => 'DEL-LAT5420', 'box' => 'laptop', 'kg' => 1.55],
            ['brand' => 'Dell', 'name' => 'Latitude 5430',            'sku' => 'DEL-LAT5430', 'box' => 'laptop', 'kg' => 1.52],
            ['brand' => 'Dell', 'name' => 'Latitude 5440',            'sku' => 'DEL-LAT5440', 'box' => 'laptop', 'kg' => 1.54],
            ['brand' => 'Dell', 'name' => 'Latitude 5490',            'sku' => 'DEL-LAT5490', 'box' => 'laptop', 'kg' => 1.96],
            ['brand' => 'Dell', 'name' => 'Latitude 5510',            'sku' => 'DEL-LAT5510', 'box' => 'laptop', 'kg' => 1.91],
            ['brand' => 'Dell', 'name' => 'Latitude 7420',            'sku' => 'DEL-LAT7420', 'box' => 'laptop', 'kg' => 1.25],
            ['brand' => 'Dell', 'name' => 'Latitude 7430',            'sku' => 'DEL-LAT7430', 'box' => 'laptop', 'kg' => 1.19],
            ['brand' => 'Dell', 'name' => 'Latitude 3420',            'sku' => 'DEL-LAT3420', 'box' => 'laptop', 'kg' => 1.71],
            // HP EliteBook / ProBook
            ['brand' => 'HP', 'name' => 'EliteBook 840 G6',           'sku' => 'HP-EB840G6',  'box' => 'laptop', 'kg' => 1.48],
            ['brand' => 'HP', 'name' => 'EliteBook 840 G7',           'sku' => 'HP-EB840G7',  'box' => 'laptop', 'kg' => 1.46],
            ['brand' => 'HP', 'name' => 'EliteBook 840 G8',           'sku' => 'HP-EB840G8',  'box' => 'laptop', 'kg' => 1.44],
            ['brand' => 'HP', 'name' => 'EliteBook 840 G9',           'sku' => 'HP-EB840G9',  'box' => 'laptop', 'kg' => 1.36],
            ['brand' => 'HP', 'name' => 'EliteBook 850 G7',           'sku' => 'HP-EB850G7',  'box' => 'laptop', 'kg' => 1.78],
            ['brand' => 'HP', 'name' => 'EliteBook 850 G8',           'sku' => 'HP-EB850G8',  'box' => 'laptop', 'kg' => 1.73],
            ['brand' => 'HP', 'name' => 'ProBook 450 G7',             'sku' => 'HP-PB450G7',  'box' => 'laptop', 'kg' => 1.89],
            ['brand' => 'HP', 'name' => 'ProBook 450 G8',             'sku' => 'HP-PB450G8',  'box' => 'laptop', 'kg' => 1.74],
            ['brand' => 'HP', 'name' => 'ProBook 450 G9',             'sku' => 'HP-PB450G9',  'box' => 'laptop', 'kg' => 1.73],
            ['brand' => 'HP', 'name' => 'EliteBook 630 G9',           'sku' => 'HP-EB630G9',  'box' => 'laptop', 'kg' => 1.38],

            // ── MINI PC (Tiny / NUC) ─────────────────────────────────────────
            ['brand' => 'HP',     'name' => 'EliteDesk 800 G4 Mini',  'sku' => 'HP-ED800G4M',  'box' => 'mini_pc', 'kg' => 3.00],
            ['brand' => 'HP',     'name' => 'EliteDesk 800 G5 Mini',  'sku' => 'HP-ED800G5M',  'box' => 'mini_pc', 'kg' => 3.20],
            ['brand' => 'HP',     'name' => 'EliteDesk 800 G6 Mini',  'sku' => 'HP-ED800G6M',  'box' => 'mini_pc', 'kg' => 3.10],
            ['brand' => 'HP',     'name' => 'ProDesk 400 G6 Mini',    'sku' => 'HP-PD400G6M',  'box' => 'mini_pc', 'kg' => 2.90],
            ['brand' => 'HP',     'name' => 'ProDesk 400 G7 Mini',    'sku' => 'HP-PD400G7M',  'box' => 'mini_pc', 'kg' => 2.85],
            ['brand' => 'Dell',   'name' => 'OptiPlex 3080 Micro',    'sku' => 'DEL-OP3080MF', 'box' => 'mini_pc', 'kg' => 2.80],
            ['brand' => 'Dell',   'name' => 'OptiPlex 5080 Micro',    'sku' => 'DEL-OP5080MF', 'box' => 'mini_pc', 'kg' => 3.00],
            ['brand' => 'Dell',   'name' => 'OptiPlex 7080 Micro',    'sku' => 'DEL-OP7080MF', 'box' => 'mini_pc', 'kg' => 3.15],
            ['brand' => 'Dell',   'name' => 'OptiPlex 3090 Micro',    'sku' => 'DEL-OP3090MF', 'box' => 'mini_pc', 'kg' => 2.78],
            ['brand' => 'Dell',   'name' => 'OptiPlex 7090 Micro',    'sku' => 'DEL-OP7090MF', 'box' => 'mini_pc', 'kg' => 3.12],
            ['brand' => 'Lenovo', 'name' => 'ThinkCentre M720q Tiny', 'sku' => 'LEN-M720Q',    'box' => 'mini_pc', 'kg' => 1.38],
            ['brand' => 'Lenovo', 'name' => 'ThinkCentre M920q Tiny', 'sku' => 'LEN-M920Q',    'box' => 'mini_pc', 'kg' => 1.43],
            ['brand' => 'Lenovo', 'name' => 'ThinkCentre M70q Gen 2', 'sku' => 'LEN-M70QG2',   'box' => 'mini_pc', 'kg' => 1.35],
            ['brand' => 'Lenovo', 'name' => 'ThinkCentre M90q Gen 2', 'sku' => 'LEN-M90QG2',   'box' => 'mini_pc', 'kg' => 1.41],
            ['brand' => 'Lenovo', 'name' => 'ThinkCentre M90q Gen 3', 'sku' => 'LEN-M90QG3',   'box' => 'mini_pc', 'kg' => 1.40],

            // ── TORRE SFF / Small Form Factor ────────────────────────────────
            // Equipos compactos: caben en caja tower_sff (más pequeña que tower)
            ['brand' => 'Dell',   'name' => 'OptiPlex 3060 SFF',      'sku' => 'DEL-OP3060SF', 'box' => 'tower_sff', 'kg' => 6.80],
            ['brand' => 'Dell',   'name' => 'OptiPlex 3070 SFF',      'sku' => 'DEL-OP3070SF', 'box' => 'tower_sff', 'kg' => 6.80],
            ['brand' => 'Dell',   'name' => 'OptiPlex 3080 SFF',      'sku' => 'DEL-OP3080SF', 'box' => 'tower_sff', 'kg' => 7.00],
            ['brand' => 'Dell',   'name' => 'OptiPlex 5060 SFF',      'sku' => 'DEL-OP5060SF', 'box' => 'tower_sff', 'kg' => 7.10],
            ['brand' => 'Dell',   'name' => 'OptiPlex 5070 SFF',      'sku' => 'DEL-OP5070SF', 'box' => 'tower_sff', 'kg' => 7.10],
            ['brand' => 'Dell',   'name' => 'OptiPlex 5080 SFF',      'sku' => 'DEL-OP5080SF', 'box' => 'tower_sff', 'kg' => 7.20],
            ['brand' => 'Dell',   'name' => 'OptiPlex 7060 SFF',      'sku' => 'DEL-OP7060SF', 'box' => 'tower_sff', 'kg' => 7.50],
            ['brand' => 'Dell',   'name' => 'OptiPlex 7070 SFF',      'sku' => 'DEL-OP7070SF', 'box' => 'tower_sff', 'kg' => 7.50],
            ['brand' => 'Dell',   'name' => 'OptiPlex 7080 SFF',      'sku' => 'DEL-OP7080SF', 'box' => 'tower_sff', 'kg' => 7.60],
            ['brand' => 'HP',     'name' => 'EliteDesk 800 G4 SFF',   'sku' => 'HP-ED800G4SF', 'box' => 'tower_sff', 'kg' => 7.30],
            ['brand' => 'HP',     'name' => 'EliteDesk 800 G5 SFF',   'sku' => 'HP-ED800G5SF', 'box' => 'tower_sff', 'kg' => 7.40],
            ['brand' => 'HP',     'name' => 'EliteDesk 800 G6 SFF',   'sku' => 'HP-ED800G6SF', 'box' => 'tower_sff', 'kg' => 7.20],
            ['brand' => 'HP',     'name' => 'ProDesk 600 G4 SFF',     'sku' => 'HP-PD600G4SF', 'box' => 'tower_sff', 'kg' => 7.00],
            ['brand' => 'HP',     'name' => 'ProDesk 600 G5 SFF',     'sku' => 'HP-PD600G5SF', 'box' => 'tower_sff', 'kg' => 7.10],
            ['brand' => 'Lenovo', 'name' => 'ThinkCentre M720s SFF',  'sku' => 'LEN-M720S',    'box' => 'tower_sff', 'kg' => 7.50],
            ['brand' => 'Lenovo', 'name' => 'ThinkCentre M920s SFF',  'sku' => 'LEN-M920S',    'box' => 'tower_sff', 'kg' => 7.80],
            ['brand' => 'Lenovo', 'name' => 'ThinkCentre M70s Gen 2', 'sku' => 'LEN-M70SG2',   'box' => 'tower_sff', 'kg' => 7.30],
            ['brand' => 'Lenovo', 'name' => 'ThinkCentre M90s Gen 2', 'sku' => 'LEN-M90SG2',   'box' => 'tower_sff', 'kg' => 7.60],

            // ── TORRE MT / Mid-Tower (tower) ─────────────────────────────────
            ['brand' => 'Dell',   'name' => 'OptiPlex 3080 Tower',    'sku' => 'DEL-OP3080T',  'box' => 'tower', 'kg' =>  9.40],
            ['brand' => 'Dell',   'name' => 'OptiPlex 5080 Tower',    'sku' => 'DEL-OP5080T',  'box' => 'tower', 'kg' =>  9.70],
            ['brand' => 'Dell',   'name' => 'OptiPlex 7070 Tower',    'sku' => 'DEL-OP7070T',  'box' => 'tower', 'kg' =>  9.90],
            ['brand' => 'Dell',   'name' => 'OptiPlex 7080 Tower',    'sku' => 'DEL-OP7080T',  'box' => 'tower', 'kg' => 10.13],
            ['brand' => 'HP',     'name' => 'EliteDesk 800 G6 Tower', 'sku' => 'HP-ED800G6T',  'box' => 'tower', 'kg' => 10.20],
            ['brand' => 'HP',     'name' => 'ProDesk 600 G6 Tower',   'sku' => 'HP-PD600G6T',  'box' => 'tower', 'kg' => 10.00],
            ['brand' => 'Lenovo', 'name' => 'ThinkCentre M720t Tower','sku' => 'LEN-M720T',    'box' => 'tower', 'kg' => 10.20],
            ['brand' => 'Lenovo', 'name' => 'ThinkCentre M920t Tower','sku' => 'LEN-M920T',    'box' => 'tower', 'kg' => 10.50],
        ];

        $records = array_map(fn($m) => [
            'brand'       => $m['brand'],
            'name'        => $m['name'],
            'sku'         => $m['sku'],
            'box_type_id' => $boxTypeId($m['box']),
            'weight_kg'   => $m['kg'],
            'is_active'   => 1,
            'created_at'  => now(),
            'updated_at'  => now(),
        ], $models);

        DB::table('device_models')->upsert(
            $records,
            ['sku'],
            ['brand', 'name', 'box_type_id', 'weight_kg', 'is_active', 'updated_at']
        );

        // ─────────────────────────────────────────────────────────────────────
        // BOX PROVIDERS
        // reused_source = origen de cajas reutilizadas (proveedores IT refurbished)
        // new_supplier  = fabricantes / distribuidores de cajas de cartón nuevas
        // ─────────────────────────────────────────────────────────────────────
        DB::table('box_providers')->upsert([
            // Reutilizadas
            ['name' => 'Electronic Bazaar', 'provider_type' => 'reused_source', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Ledmax',            'provider_type' => 'reused_source', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'RePC Europe',       'provider_type' => 'reused_source', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'GreenIT',           'provider_type' => 'reused_source', 'created_at' => now(), 'updated_at' => now()],
            // Nuevas
            ['name' => 'ByteBox Solutions', 'provider_type' => 'new_supplier',  'created_at' => now(), 'updated_at' => now()],
            ['name' => 'PrimePack',         'provider_type' => 'new_supplier',  'created_at' => now(), 'updated_at' => now()],
            ['name' => 'PackExpress',       'provider_type' => 'new_supplier',  'created_at' => now(), 'updated_at' => now()],
            ['name' => 'EcoBox Iberia',     'provider_type' => 'new_supplier',  'created_at' => now(), 'updated_at' => now()],
        ], ['name'], ['provider_type', 'updated_at']);

        $providerId = fn(string $name) => DB::table('box_providers')->where('name', $name)->value('id');

        // ─────────────────────────────────────────────────────────────────────
        // BOX VARIANTS
        // Dimensiones reales de cajas usadas en el mercado refurbished IT:
        //   laptop    : caja plana ~42×32×12 cm
        //   mini_pc   : caja cúbica pequeña ~36×26×14 cm
        //   tower_sff : caja SFF ~47×29×37 cm (OptiPlex SFF, EliteDesk SFF…)
        //   tower     : caja tower completa ~60×35×50 cm
        //
        // unit_cost_eur = 0 para reutilizadas (la empresa ya las tiene)
        // ─────────────────────────────────────────────────────────────────────
        $variants = [
            // ── REUTILIZADAS ─────────────────────────────────────────────────
            // Electronic Bazaar
            ['kind'=>'laptop',    'cond'=>'reused', 'prov'=>'Electronic Bazaar', 'l'=>42,'w'=>32,'h'=>12, 'cost'=>0.00],
            ['kind'=>'mini_pc',   'cond'=>'reused', 'prov'=>'Electronic Bazaar', 'l'=>36,'w'=>26,'h'=>14, 'cost'=>0.00],
            ['kind'=>'tower_sff', 'cond'=>'reused', 'prov'=>'Electronic Bazaar', 'l'=>48,'w'=>30,'h'=>38, 'cost'=>0.00],
            ['kind'=>'tower',     'cond'=>'reused', 'prov'=>'Electronic Bazaar', 'l'=>60,'w'=>35,'h'=>48, 'cost'=>0.00],
            // Ledmax
            ['kind'=>'laptop',    'cond'=>'reused', 'prov'=>'Ledmax', 'l'=>41,'w'=>31,'h'=>11, 'cost'=>0.00],
            ['kind'=>'mini_pc',   'cond'=>'reused', 'prov'=>'Ledmax', 'l'=>35,'w'=>25,'h'=>13, 'cost'=>0.00],
            ['kind'=>'tower_sff', 'cond'=>'reused', 'prov'=>'Ledmax', 'l'=>47,'w'=>29,'h'=>37, 'cost'=>0.00],
            ['kind'=>'tower',     'cond'=>'reused', 'prov'=>'Ledmax', 'l'=>58,'w'=>34,'h'=>47, 'cost'=>0.00],
            // RePC Europe
            ['kind'=>'laptop',    'cond'=>'reused', 'prov'=>'RePC Europe', 'l'=>40,'w'=>30,'h'=>11, 'cost'=>0.00],
            ['kind'=>'mini_pc',   'cond'=>'reused', 'prov'=>'RePC Europe', 'l'=>34,'w'=>24,'h'=>13, 'cost'=>0.00],
            ['kind'=>'tower_sff', 'cond'=>'reused', 'prov'=>'RePC Europe', 'l'=>46,'w'=>28,'h'=>36, 'cost'=>0.00],
            ['kind'=>'tower',     'cond'=>'reused', 'prov'=>'RePC Europe', 'l'=>57,'w'=>33,'h'=>46, 'cost'=>0.00],
            // GreenIT
            ['kind'=>'laptop',    'cond'=>'reused', 'prov'=>'GreenIT', 'l'=>43,'w'=>33,'h'=>12, 'cost'=>0.00],
            ['kind'=>'mini_pc',   'cond'=>'reused', 'prov'=>'GreenIT', 'l'=>37,'w'=>27,'h'=>15, 'cost'=>0.00],
            ['kind'=>'tower_sff', 'cond'=>'reused', 'prov'=>'GreenIT', 'l'=>49,'w'=>31,'h'=>39, 'cost'=>0.00],
            ['kind'=>'tower',     'cond'=>'reused', 'prov'=>'GreenIT', 'l'=>61,'w'=>36,'h'=>49, 'cost'=>0.00],

            // ── NUEVAS ────────────────────────────────────────────────────────
            // ByteBox Solutions (calidad estándar)
            ['kind'=>'laptop',    'cond'=>'new', 'prov'=>'ByteBox Solutions', 'l'=>41,'w'=>31,'h'=>11, 'cost'=>1.25],
            ['kind'=>'mini_pc',   'cond'=>'new', 'prov'=>'ByteBox Solutions', 'l'=>35,'w'=>25,'h'=>13, 'cost'=>0.95],
            ['kind'=>'tower_sff', 'cond'=>'new', 'prov'=>'ByteBox Solutions', 'l'=>47,'w'=>29,'h'=>37, 'cost'=>1.90],
            ['kind'=>'tower',     'cond'=>'new', 'prov'=>'ByteBox Solutions', 'l'=>59,'w'=>34,'h'=>47, 'cost'=>2.70],
            // PrimePack (cartón reforzado, algo más caro)
            ['kind'=>'laptop',    'cond'=>'new', 'prov'=>'PrimePack', 'l'=>43,'w'=>33,'h'=>12, 'cost'=>1.10],
            ['kind'=>'mini_pc',   'cond'=>'new', 'prov'=>'PrimePack', 'l'=>36,'w'=>26,'h'=>14, 'cost'=>0.88],
            ['kind'=>'tower_sff', 'cond'=>'new', 'prov'=>'PrimePack', 'l'=>48,'w'=>30,'h'=>38, 'cost'=>1.75],
            ['kind'=>'tower',     'cond'=>'new', 'prov'=>'PrimePack', 'l'=>61,'w'=>35,'h'=>49, 'cost'=>2.40],
            // PackExpress (económico, pedidos grandes)
            ['kind'=>'laptop',    'cond'=>'new', 'prov'=>'PackExpress', 'l'=>40,'w'=>30,'h'=>11, 'cost'=>0.85],
            ['kind'=>'mini_pc',   'cond'=>'new', 'prov'=>'PackExpress', 'l'=>34,'w'=>24,'h'=>13, 'cost'=>0.72],
            ['kind'=>'tower_sff', 'cond'=>'new', 'prov'=>'PackExpress', 'l'=>46,'w'=>28,'h'=>36, 'cost'=>1.45],
            ['kind'=>'tower',     'cond'=>'new', 'prov'=>'PackExpress', 'l'=>58,'w'=>33,'h'=>46, 'cost'=>2.10],
            // EcoBox Iberia (cartón reciclado certificado FSC)
            ['kind'=>'laptop',    'cond'=>'new', 'prov'=>'EcoBox Iberia', 'l'=>42,'w'=>32,'h'=>12, 'cost'=>1.05],
            ['kind'=>'mini_pc',   'cond'=>'new', 'prov'=>'EcoBox Iberia', 'l'=>36,'w'=>26,'h'=>14, 'cost'=>0.82],
            ['kind'=>'tower_sff', 'cond'=>'new', 'prov'=>'EcoBox Iberia', 'l'=>47,'w'=>29,'h'=>38, 'cost'=>1.60],
            ['kind'=>'tower',     'cond'=>'new', 'prov'=>'EcoBox Iberia', 'l'=>60,'w'=>34,'h'=>48, 'cost'=>2.25],
        ];

        foreach ($variants as $v) {
            $pid = $providerId($v['prov']);
            if (!$pid) continue;

            $defaultStock = ($v['cond'] === 'reused') ? 9999 : 0;

            DB::table('box_variants')->upsert([
                [
                    'kind'          => $v['kind'],
                    'condition'     => $v['cond'],
                    'provider_id'   => $pid,
                    'length_cm'     => $v['l'],
                    'width_cm'      => $v['w'],
                    'height_cm'     => $v['h'],
                    'unit_cost_eur' => $v['cost'],
                    'on_hand_qty'   => $defaultStock,
                    'is_active'     => true,
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ],
            ], ['kind', 'condition', 'provider_id'], ['length_cm', 'width_cm', 'height_cm', 'unit_cost_eur', 'on_hand_qty', 'is_active', 'updated_at']);
        }

        // ─────────────────────────────────────────────────────────────────────
        // PALLET TYPES
        // ─────────────────────────────────────────────────────────────────────
        DB::table('pallet_types')->upsert([
            ['code'=>'mini_quarter','name'=>'120×80 (110cm, 300kg)',  'base_length_cm'=>120,'base_width_cm'=>80, 'max_height_cm'=>110,'max_weight_kg'=>300,  'created_at'=>now(),'updated_at'=>now()],
            ['code'=>'quarter',     'name'=>'120×80 (110cm, 300kg)',  'base_length_cm'=>120,'base_width_cm'=>80, 'max_height_cm'=>110,'max_weight_kg'=>300,  'created_at'=>now(),'updated_at'=>now()],
            ['code'=>'half',        'name'=>'120×100 (160cm, 600kg)', 'base_length_cm'=>120,'base_width_cm'=>100,'max_height_cm'=>160,'max_weight_kg'=>600,  'created_at'=>now(),'updated_at'=>now()],
            ['code'=>'extra_light', 'name'=>'120×100 (220cm, 450kg)', 'base_length_cm'=>120,'base_width_cm'=>100,'max_height_cm'=>220,'max_weight_kg'=>450,  'created_at'=>now(),'updated_at'=>now()],
            ['code'=>'light',       'name'=>'120×100 (220cm, 750kg)', 'base_length_cm'=>120,'base_width_cm'=>100,'max_height_cm'=>220,'max_weight_kg'=>750,  'created_at'=>now(),'updated_at'=>now()],
            ['code'=>'full',        'name'=>'120×100 (220cm, 1200kg)','base_length_cm'=>120,'base_width_cm'=>100,'max_height_cm'=>220,'max_weight_kg'=>1200, 'created_at'=>now(),'updated_at'=>now()],
        ], ['code'], ['name','base_length_cm','base_width_cm','max_height_cm','max_weight_kg','updated_at']);

        $palletId = fn(string $code) => DB::table('pallet_types')->where('code', $code)->value('id');

        // ─────────────────────────────────────────────────────────────────────
        // COUNTRIES / ZONES / PROVINCES
        // ─────────────────────────────────────────────────────────────────────
        DB::table('countries')->upsert([
            ['code'=>'ES','name'=>'España',   'created_at'=>now(),'updated_at'=>now()],
            ['code'=>'PT','name'=>'Portugal', 'created_at'=>now(),'updated_at'=>now()],
            ['code'=>'IT','name'=>'Italia',   'created_at'=>now(),'updated_at'=>now()],
            ['code'=>'RO','name'=>'Rumanía',  'created_at'=>now(),'updated_at'=>now()],
            ['code'=>'PL','name'=>'Polonia',  'created_at'=>now(),'updated_at'=>now()],
        ], ['code'], ['name','updated_at']);

        $countryId = fn(string $code) => DB::table('countries')->where('code', $code)->value('id');

        // ─────────────────────────────────────────────────────────────────────
        // CARRIERS
        // ─────────────────────────────────────────────────────────────────────
        DB::table('carriers')->upsert([
            ['code'=>'palletways',    'name'=>'Palletways',        'is_active'=>1,'created_at'=>now(),'updated_at'=>now()],
            ['code'=>'euro_fast',     'name'=>'EuroFast Logistics','is_active'=>1,'created_at'=>now(),'updated_at'=>now()],
            ['code'=>'budget_freight','name'=>'Budget Freight',    'is_active'=>1,'created_at'=>now(),'updated_at'=>now()],
        ], ['code'], ['name','is_active','updated_at']);

        $carrierId = fn(string $code) => DB::table('carriers')->where('code', $code)->value('id');

        // ─────────────────────────────────────────────────────────────────────
        // ZONES
        // ─────────────────────────────────────────────────────────────────────
        $zoneIds = [];
        $intlZoneIdsByName = [];

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

        $ptId = $countryId('PT');
        DB::table('zones')->updateOrInsert(
            ['country_id' => $ptId, 'name' => 'Zona 10'],
            ['updated_at' => now(), 'created_at' => now()]
        );
        $zoneIds[10] = DB::table('zones')->where('country_id', $ptId)->where('name', 'Zona 10')->value('id');

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
                    ->where('country_id', $cid)->where('name', $zoneName)->value('id');
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // PROVINCES (ES)
        // ─────────────────────────────────────────────────────────────────────
        $zoneProvinces = [
            1  => ['Cádiz','Córdoba','Granada','Jaen','Málaga','Sevilla'],
            2  => ['Almería','Campo Gibraltar','Huelva'],
            3  => ['Badajoz','Ciudad Real','Guadalajara','Madrid','Murcia'],
            4  => ['Albacete','Toledo'],
            5  => ['Burgos','La Rioja','Segovia','Valladolid','Zaragoza'],
            6  => ['Álava','Avila','Cuenca','Huesca','León','Navarra','Palencia','Salamanca','Soria','Teruel','Valencia','Zamora'],
            7  => ['Alicante','Asturias','Cantabria','Castellón','Guipuzcoa','Lérida','Tarragona','Vizcaya'],
            8  => ['Barcelona','Cáceres'],
            9  => ['Coruña','Gerona','Lugo','Orense','Pontevedra'],
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

        // ─────────────────────────────────────────────────────────────────────
        // RATES — PALLETWAYS
        // ─────────────────────────────────────────────────────────────────────
        $rates = [];

        $miniQuarter=[1=>38.91,2=>41.21,3=>42.84,4=>44.50,5=>46.27,6=>51.26,7=>53.38,8=>54.23,9=>55.40,10=>64.60,11=>91.11,12=>93.46];
        $quarter    =[1=>42.02,2=>44.43,3=>49.06,4=>50.72,5=>52.47,6=>57.48,7=>59.66,8=>62.21,9=>63.29,10=>77.69,11=>114.37,12=>118.30];
        $half       =[1=>55.11,2=>59.60,3=>64.04,4=>66.53,5=>69.95,6=>71.62,7=>74.78,8=>83.28,9=>92.40,10=>117.58,11=>169.71,12=>173.63];

        foreach ($miniQuarter as $z=>$p) $rates[]=['zone'=>$z,'pallet'=>'mini_quarter','min'=>1,'max'=>1,'price'=>$p];
        foreach ($quarter     as $z=>$p) $rates[]=['zone'=>$z,'pallet'=>'quarter',     'min'=>1,'max'=>1,'price'=>$p];
        foreach ($half        as $z=>$p) $rates[]=['zone'=>$z,'pallet'=>'half',        'min'=>1,'max'=>1,'price'=>$p];

        $light=[1=>[65.76,63.19,60.05,57.61,56.91],2=>[70.46,67.79,64.57,62.28,61.38],3=>[72.74,70.21,66.86,66.03,65.17],4=>[77.78,75.24,70.21,70.21,68.53],5=>[82.90,80.40,74.50,73.67,72.81],6=>[89.64,87.11,81.21,80.40,78.71],7=>[95.60,93.02,86.18,85.34,84.47],8=>[104.17,100.75,93.89,93.02,91.32],9=>[119.02,115.67,108.09,107.29,105.60],10=>[165.55,162.09,152.64,150.91,148.34],11=>[226.84,222.87,218.91,212.59,209.40],12=>[243.45,239.49,234.73,223.65,218.11]];
        foreach ($light as $z=>$prices) for ($i=1;$i<=5;$i++) $rates[]=['zone'=>$z,'pallet'=>'light','min'=>$i,'max'=>$i,'price'=>$prices[$i-1]];

        $extraLight=[1=>[64.96,62.44,59.30],2=>[69.59,66.95,63.75],3=>[72.09,69.59,67.93],4=>[74.59,72.92,71.25],5=>[78.00,76.34,74.67],6=>[82.17,81.31,80.51],7=>[86.25,85.40,84.54],8=>[93.86,93.01,92.19],9=>[104.63,103.80,102.96],10=>[140.97,140.12,139.25],11=>[194.17,193.39,192.59],12=>[202.00,201.22,200.44]];
        foreach ($extraLight as $z=>$prices) for ($i=1;$i<=3;$i++) $rates[]=['zone'=>$z,'pallet'=>'extra_light','min'=>$i,'max'=>$i,'price'=>$prices[$i-1]];

        $full=[1=>[68.37,65.81,62.70,60.39,59.55],2=>[73.12,70.47,67.27,64.95,64.07],3=>[75.40,72.92,69.59,68.75,67.93],4=>[80.41,77.91,73.74,72.92,71.25],5=>[84.65,82.99,77.16,76.34,75.50],6=>[92.14,89.65,82.99,82.17,81.31],7=>[98.11,95.56,88.80,87.93,87.10],8=>[111.68,108.28,100.67,99.82,98.11],9=>[126.25,122.93,114.61,113.79,112.12],10=>[169.94,167.39,156.31,154.61,152.06],11=>[264.77,260.05,256.91,248.28,242.00],12=>[282.00,278.08,274.15,259.26,252.21]];
        foreach ($full as $z=>$prices) for ($i=1;$i<=5;$i++) $rates[]=['zone'=>$z,'pallet'=>'full','min'=>$i,'max'=>$i,'price'=>$prices[$i-1]];

        $palletwaysId = $carrierId('palletways');
        foreach ($rates as $r) {
            DB::table('rates')->updateOrInsert(
                ['carrier_id'=>$palletwaysId,'zone_id'=>$zoneIds[$r['zone']],'pallet_type_id'=>$palletId($r['pallet']),'min_pallets'=>$r['min'],'max_pallets'=>$r['max']],
                ['price_eur'=>$r['price'],'carrier_rate_name'=>$this->getPalletwaysRateName($r['pallet']),'updated_at'=>now(),'created_at'=>now()]
            );
        }

        // ─────────────────────────────────────────────────────────────────────
        // RATES — EURO_FAST & BUDGET_FREIGHT
        // ─────────────────────────────────────────────────────────────────────
        $euroFastId = $carrierId('euro_fast');
        $budgetId   = $carrierId('budget_freight');

        $carrierOffer = [
            'euro_fast'      => ['quarter','half','extra_light','light','full'],
            'budget_freight' => ['half','light','full'],
        ];
        $carrierTramoAdj = [
            'euro_fast'      => [1=>1.08,2=>1.04,3=>1.01,4=>0.99,5=>0.98],
            'budget_freight' => [1=>0.97,2=>0.95,3=>0.94,4=>0.93,5=>0.92],
        ];
        $typeAdj = ['mini_quarter'=>1.02,'quarter'=>1.03,'half'=>1.04,'extra_light'=>1.00,'light'=>1.00,'full'=>1.06];

        foreach (['euro_fast'=>$euroFastId,'budget_freight'=>$budgetId] as $carrierCode=>$cid) {
            $offer = $carrierOffer[$carrierCode] ?? [];
            foreach ($rates as $r) {
                if (($r['zone']??0) < 1 || ($r['zone']??0) > 12) continue;
                if (!in_array($r['pallet'], $offer, true)) continue;
                $tramo = (int)($r['min']??1);
                $price = round(((float)$r['price']) * ($carrierTramoAdj[$carrierCode][$tramo]??1.00) * ($typeAdj[$r['pallet']]??1.00), 2);
                DB::table('rates')->updateOrInsert(
                    ['carrier_id'=>$cid,'zone_id'=>$zoneIds[$r['zone']],'pallet_type_id'=>$palletId($r['pallet']),'min_pallets'=>$r['min'],'max_pallets'=>$r['max']],
                    ['price_eur'=>$price,'updated_at'=>now(),'created_at'=>now()]
                );
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // RATES DEMO — IT / RO / PL
        // ─────────────────────────────────────────────────────────────────────
        $base=['IT'=>['euro_fast'=>120,'budget_freight'=>110],'RO'=>['euro_fast'=>150,'budget_freight'=>135],'PL'=>['euro_fast'=>160,'budget_freight'=>145]];
        $mult=['light'=>1.00,'full'=>1.18];
        $disc=[1=>1.00,2=>0.97,3=>0.95];

        foreach (['IT','RO','PL'] as $cc) {
            foreach (['euro_fast'=>$euroFastId,'budget_freight'=>$budgetId] as $carrierCode=>$cid) {
                foreach (($realZones[$cc]??[]) as $zoneName) {
                    $zoneId = $intlZoneIdsByName[$cc][$zoneName]??null;
                    if (!$zoneId) continue;
                    foreach (['light','full'] as $pCode) {
                        foreach ([1,2,3] as $n) {
                            DB::table('rates')->updateOrInsert(
                                ['carrier_id'=>$cid,'zone_id'=>$zoneId,'pallet_type_id'=>$palletId($pCode),'min_pallets'=>$n,'max_pallets'=>$n],
                                ['price_eur'=>round($base[$cc][$carrierCode]*$mult[$pCode]*$disc[$n],2),'updated_at'=>now(),'created_at'=>now()]
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