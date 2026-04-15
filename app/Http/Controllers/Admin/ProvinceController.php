<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ProvinceController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'    => ['required', 'string', 'max:100'],
            'zone_id' => ['required', 'integer', 'exists:zones,id'],
        ]);

        // La provincia puede ya existir (otro carrier la tiene en una zona distinta).
        // En ese caso reutilizamos el registro; solo creamos un nuevo province_zones.
        $province = DB::table('provinces')->where('name', $data['name'])->first();

        if ($province) {
            $provinceId = $province->id;

            // ¿Ya está asignada exactamente a esta zona?
            $alreadyInZone = DB::table('province_zones')
                ->where('province_id', $provinceId)
                ->where('zone_id', $data['zone_id'])
                ->exists();

            if ($alreadyInZone) {
                return back()->withErrors(['name' => 'Este destino ya está asignado a esa zona.']);
            }

            // ¿Ya está en otra zona del MISMO carrier? (una provincia = una zona por carrier)
            $zone        = DB::table('zones')->where('id', $data['zone_id'])->first();
            $carrierZoneIds = DB::table('zones')->where('carrier_id', $zone->carrier_id)->pluck('id');
            $conflict    = DB::table('province_zones')
                ->where('province_id', $provinceId)
                ->whereIn('zone_id', $carrierZoneIds)
                ->first();

            if ($conflict) {
                $conflictZone = DB::table('zones')->where('id', $conflict->zone_id)->first();
                return back()->withErrors(['name' => "Ya está asignada a {$conflictZone->name} de este transportista."]);
            }
        } else {
            $provinceId = DB::table('provinces')->insertGetId([
                'name'       => $data['name'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::table('province_zones')->insert([
            'province_id' => $provinceId,
            'zone_id'     => $data['zone_id'],
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        return back()->with('success', "Destino {$data['name']} asignado.");
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'name'         => ['required', 'string', 'max:100', "unique:provinces,name,{$id}"],
            'zone_id'      => ['required', 'integer', 'exists:zones,id'],
            'old_zone_id'  => ['required', 'integer', 'exists:zones,id'],
        ]);

        DB::table('provinces')->where('id', $id)->update([
            'name'       => $data['name'],
            'updated_at' => now(),
        ]);

        // Actualizar la asignación de zona para este carrier concreto
        DB::table('province_zones')
            ->where('province_id', $id)
            ->where('zone_id', $data['old_zone_id'])
            ->update([
                'zone_id'    => $data['zone_id'],
                'updated_at' => now(),
            ]);

        return back()->with('success', 'Destino actualizado.');
    }

    public function destroy(Request $request, int $id)
    {
        $zoneId = $request->input('zone_id');

        if ($zoneId) {
            // Eliminar solo la asignación concreta a esta zona
            DB::table('province_zones')
                ->where('province_id', $id)
                ->where('zone_id', $zoneId)
                ->delete();

            // Si la provincia ya no tiene ninguna zona asignada, eliminarla también
            $remaining = DB::table('province_zones')->where('province_id', $id)->count();
            if ($remaining === 0) {
                DB::table('provinces')->where('id', $id)->delete();
            }
        } else {
            // Sin contexto de zona: eliminar la provincia y todas sus asignaciones (CASCADE)
            DB::table('provinces')->where('id', $id)->delete();
        }

        return back()->with('success', 'Destino eliminado.');
    }
}
