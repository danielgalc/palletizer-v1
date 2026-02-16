<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('box_providers', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            // reused_source = proveedor de equipos (cajas reutilizables)
            // new_supplier  = proveedor de cajas nuevas
            $table->string('provider_type', 32);
            $table->timestamps();

            $table->index('provider_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('box_providers');
    }
};
