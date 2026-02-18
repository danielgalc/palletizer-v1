<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('box_variants', function (Blueprint $table) {
            $table->id();

            $table->string('kind', 32);       // laptop|tower|tower_sff|mini_pc
            $table->string('condition', 16);  // reused|new

            $table->foreignId('provider_id')->constrained('box_providers')->cascadeOnDelete();

            $table->unsignedInteger('length_cm');
            $table->unsignedInteger('width_cm');
            $table->unsignedInteger('height_cm');

            $table->decimal('unit_cost_eur', 10, 4)->default(0);

            // Stock consolidado aquí directamente (relación 1:1 con stock no justifica tabla aparte)
            // Reutilizadas: valor alto (ej. 9999). Nuevas: 0 hasta hacer pedido al proveedor.
            $table->unsignedInteger('on_hand_qty')->default(0);

            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['kind', 'condition']);
            $table->index('provider_id');
            $table->unique(['kind', 'condition', 'provider_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('box_variants');
    }
};