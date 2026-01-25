<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('zone_id')->constrained('zones');
            $table->foreignId('pallet_type_id')->constrained('pallet_types');
            $table->unsignedSmallInteger('min_pallets');
            $table->unsignedSmallInteger('max_pallets');
            $table->decimal('price_eur', 10, 2); // precio por pallet en ese tramo
            $table->timestamps();

            $table->unique(['zone_id', 'pallet_type_id', 'min_pallets', 'max_pallets'], 'rates_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rates');
    }
};

