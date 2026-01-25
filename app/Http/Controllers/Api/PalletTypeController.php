<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class PalletTypeController extends Controller
{
    public function index()
    {
        $types = DB::table('pallet_types')
            ->orderBy('id')
            ->get(['id', 'code', 'name']);

        return response()->json($types);
    }
}
