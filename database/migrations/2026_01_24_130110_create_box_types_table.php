<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('box_types', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // laptop, mini_pc, tower_sff, tower
            $table->string('name');
            $table->unsignedSmallInteger('length_cm');
            $table->unsignedSmallInteger('width_cm');
            $table->unsignedSmallInteger('height_cm');
            $table->decimal('weight_kg', 6, 2); // peso de fallback (equipo + caja, sin líneas de modelos)
            $table->timestamps();
        });

        DB::table('box_types')->insert([
            ['code' => 'laptop',    'name' => 'Portátil',        'length_cm' => 40, 'width_cm' => 30, 'height_cm' => 12, 'weight_kg' => 4.50,  'created_at' => now(), 'updated_at' => now()],
            ['code' => 'mini_pc',   'name' => 'Mini PC (Tiny)',   'length_cm' => 35, 'width_cm' => 25, 'height_cm' => 15, 'weight_kg' => 3.20,  'created_at' => now(), 'updated_at' => now()],
            ['code' => 'tower_sff', 'name' => 'Torre SFF/Slim',   'length_cm' => 45, 'width_cm' => 28, 'height_cm' => 38, 'weight_kg' => 8.00,  'created_at' => now(), 'updated_at' => now()],
            ['code' => 'tower',     'name' => 'Torre (MT/Tower)', 'length_cm' => 60, 'width_cm' => 35, 'height_cm' => 50, 'weight_kg' => 10.00, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('box_types');
    }
};