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

        $q = DB::table('zones')
            ->join('countries', 'countries.id', '=', 'zones.country_id')
            ->select('zones.id', 'zones.name', 'countries.code as country_code');

        if ($countryCode) {
            $q->where('countries.code', strtoupper($countryCode));
        }

        return $q->orderBy('zones.name')->get();
    }
}
