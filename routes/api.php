<?php


use App\Http\Controllers\Api\ProvinceController;
use App\Http\Controllers\Api\PalletTypeController;
use App\Http\Controllers\Api\BoxTypeController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\Api\CountryController;
use App\Http\Controllers\Api\ZoneController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\CarrierController;
use App\Http\Controllers\Api\DeviceModelController;
use App\Http\Controllers\Api\BoxProviderController;
use App\Http\Controllers\Api\BoxVariantController;




Route::get('/provinces', [ProvinceController::class, 'index']);
Route::get('/pallet-types', [PalletTypeController::class, 'index']);

Route::get('/box-types', [BoxTypeController::class, 'index']);
Route::put('/box-types/{id}', [BoxTypeController::class, 'update']);

Route::get('/box-providers', [BoxProviderController::class, 'index']);
Route::post('/box-providers', [BoxProviderController::class, 'store']);
Route::put('/box-providers/{id}', [BoxProviderController::class, 'update']);

Route::get('/box-variants', [BoxVariantController::class, 'index']);
Route::post('/box-variants', [BoxVariantController::class, 'store']);
Route::put('/box-variants/{id}', [BoxVariantController::class, 'update']);
Route::put('/box-variants/{id}/stock', [BoxVariantController::class, 'updateStock']);

Route::get('/device-models', [DeviceModelController::class, 'index']);
Route::post('/device-models', [DeviceModelController::class, 'store']);
Route::put('/device-models/{id}', [DeviceModelController::class, 'update']);

Route::post('/export/best-plan', [ExportController::class, 'bestPlan']);
Route::post('/export/best-plan-pdf', [ExportController::class, 'bestPlanPdf']);

Route::get('/countries', [CountryController::class, 'index']);
Route::get('/zones', [ZoneController::class, 'index']);

Route::get('/carriers', [CarrierController::class, 'index']);