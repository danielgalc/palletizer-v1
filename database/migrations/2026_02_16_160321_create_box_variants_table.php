<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('box_variants', function (Blueprint $table) {
            $table->id();

            // kind lógico (3 tipos)
            $table->string('kind', 32);        // laptop|tower|mini_pc
            $table->string('condition', 16);   // reused|new

            $table->foreignId('provider_id')->constrained('box_providers')->cascadeOnDelete();

            $table->unsignedInteger('length_cm');
            $table->unsignedInteger('width_cm');
            $table->unsignedInteger('height_cm');

            // peso de la caja (si aplica). No es el peso del equipo.
            $table->decimal('weight_kg', 8, 3)->default(0);

            // coste unitario de la caja (EUR). reutilizadas normalmente 0.
            $table->decimal('unit_cost_eur', 10, 4)->default(0);

            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['kind', 'condition']);
            $table->index('provider_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('box_variants');
    }
};
