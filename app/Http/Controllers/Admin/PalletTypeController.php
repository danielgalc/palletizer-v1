<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PalletTypeController extends Controller
{
    public function index()
    {
        $palletTypes = DB::table('pallet_types')->orderBy('name')->get();

        return Inertia::render('Admin/PalletTypes', [
            'palletTypes' => $palletTypes,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code'           => ['required', 'string', 'max:50', 'unique:pallet_types,code'],
            'name'           => ['required', 'string', 'max:100'],
            'base_length_cm' => ['required', 'integer', 'min:1'],
            'base_width_cm'  => ['required', 'integer', 'min:1'],
            'max_height_cm'  => ['required', 'integer', 'min:1'],
            'max_weight_kg'  => ['required', 'integer', 'min:1'],
        ]);

        DB::table('pallet_types')->insert([...$data, 'created_at' => now(), 'updated_at' => now()]);
        return back()->with('success', "Tipo de pallet {$data['name']} creado.");
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'code'           => ['required', 'string', 'max:50', "unique:pallet_types,code,{$id}"],
            'name'           => ['required', 'string', 'max:100'],
            'base_length_cm' => ['required', 'integer', 'min:1'],
            'base_width_cm'  => ['required', 'integer', 'min:1'],
            'max_height_cm'  => ['required', 'integer', 'min:1'],
            'max_weight_kg'  => ['required', 'integer', 'min:1'],
        ]);

        DB::table('pallet_types')->where('id', $id)->update([...$data, 'updated_at' => now()]);
        return back()->with('success', 'Tipo de pallet actualizado.');
    }

    public function destroy(int $id)
    {
        $hasRates = DB::table('rates')->where('pallet_type_id', $id)->exists();
        if ($hasRates) {
            return back()->withErrors(['delete' => 'No se puede eliminar: tiene tarifas asociadas.']);
        }

        DB::table('pallet_types')->where('id', $id)->delete();
        return back()->with('success', 'Tipo de pallet eliminado.');
    }
}
