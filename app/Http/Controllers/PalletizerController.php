<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Services\PalletizationService;


class PalletizerController extends Controller
{
    public function index()
    {
        return Inertia::render('Palletizer/Index', [
            'result' => null,
        ]);
    }

    public function calculate(Request $request, PalletizationService $svc)
    {
        $data = $request->validate([
            'province_id' => ['required', 'integer', 'exists:provinces,id'],
            'mini_pc'  => ['required', 'integer', 'min:0'],
            'tower'    => ['required', 'integer', 'min:0'],
            'laptop'   => ['required', 'integer', 'min:0'],
            
            'pallet_mode' => ['required', 'in:auto,manual'],
            'pallet_type_codes' => ['nullable', 'array'],
            'pallet_type_codes.*' => ['string', 'exists:pallet_types,code'],

            'allow_separators' => ['required', 'boolean'],
            ]);



        $province = DB::table('provinces')->where('id', $data['province_id'])->first();

        // Normalización básica
        $provinceInput = mb_strtolower($province->name);
        $provinceInput = str_replace(
            ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ'],
            ['a', 'e', 'i', 'o', 'u', 'u', 'n'],
            $provinceInput
        );

        // Buscamos comparando normalizado
        $province = DB::table('provinces')->get()->first(function ($p) use ($provinceInput) {
            $name = mb_strtolower($p->name);
            $name = str_replace(
                ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ'],
                ['a', 'e', 'i', 'o', 'u', 'u', 'n'],
                $name
            );
            return $name === $provinceInput;
        });


        if (!$province) {
            return back()->withErrors([
                'province' => 'Provincia no encontrada.',
            ]);
        }

        if ($data['pallet_mode'] === 'manual' && empty($data['pallet_type_codes'])) {
            return back()->withErrors([
                'pallet_type_codes' => 'Selecciona al menos un tipo de pallet o usa modo Auto.',
            ]);
        }


        $items = [
            'mini_pc' => (int) $data['mini_pc'],
            'tower'   => (int) $data['tower'],
            'laptop'  => (int) $data['laptop'],
        ];

        $allowedCodes = ($data['pallet_mode'] === 'manual') ? $data['pallet_type_codes'] : null;
        $allowSeparators = (bool) $data['allow_separators'];

        $plan = $svc->calculateBestPlan($province->zone_id, $items, $allowedCodes, $allowSeparators);

        return Inertia::render('Palletizer/Index', [
            'result' => [
                'province' => $province->name,
                'province_id' => (int) $province->id,
                'zone_id' => (int) $province->zone_id,
                'items' => $items,
                'plan' => $plan,
            ],
        ]);
    }
}
