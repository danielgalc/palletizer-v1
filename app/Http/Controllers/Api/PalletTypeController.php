<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PalletTypeController extends Controller
{
    public function index(Request $request)
    {
        $zoneId = $request->query('zone_id');
        $provinceId = $request->query('province_id');
        $carrierIds = $request->query('carrier_ids'); // puede venir como array o string

        if (!$zoneId && $provinceId) {
            $zoneId = DB::table('provinces')->where('id', (int)$provinceId)->value('zone_id');
        }

        // Base query
        $q = DB::table('pallet_types')
            ->select('pallet_types.id', 'pallet_types.code', 'pallet_types.name')
            ->orderBy('pallet_types.id');

        // Si hay destino, filtramos a los pallet_types que tengan rates para ese destino
        if ($zoneId) {
            $q->join('rates', 'rates.pallet_type_id', '=', 'pallet_types.id')
              ->where('rates.zone_id', (int)$zoneId);

            // Filtrar por carriers si vienen
            if ($carrierIds) {
                $ids = is_array($carrierIds) ? $carrierIds : explode(',', (string)$carrierIds);
                $ids = array_values(array_filter(array_map('intval', $ids)));
                if (!empty($ids)) {
                    $q->whereIn('rates.carrier_id', $ids);
                }
            }

            $q->distinct();
        }

        return response()->json($q->get());
    }
}
