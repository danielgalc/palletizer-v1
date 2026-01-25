<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pallet_types', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // quarter, half, extra_light, light, full
            $table->string('name');
            $table->unsignedSmallInteger('base_length_cm'); // 120
            $table->unsignedSmallInteger('base_width_cm');  // 80 o 100
            $table->unsignedSmallInteger('max_height_cm');  // 110/160/220...
            $table->unsignedSmallInteger('max_weight_kg');  // 300/600/1200...
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pallet_types');
    }
};
