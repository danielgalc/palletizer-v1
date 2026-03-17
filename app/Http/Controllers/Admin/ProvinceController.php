<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ProvinceController extends Controller
{
    public function index()
    {
        $provinces = DB::table('provinces as p')
            ->join('zones as z', 'z.id', '=', 'p.zone_id')
            ->join('countries as c', 'c.id', '=', 'z.country_id')
            ->orderBy('c.name')
            ->orderBy('z.name')
            ->orderBy('p.name')
            ->select('p.id', 'p.name', 'p.zone_id', 'z.name as zone_name', 'c.name as country_name')
            ->get();

        $zones = DB::table('zones as z')
            ->join('countries as c', 'c.id', '=', 'z.country_id')
            ->orderBy('c.name')
            ->orderBy('z.name')
            ->select('z.id', 'z.name', 'c.name as country_name')
            ->get();

        return Inertia::render('Admin/Provinces', [
            'provinces' => $provinces,
            'zones'     => $zones,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'    => ['required', 'string', 'max:100', 'unique:provinces,name'],
            'zone_id' => ['required', 'integer', 'exists:zones,id'],
        ]);

        DB::table('provinces')->insert([...$data, 'created_at' => now(), 'updated_at' => now()]);
        return back()->with('success', "Provincia {$data['name']} creada.");
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'name'    => ['required', 'string', 'max:100', "unique:provinces,name,{$id}"],
            'zone_id' => ['required', 'integer', 'exists:zones,id'],
        ]);

        DB::table('provinces')->where('id', $id)->update([...$data, 'updated_at' => now()]);
        return back()->with('success', 'Provincia actualizada.');
    }

    public function destroy(int $id)
    {
        DB::table('provinces')->where('id', $id)->delete();
        return back()->with('success', 'Provincia eliminada.');
    }
}
