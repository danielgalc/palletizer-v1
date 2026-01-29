<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('zones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('country_id')->constrained('countries');
            $table->string('name'); // Zona 1.., etc.
            $table->timestamps();

            $table->unique(['country_id', 'name'], 'zones_country_name_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zones');
    }
};
