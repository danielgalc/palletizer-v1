<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class ProvinceController extends Controller
{
    public function index()
    {
        return DB::table('provinces')
            ->orderBy('name')
            ->get(['id', 'name']);
    }
}