<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class ProvinceController extends Controller
{
    public function index()
    {
        $provinces = DB::table('provinces')
            ->join('zones', 'provinces.zone_id', '=', 'zones.id')
            ->orderBy('provinces.name')
            ->get([
                'provinces.id',
                'provinces.name',
                'zones.name as zone_name',
            ]);

        return response()->json($provinces);
    }
}
