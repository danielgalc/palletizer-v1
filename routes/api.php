<?php


use App\Http\Controllers\Api\ProvinceController;
use App\Http\Controllers\Api\PalletTypeController;
use Illuminate\Support\Facades\Route;

Route::get('/provinces', [ProvinceController::class, 'index']);
Route::get('/pallet-types', [PalletTypeController::class, 'index']);
