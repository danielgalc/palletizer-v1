<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CarrierController extends Controller
{
    public function index(Request $request)
    {
        $zoneId     = $request->query('zone_id');
        $provinceId = $request->query('province_id');

        // CASO 1: destino por provincia (España) → buscar via province_zones
        if ($provinceId && !$zoneId) {
            $carriers = DB::table('carriers')
                ->join('zones', 'zones.carrier_id', '=', 'carriers.id')
                ->join('province_zones', 'province_zones.zone_id', '=', 'zones.id')
                ->join('rates', function ($join) {
                    $join->on('rates.zone_id', '=', 'zones.id')
                         ->on('rates.carrier_id', '=', 'carriers.id');
                })
                ->where('province_zones.province_id', (int) $provinceId)
                ->where('carriers.is_active', 1)
                ->select('carriers.id', 'carriers.code', 'carriers.name')
                ->distinct()
                ->orderBy('carriers.name')
                ->get();

            return response()->json($carriers);
        }

        // CASO 2: destino por zona directa (no España)
        if ($zoneId) {
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

        // CASO 3: sin destino → todos los carriers activos
        return response()->json(
            DB::table('carriers')
                ->where('is_active', 1)
                ->orderBy('name')
                ->get(['id', 'code', 'name'])
        );
    }
}
