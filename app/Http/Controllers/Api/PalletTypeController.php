<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PalletTypeController extends Controller
{
    public function index(Request $request)
    {
        $countryCode = strtoupper((string) $request->query('country_code', ''));
        $provinceId  = $request->query('province_id');
        $zoneId      = $request->query('zone_id');
        $carrierId   = $request->query('carrier_id');

        // Resolver zone_id si viene España + province_id
        $resolvedZoneId = null;

        if ($countryCode === 'ES' && $provinceId) {
            $resolvedZoneId = DB::table('provinces')->where('id', (int)$provinceId)->value('zone_id');
        } elseif ($zoneId) {
            $resolvedZoneId = (int) $zoneId;
        }

        // Si no tenemos zona, devolvemos todos
        if (!$resolvedZoneId) {
            $types = DB::table('pallet_types')
                ->orderBy('id')
                ->get(['id', 'code', 'name']);

            return response()->json($types);
        }

        // Si hay zona, devolvemos SOLO los pallet_types que tienen rates para esa zona (y carrier si aplica)
        $q = DB::table('pallet_types')
            ->join('rates', 'rates.pallet_type_id', '=', 'pallet_types.id')
            ->where('rates.zone_id', $resolvedZoneId);

        if ($carrierId !== null && $carrierId !== '') {
            $q->where('rates.carrier_id', (int)$carrierId);
        }

        $types = $q
            ->distinct()
            ->orderBy('pallet_types.id')
            ->get(['pallet_types.id', 'pallet_types.code', 'pallet_types.name']);

        return response()->json($types);
    }
}
