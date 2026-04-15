<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CarrierController extends Controller
{
    public function index()
    {
        $carriers = DB::table('carriers')->orderBy('name')->get();

        return Inertia::render('Admin/Carriers', [
            'carriers' => $carriers,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code'      => ['required', 'string', 'max:50', 'unique:carriers,code'],
            'name'      => ['required', 'string', 'max:100'],
            'is_active' => ['boolean'],
        ]);

        DB::table('carriers')->insert([
            'code'       => $data['code'],
            'name'       => $data['name'],
            'is_active'  => $data['is_active'] ?? true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return back()->with('success', "Transportista {$data['name']} creado.");
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'code'      => ['required', 'string', 'max:50', "unique:carriers,code,{$id}"],
            'name'      => ['required', 'string', 'max:100'],
            'is_active' => ['boolean'],
        ]);

        DB::table('carriers')->where('id', $id)->update([
            'code'       => $data['code'],
            'name'       => $data['name'],
            'is_active'  => $data['is_active'] ?? true,
            'updated_at' => now(),
        ]);

        return back()->with('success', 'Transportista actualizado.');
    }

    public function destroy(int $id)
    {
        DB::transaction(function () use ($id) {
            $zoneIds = DB::table('zones')->where('carrier_id', $id)->pluck('id');

            if ($zoneIds->isNotEmpty()) {
                DB::table('province_zones')->whereIn('zone_id', $zoneIds)->delete();
                DB::table('rates')->whereIn('zone_id', $zoneIds)->delete();
                DB::table('zones')->whereIn('id', $zoneIds)->delete();
            }

            DB::table('carriers')->where('id', $id)->delete();
        });

        return back()->with('success', 'Transportista eliminado.');
    }
}
