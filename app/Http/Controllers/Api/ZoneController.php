<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ZoneController extends Controller
{
    public function index(Request $request)
    {
        $countryCode = $request->query('country_code');

        $q = DB::table('zones as z')
            ->join('countries as c', 'c.id', '=', 'z.country_id')
            ->join('carriers as ca', 'ca.id', '=', 'z.carrier_id')
            ->select(
                'z.id',
                'z.name',
                'z.carrier_id',
                'ca.name as carrier_name',
                'c.code as country_code'
            );

        if ($countryCode) {
            $q->where('c.code', strtoupper($countryCode));
        }

        return $q
            ->orderBy('ca.name')
            ->orderByRaw('LENGTH(z.name)')
            ->orderBy('z.name')
            ->get();
    }
}
