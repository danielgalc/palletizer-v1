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
        $request->merge([
            'country_code' => strtoupper($request->input('country_code', 'ES')),
        ]);

        $data = $request->validate([
            'country_code' => ['required', 'string', 'size:2', 'exists:countries,code'],

            // ES: province_id; resto: zone_id
            'province_id' => ['required_if:country_code,ES', 'nullable', 'integer', 'exists:provinces,id'],
            'zone_id' => ['required_unless:country_code,ES', 'nullable', 'integer', 'exists:zones,id'],


            'mini_pc'  => ['required', 'integer', 'min:0'],
            'tower'    => ['required', 'integer', 'min:0'],
            'laptop'   => ['required', 'integer', 'min:0'],

            'pallet_mode' => ['required', 'in:auto,manual'],
            'pallet_type_codes' => ['nullable', 'array'],
            'pallet_type_codes.*' => ['string', 'exists:pallet_types,code'],

            'allow_separators' => ['required', 'boolean'],
        ]);


        $province = DB::table('provinces')->where('id', $data['province_id'])->first();

        $countryCode = strtoupper($data['country_code']);
        $zoneId = null;

        $provinceName = null;
        $provinceId = null;

        if ($countryCode === 'ES') {
            if (empty($data['province_id'])) {
                return back()->withErrors(['province_id' => 'Selecciona una provincia.']);
            }

            $province = DB::table('provinces')->where('id', $data['province_id'])->first();
            if (!$province) {
                return back()->withErrors(['province_id' => 'Provincia no encontrada.']);
            }

            $zoneId = (int) $province->zone_id;
            $provinceName = (string) $province->name;
            $provinceId = (int) $province->id;
        } else {
            if (empty($data['zone_id'])) {
                return back()->withErrors(['zone_id' => 'Selecciona una zona.']);
            }

            // Asegurar que la zona pertenece al país
            $zone = DB::table('zones')
                ->join('countries', 'countries.id', '=', 'zones.country_id')
                ->where('zones.id', $data['zone_id'])
                ->where('countries.code', $countryCode)
                ->select('zones.id', 'zones.name', 'countries.name as country_name', 'countries.code as country_code')
                ->first();

            if (!$zone) {
                return back()->withErrors(['zone_id' => 'Zona inválida para el país seleccionado.']);
            }

            $zoneId = (int) $zone->id;
        }

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

        $plan = $svc->calculateBestPlanAcrossCarriers($zoneId, $items, $allowedCodes, $allowSeparators);

        return Inertia::render('Palletizer/Index', [
            'result' => [
                'country_code' => $countryCode,
                'province' => $provinceName,
                'province_id' => $provinceId,
                'zone_id' => (int) $zoneId,
                'items' => $items,
                'plan' => $plan,
            ],
        ]);
    }
}
