<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CarrierController extends Controller
{
    public function index(Request $request)
    {
        $zoneId = $request->query('zone_id');
        $provinceId = $request->query('province_id');

        // Si viene provincia pero no zona, resolverla
        if (!$zoneId && $provinceId) {
            $zoneId = DB::table('provinces')
                ->where('id', (int) $provinceId)
                ->value('zone_id');
        }

        // 👉 CASO 1: aún no hay destino → devolvemos carriers activos (sin filtrar)
        if (!$zoneId) {
            return DB::table('carriers')
                ->where('is_active', 1)
                ->orderBy('name')
                ->get(['id', 'code', 'name']);
        }

        // 👉 CASO 2: hay zona → solo carriers con tarifas
        $carriers = DB::table('rates')
            ->join('carriers', 'carriers.id', '=', 'rates.carrier_id')
            ->where('rates.zone_id', (int) $zoneId)
            ->where('carriers.is_active', 1)
            ->select('carriers.id', 'carriers.code', 'carriers.name')
            ->distinct()
            ->orderBy('carriers.name')
            ->get();

        return response()->json($carriers);
    }
}
