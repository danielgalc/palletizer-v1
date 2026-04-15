<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CountryController extends Controller
{
    public function index()
    {
        $countries     = DB::table('countries')->orderBy('name')->get();
        $carriers      = DB::table('carriers')->where('is_active', true)->orderBy('name')->get();
        $zones         = DB::table('zones')->orderBy('carrier_id')->orderBy('country_id')->orderByRaw('LENGTH(name)')->orderBy('name')->get();
        $provinces     = DB::table('provinces')->orderBy('name')->get();
        $provinceZones = DB::table('province_zones')->get();

        return Inertia::render('Admin/Geography', [
            'countries'     => $countries,
            'carriers'      => $carriers,
            'zones'         => $zones,
            'provinces'     => $provinces,
            'provinceZones' => $provinceZones,
        ]);
    }

    // ── Countries ──────────────────────────────────────────────────────────

    public function storeCountry(Request $request)
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'size:2', 'unique:countries,code'],
            'name' => ['required', 'string', 'max:100'],
        ]);

        $data['code'] = strtoupper($data['code']);
        DB::table('countries')->insert([...$data, 'created_at' => now(), 'updated_at' => now()]);

        return back()->with('success', "País {$data['name']} creado.");
    }

    public function updateCountry(Request $request, int $id)
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'size:2', "unique:countries,code,{$id}"],
            'name' => ['required', 'string', 'max:100'],
        ]);

        $data['code'] = strtoupper($data['code']);
        DB::table('countries')->where('id', $id)->update([...$data, 'updated_at' => now()]);

        return back()->with('success', 'País actualizado.');
    }

    public function destroyCountry(int $id)
    {
        $hasZones = DB::table('zones')->where('country_id', $id)->exists();
        if ($hasZones) {
            return back()->withErrors(['delete' => 'No se puede eliminar: tiene zonas asociadas.']);
        }

        DB::table('countries')->where('id', $id)->delete();
        return back()->with('success', 'País eliminado.');
    }

    // ── Zones ──────────────────────────────────────────────────────────────

    public function storeZone(Request $request)
    {
        $data = $request->validate([
            'country_id' => ['required', 'integer', 'exists:countries,id'],
            'carrier_id' => ['required', 'integer', 'exists:carriers,id'],
            'name'       => ['required', 'string', 'max:100'],
        ]);

        $exists = DB::table('zones')
            ->where('country_id', $data['country_id'])
            ->where('carrier_id', $data['carrier_id'])
            ->where('name', $data['name'])
            ->exists();

        if ($exists) {
            return back()->withErrors(['name' => 'Ya existe una zona con ese nombre para este transportista en este país.']);
        }

        DB::table('zones')->insert([...$data, 'created_at' => now(), 'updated_at' => now()]);
        return back()->with('success', "Zona {$data['name']} creada.");
    }

    public function updateZone(Request $request, int $id)
    {
        $data = $request->validate([
            'country_id' => ['required', 'integer', 'exists:countries,id'],
            'carrier_id' => ['required', 'integer', 'exists:carriers,id'],
            'name'       => ['required', 'string', 'max:100'],
        ]);

        DB::table('zones')->where('id', $id)->update([...$data, 'updated_at' => now()]);
        return back()->with('success', 'Zona actualizada.');
    }

    public function destroyZone(int $id)
    {
        $hasProvinces = DB::table('province_zones')->where('zone_id', $id)->exists();
        $hasRates     = DB::table('rates')->where('zone_id', $id)->exists();

        if ($hasProvinces || $hasRates) {
            return back()->withErrors(['delete' => 'No se puede eliminar: tiene destinos o tarifas asociadas.']);
        }

        DB::table('zones')->where('id', $id)->delete();
        return back()->with('success', 'Zona eliminada.');
    }
}
