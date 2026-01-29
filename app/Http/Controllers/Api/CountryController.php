<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class CountryController extends Controller
{
    public function index()
    {
        return DB::table('countries')
            ->orderBy('name')
            ->get(['id','code','name']);
    }
}
