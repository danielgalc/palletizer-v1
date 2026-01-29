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
            'province_id'  => ['nullable', 'integer', 'exists:provinces,id'],
            'zone_id'      => ['nullable', 'integer', 'exists:zones,id'],

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

        // Resolver zoneId + etiqueta destino
        $zoneId = null;
        $destinationLabel = null;

        if ($country === 'ES') {
            if (empty($data['province_id'])) {
                return back()->withErrors(['province_id' => 'Selecciona una provincia.']);
            }

            $province = DB::table('provinces')->where('id', $data['province_id'])->first();
            if (!$province) {
                return back()->withErrors(['province_id' => 'Provincia no encontrada.']);
            }

            $zoneId = (int) $province->zone_id;
            $destinationLabel = $province->name;
        } else {
            if (empty($data['zone_id'])) {
                return back()->withErrors(['zone_id' => 'Selecciona una zona.']);
            }

            // (Opcional pero recomendable) validar que esa zona pertenece al país:
            // $zone = DB::table('zones')->where('id', $data['zone_id'])->where('country_code', $country)->first();
            $zone = DB::table('zones')->where('id', $data['zone_id'])->first();

            if (!$zone) {
                return back()->withErrors(['zone_id' => 'Zona no encontrada.']);
            }

            $zoneId = (int) $zone->id;
            $destinationLabel = $zone->name;
        }

        $items = [
            'mini_pc' => (int) $data['mini_pc'],
            'tower'   => (int) $data['tower'],
            'laptop'  => (int) $data['laptop'],
        ];

        $allowedCodes = ($data['pallet_mode'] === 'manual') ? $data['pallet_type_codes'] : null;
        $allowSeparators = (bool) $data['allow_separators'];

        $plan = $svc->calculateBestPlan($zoneId, $items, $allowedCodes, $allowSeparators);

        return Inertia::render('Palletizer/Index', [
            'result' => [
                'province' => $destinationLabel,   // puedes renombrarlo a "destination" si quieres
                'country_code' => $country,
                'zone_id' => $zoneId,
                'items' => $items,
                'plan' => $plan,
            ],
        ]);
    }
}
