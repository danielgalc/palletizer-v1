<?php


use App\Http\Controllers\Api\ProvinceController;
use App\Http\Controllers\Api\PalletTypeController;
use App\Http\Controllers\Api\BoxTypeController;
use App\Http\Controllers\ExportController;
use Illuminate\Support\Facades\Route;


Route::get('/provinces', [ProvinceController::class, 'index']);
Route::get('/pallet-types', [PalletTypeController::class, 'index']);

Route::get('/box-types', [BoxTypeController::class, 'index']);
Route::put('/box-types/{id}', [BoxTypeController::class, 'update']);

Route::post('/export/best-plan', [ExportController::class, 'bestPlan']);

