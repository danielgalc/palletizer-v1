<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('box_variant_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('box_variant_id')->constrained('box_variants')->cascadeOnDelete();
            $table->unsignedInteger('on_hand_qty')->default(0);
            $table->timestamps();

            $table->unique('box_variant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('box_variant_stocks');
    }
};
