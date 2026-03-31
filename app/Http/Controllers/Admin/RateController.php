<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class RateController extends Controller
{
    public function index(Request $request)
    {
        $query = DB::table('rates as r')
            ->join('carriers as c', 'c.id', '=', 'r.carrier_id')
            ->join('zones as z', 'z.id', '=', 'r.zone_id')
            ->join('countries as co', 'co.id', '=', 'z.country_id')
            ->join('pallet_types as pt', 'pt.id', '=', 'r.pallet_type_id')
            ->select(
                'r.id', 'r.min_pallets', 'r.max_pallets', 'r.price_eur', 'r.carrier_rate_name',
                'c.id as carrier_id', 'c.name as carrier_name',
                'z.id as zone_id', 'z.name as zone_name',
                'co.name as country_name',
                'pt.id as pallet_type_id', 'pt.name as pallet_type_name'
            );

        if ($request->filled('carrier_id')) {
            $query->where('r.carrier_id', $request->carrier_id);
        }
        if ($request->filled('zone_id')) {
            $query->where('r.zone_id', $request->zone_id);
        }

        $rates = $query
            ->orderBy('c.name')
            ->orderBy('co.name')
            ->orderByRaw("CAST(NULLIF(REGEXP_REPLACE(z.name, '[^0-9]', '', 'g'), '') AS INTEGER) NULLS LAST")
            ->orderBy('z.name')
            ->orderBy('pt.name')
            ->orderBy('r.min_pallets')
            ->paginate(10)
            ->withQueryString();

        $carriers = DB::table('carriers')->orderBy('name')->get();

        // Zonas ordenadas numéricamente dentro de cada país
        $zones = DB::table('zones as z')
            ->join('countries as c', 'c.id', '=', 'z.country_id')
            ->orderBy('c.name')
            ->orderByRaw("CAST(NULLIF(REGEXP_REPLACE(z.name, '[^0-9]', '', 'g'), '') AS INTEGER) NULLS LAST")
            ->orderBy('z.name')
            ->select('z.id', 'z.name', 'c.name as country_name')
            ->get();

        $palletTypes = DB::table('pallet_types')->orderBy('name')->get();

        return Inertia::render('Admin/Rates', [
            'rates'       => $rates,
            'carriers'    => $carriers,
            'zones'       => $zones,
            'palletTypes' => $palletTypes,
            'filters'     => $request->only(['carrier_id', 'zone_id']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'carrier_id'        => ['required', 'integer', 'exists:carriers,id'],
            'zone_id'           => ['required', 'integer', 'exists:zones,id'],
            'pallet_type_id'    => ['required', 'integer', 'exists:pallet_types,id'],
            'min_pallets'       => ['required', 'integer', 'min:1'],
            'max_pallets'       => ['required', 'integer', 'min:1', 'gte:min_pallets'],
            'price_eur'         => ['required', 'numeric', 'min:0'],
            'carrier_rate_name' => ['nullable', 'string', 'max:150'],
        ]);

        DB::table('rates')->insert([...$data, 'created_at' => now(), 'updated_at' => now()]);
        return back()->with('success', 'Tarifa creada.');
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'carrier_id'        => ['required', 'integer', 'exists:carriers,id'],
            'zone_id'           => ['required', 'integer', 'exists:zones,id'],
            'pallet_type_id'    => ['required', 'integer', 'exists:pallet_types,id'],
            'min_pallets'       => ['required', 'integer', 'min:1'],
            'max_pallets'       => ['required', 'integer', 'min:1', 'gte:min_pallets'],
            'price_eur'         => ['required', 'numeric', 'min:0'],
            'carrier_rate_name' => ['nullable', 'string', 'max:150'],
        ]);

        DB::table('rates')->where('id', $id)->update([...$data, 'updated_at' => now()]);
        return back()->with('success', 'Tarifa actualizada.');
    }

    public function destroy(int $id)
    {
        DB::table('rates')->where('id', $id)->delete();
        return back()->with('success', 'Tarifa eliminada.');
    }
}