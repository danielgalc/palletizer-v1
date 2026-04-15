<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('box_types', function (Blueprint $table) {
            $table->decimal('carton_weight_kg', 5, 2)->default(0)->after('weight_kg');
        });

        // Pesos realistas del cartón por categoría
        DB::table('box_types')->where('code', 'laptop')   ->update(['carton_weight_kg' => 0.60]);
        DB::table('box_types')->where('code', 'mini_pc')  ->update(['carton_weight_kg' => 0.35]);
        DB::table('box_types')->where('code', 'tower_sff')->update(['carton_weight_kg' => 1.20]);
        DB::table('box_types')->where('code', 'tower')    ->update(['carton_weight_kg' => 1.80]);
    }

    public function down(): void
    {
        Schema::table('box_types', function (Blueprint $table) {
            $table->dropColumn('carton_weight_kg');
        });
    }
};
