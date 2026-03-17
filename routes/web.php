<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\PalletizerController;
use App\Http\Controllers\Admin\CountryController;
use App\Http\Controllers\Admin\ProvinceController;
use App\Http\Controllers\Admin\CarrierController;
use App\Http\Controllers\Admin\PalletTypeController;
use App\Http\Controllers\Admin\RateController;
use App\Http\Controllers\Admin\BoxTypeController;
use App\Http\Controllers\Admin\BoxProviderController;
use App\Http\Controllers\Admin\BoxVariantController;
use App\Http\Controllers\Admin\DeviceModelController;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Rutas Palletizer

Route::get('/palletizer', [PalletizerController::class, 'index'])->name('palletizer.index');
Route::post('/palletizer/calculate', [PalletizerController::class, 'calculate'])->name('palletizer.calculate');

// ── Panel de administración ────────────────────────────────────────────────

Route::middleware(['auth', 'admin'])->prefix('admin')->name('admin.')->group(function () {

    // Países y Zonas
    Route::get('/countries',                  [CountryController::class, 'index'])->name('countries.index');
    Route::post('/countries',                 [CountryController::class, 'storeCountry'])->name('countries.store');
    Route::put('/countries/{id}',             [CountryController::class, 'updateCountry'])->name('countries.update');
    Route::delete('/countries/{id}',          [CountryController::class, 'destroyCountry'])->name('countries.destroy');
    Route::post('/countries/{id}/zones',      [CountryController::class, 'storeZone'])->name('zones.store');
    Route::put('/zones/{id}',                 [CountryController::class, 'updateZone'])->name('zones.update');
    Route::delete('/zones/{id}',              [CountryController::class, 'destroyZone'])->name('zones.destroy');

    // Provincias
    Route::get('/provinces',        [ProvinceController::class, 'index'])->name('provinces.index');
    Route::post('/provinces',       [ProvinceController::class, 'store'])->name('provinces.store');
    Route::put('/provinces/{id}',   [ProvinceController::class, 'update'])->name('provinces.update');
    Route::delete('/provinces/{id}',[ProvinceController::class, 'destroy'])->name('provinces.destroy');

    // Transportistas
    Route::get('/carriers',        [CarrierController::class, 'index'])->name('carriers.index');
    Route::post('/carriers',       [CarrierController::class, 'store'])->name('carriers.store');
    Route::put('/carriers/{id}',   [CarrierController::class, 'update'])->name('carriers.update');
    Route::delete('/carriers/{id}',[CarrierController::class, 'destroy'])->name('carriers.destroy');

    // Tipos de pallet
    Route::get('/pallet-types',        [PalletTypeController::class, 'index'])->name('pallet-types.index');
    Route::post('/pallet-types',       [PalletTypeController::class, 'store'])->name('pallet-types.store');
    Route::put('/pallet-types/{id}',   [PalletTypeController::class, 'update'])->name('pallet-types.update');
    Route::delete('/pallet-types/{id}',[PalletTypeController::class, 'destroy'])->name('pallet-types.destroy');

    // Tarifas
    Route::get('/rates',        [RateController::class, 'index'])->name('rates.index');
    Route::post('/rates',       [RateController::class, 'store'])->name('rates.store');
    Route::put('/rates/{id}',   [RateController::class, 'update'])->name('rates.update');
    Route::delete('/rates/{id}',[RateController::class, 'destroy'])->name('rates.destroy');

    // Tipos de caja
    Route::get('/box-types',        [BoxTypeController::class, 'index'])->name('box-types.index');
    Route::post('/box-types',       [BoxTypeController::class, 'store'])->name('box-types.store');
    Route::put('/box-types/{id}',   [BoxTypeController::class, 'update'])->name('box-types.update');
    Route::delete('/box-types/{id}',[BoxTypeController::class, 'destroy'])->name('box-types.destroy');

    // Proveedores de cajas
    Route::get('/box-providers',        [BoxProviderController::class, 'index'])->name('box-providers.index');
    Route::post('/box-providers',       [BoxProviderController::class, 'store'])->name('box-providers.store');
    Route::put('/box-providers/{id}',   [BoxProviderController::class, 'update'])->name('box-providers.update');
    Route::delete('/box-providers/{id}',[BoxProviderController::class, 'destroy'])->name('box-providers.destroy');

    // Variantes de caja
    Route::get('/box-variants',        [BoxVariantController::class, 'index'])->name('box-variants.index');
    Route::post('/box-variants',       [BoxVariantController::class, 'store'])->name('box-variants.store');
    Route::put('/box-variants/{id}',   [BoxVariantController::class, 'update'])->name('box-variants.update');
    Route::delete('/box-variants/{id}',[BoxVariantController::class, 'destroy'])->name('box-variants.destroy');

    // Modelos de dispositivo
    Route::get('/device-models',        [DeviceModelController::class, 'index'])->name('device-models.index');
    Route::post('/device-models',       [DeviceModelController::class, 'store'])->name('device-models.store');
    Route::put('/device-models/{id}',   [DeviceModelController::class, 'update'])->name('device-models.update');
    Route::delete('/device-models/{id}',[DeviceModelController::class, 'destroy'])->name('device-models.destroy');
});


require __DIR__.'/auth.php';