<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Añadir carrier_id a zones (nullable primero para poder poblar)
        Schema::table('zones', function (Blueprint $table) {
            $table->foreignId('carrier_id')->nullable()->after('country_id')->constrained('carriers');
        });

        // 2. Poblar carrier_id desde rates (cada zona tiene tarifas de un transportista)
        DB::statement("
            UPDATE zones
            SET carrier_id = (
                SELECT carrier_id FROM rates WHERE zone_id = zones.id LIMIT 1
            )
        ");

        // 3. Si alguna zona quedó sin carrier (sin tarifas), asignar al primer carrier
        DB::statement("
            UPDATE zones
            SET carrier_id = (SELECT id FROM carriers ORDER BY id LIMIT 1)
            WHERE carrier_id IS NULL
        ");

        // 4. Hacer carrier_id NOT NULL
        DB::statement("ALTER TABLE zones ALTER COLUMN carrier_id SET NOT NULL");

        // 5. Actualizar constraint único: (country_id, name) → (carrier_id, country_id, name)
        DB::statement("ALTER TABLE zones DROP CONSTRAINT IF EXISTS zones_country_name_unique");
        DB::statement("ALTER TABLE zones ADD CONSTRAINT zones_carrier_country_name_unique UNIQUE (carrier_id, country_id, name)");

        // 6. Crear tabla pivot province_zones
        Schema::create('province_zones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('province_id')->constrained('provinces')->onDelete('cascade');
            $table->foreignId('zone_id')->constrained('zones')->onDelete('cascade');
            $table->timestamps();
            $table->unique(['province_id', 'zone_id'], 'province_zones_unique');
        });

        // 7. Migrar datos existentes de provinces.zone_id → province_zones
        DB::statement("
            INSERT INTO province_zones (province_id, zone_id, created_at, updated_at)
            SELECT id, zone_id, NOW(), NOW()
            FROM provinces
            WHERE zone_id IS NOT NULL
        ");

        // 8. Eliminar zone_id de provinces
        Schema::table('provinces', function (Blueprint $table) {
            $table->dropForeign(['zone_id']);
            $table->dropColumn('zone_id');
        });
    }

    public function down(): void
    {
        // Restaurar zone_id en provinces
        Schema::table('provinces', function (Blueprint $table) {
            $table->foreignId('zone_id')->nullable()->constrained('zones');
        });

        DB::statement("
            UPDATE provinces p
            SET zone_id = (
                SELECT zone_id FROM province_zones WHERE province_id = p.id LIMIT 1
            )
        ");

        Schema::dropIfExists('province_zones');

        DB::statement("ALTER TABLE zones DROP CONSTRAINT IF EXISTS zones_carrier_country_name_unique");
        DB::statement("ALTER TABLE zones ADD CONSTRAINT zones_country_name_unique UNIQUE (country_id, name)");

        Schema::table('zones', function (Blueprint $table) {
            $table->dropForeign(['carrier_id']);
            $table->dropColumn('carrier_id');
        });
    }
};
