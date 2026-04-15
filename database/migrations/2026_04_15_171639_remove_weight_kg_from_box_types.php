<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('box_types', function (Blueprint $table) {
            $table->dropColumn('weight_kg');
        });
    }

    public function down(): void
    {
        Schema::table('box_types', function (Blueprint $table) {
            $table->decimal('weight_kg', 6, 2)->default(0)->after('height_cm');
        });
    }
};
