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
            'country_code' => ['required', 'string', 'size:2'],

            'province_id' => ['nullable', 'integer', 'exists:provinces,id', 'required_if:country_code,ES'],
            'zone_id' => ['nullable', 'integer', 'exists:zones,id', 'required_unless:country_code,ES'],

            'mini_pc'  => ['required', 'integer', 'min:0'],
            'tower'    => ['required', 'integer', 'min:0'],
            'laptop'   => ['required', 'integer', 'min:0'],

            'pallet_mode' => ['required', 'in:auto,manual'],
            'pallet_type_codes' => ['nullable', 'array'],
            'pallet_type_codes.*' => ['string', 'exists:pallet_types,code'],

            'allow_separators' => ['required', 'boolean'],
        ]);


        if ($data['pallet_mode'] === 'manual' && empty($data['pallet_type_codes'])) {
            return back()->withErrors([
                'pallet_type_codes' => 'Selecciona al menos un tipo de pallet o usa modo Auto.',
            ]);
        }

        $country = strtoupper($data['country_code'] ?? 'ES');

        // Determinar zona según país
        $isES = ($data['country_code'] ?? 'ES') === 'ES';

        if ($isES) {
            $province = DB::table('provinces')->where('id', $data['province_id'])->first();
            if (!$province) {
                return back()->withErrors(['province_id' => 'Provincia no encontrada.']);
            }
            $zoneId = (int) $province->zone_id;
            $destinationLabel = $province->name; // para pintar en UI
        } else {
            $zoneId = (int) $data['zone_id'];
            $zone = DB::table('zones')->where('id', $zoneId)->first();
            if (!$zone) {
                return back()->withErrors(['zone_id' => 'Zona no encontrada.']);
            }
            $destinationLabel = $zone->name;
        }

        $items = [
            'mini_pc' => (int) $data['mini_pc'],
            'tower'   => (int) $data['tower'],
            'laptop'  => (int) $data['laptop'],
        ];

        $allowedCodes = ($data['pallet_mode'] === 'manual') ? $data['pallet_type_codes'] : null;
        $allowSeparators = (bool) $data['allow_separators'];

        $plan = $svc->calculateBestPlanAcrossCarriers($zoneId, $items, $allowedCodes, $allowSeparators);

        return Inertia::render('Palletizer/Index', [
            'result' => [
                'country_code' => $data['country_code'],
                'destination' => $destinationLabel,
                'zone_id' => $zoneId,
                'items' => $items,
                'plan' => $plan,
            ],
        ]);
    }
}
