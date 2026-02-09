<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('device_models', function (Blueprint $table) {
            $table->id();

            $table->string('brand')->nullable();
            $table->string('name');
            $table->string('sku')->nullable()->unique();

            $table->foreignId('box_type_id')
                ->constrained('box_types')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            $table->decimal('weight_kg', 6, 2)->nullable();

            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->index(['is_active']);
            $table->index(['box_type_id']);
            $table->index(['brand', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('device_models');
    }
};
