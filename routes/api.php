<?php


use App\Http\Controllers\Api\ProvinceController;
use App\Http\Controllers\Api\PalletTypeController;
use App\Http\Controllers\Api\BoxTypeController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\Api\CountryController;
use App\Http\Controllers\Api\ZoneController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\CarrierController;


Route::get('/provinces', [ProvinceController::class, 'index']);
Route::get('/pallet-types', [PalletTypeController::class, 'index']);

Route::get('/box-types', [BoxTypeController::class, 'index']);
Route::put('/box-types/{id}', [BoxTypeController::class, 'update']);

Route::post('/export/best-plan', [ExportController::class, 'bestPlan']);
Route::post('/export/best-plan-pdf', [ExportController::class, 'bestPlanPdf']);

Route::get('/countries', [CountryController::class, 'index']);
Route::get('/zones', [ZoneController::class, 'index']);

Route::get('/carriers', [CarrierController::class, 'index']);