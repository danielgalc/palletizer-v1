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

            'lines' => ['nullable', 'array', 'min:1'],
            'lines.*.device_model_id' => ['nullable', 'integer', 'exists:device_models,id'],
            'lines.*.qty' => ['nullable', 'integer', 'min:0'],

            'packaging' => ['nullable', 'array'],
            'packaging.tower'     => ['nullable', 'integer', 'min:1', 'exists:box_variants,id'],
            'packaging.tower_sff' => ['nullable', 'integer', 'min:1', 'exists:box_variants,id'],
            'packaging.laptop'    => ['nullable', 'integer', 'min:1', 'exists:box_variants,id'],
            'packaging.mini_pc'   => ['nullable', 'integer', 'min:1', 'exists:box_variants,id'],


            'mini_pc'    => ['required', 'integer', 'min:0'],
            'tower'      => ['required', 'integer', 'min:0'],
            'tower_sff'  => ['required', 'integer', 'min:0'],
            'laptop'     => ['required', 'integer', 'min:0'],

            'carrier_mode' => ['required', 'in:auto,manual'],
            'carrier_ids' => ['nullable', 'array'],
            'carrier_ids.*' => ['integer', 'exists:carriers,id'],

            'allow_separators' => ['required', 'boolean'],
        ]);

        if (!empty($data['lines']) && is_array($data['lines'])) {
            $any = false;
            foreach ($data['lines'] as $line) {
                if ((int)($line['qty'] ?? 0) > 0) {
                    $any = true;
                    break;
                }
            }
            if (!$any) {
                // Si lines viene pero está vacío en la práctica, lo quitamos para no hacer queries inútiles
                unset($data['lines']);
            }
        }


        if (($data['carrier_mode'] ?? 'auto') === 'manual' && empty($data['carrier_ids'])) {
            return back()->withErrors([
                'carrier_ids' => 'Selecciona al menos un transportista o usa modo Auto.',
            ]);
        }

        $country = strtoupper($data['country_code'] ?? 'ES');

        // Determinar zona según país
        $isES = ($data['country_code'] ?? 'ES') === 'ES';

        if ($isES) {
            $province = DB::table('provinces')->where('id', $data['province_id'])->first();
            if (!$province) {
                return back()->withErrors(['province_id' => 'Destino no encontrado.']);
            }
            $destinationLabel = $province->name;
        } else {
            $zoneId = (int) $data['zone_id'];
            $zone = DB::table('zones')->where('id', $zoneId)->first();
            if (!$zone) {
                return back()->withErrors(['zone_id' => 'Zona no encontrada.']);
            }
            $destinationLabel = $zone->name;
        }

        // ------------------------------------------------------------
        // NUEVO: Si llegan líneas {device_model_id, qty}, convertir a items legacy
        // (Esto mantiene PalletizationService sin cambios mientras migramos)
        // ------------------------------------------------------------
        if (!empty($data['lines']) && is_array($data['lines'])) {
            $lines = $data['lines'];

            // Validación adicional: al menos una línea con qty > 0 y device_model_id informado
            $any = false;
            $ids = [];
            foreach ($lines as $i => $line) {
                $qty = (int) ($line['qty'] ?? 0);
                $id  = $line['device_model_id'] ?? null;

                if ($qty > 0) {
                    $any = true;
                    if (!$id) {
                        return back()->withErrors([
                            "lines.$i.device_model_id" => 'Selecciona un modelo para esta línea.',
                        ]);
                    }
                }

                if ($id) {
                    $id = (int) $id;
                    if (isset($ids[$id])) {
                        return back()->withErrors([
                            "lines.$i.device_model_id" => 'No repitas el mismo modelo en varias líneas.',
                        ]);
                    }
                    $ids[$id] = true;
                }

                if ($qty < 0) {
                    return back()->withErrors([
                        "lines.$i.qty" => 'La cantidad no puede ser negativa.',
                    ]);
                }
            }

            if (!$any) {
                return back()->withErrors([
                    'lines' => 'Añade al menos una línea con cantidad mayor que 0.',
                ]);
            }

            // Cargar modelos y su box_type.code para mapear a mini_pc/tower/laptop
            $modelRows = DB::table('device_models as dm')
                ->join('box_types as bt', 'bt.id', '=', 'dm.box_type_id')
                ->whereIn('dm.id', array_keys($ids))
                ->select('dm.id', 'bt.code as box_code')
                ->get();

            $boxByModelId = [];
            foreach ($modelRows as $r) {
                $boxByModelId[(int)$r->id] = (string)$r->box_code;
            }

            $totals = ['mini_pc' => 0, 'tower' => 0, 'tower_sff' => 0, 'laptop' => 0];

            foreach ($lines as $i => $line) {
                $qty = (int) ($line['qty'] ?? 0);
                $id  = (int) ($line['device_model_id'] ?? 0);

                if ($qty <= 0) continue;

                $code = $boxByModelId[$id] ?? null;
                if (!$code) {
                    return back()->withErrors([
                        "lines.$i.device_model_id" => 'Modelo no encontrado.',
                    ]);
                }

                // Mientras el service sea legacy, solo aceptamos estos 4 códigos
                if (!array_key_exists($code, $totals)) {
                    return back()->withErrors([
                        "lines.$i.device_model_id" => "El tipo de caja '{$code}' no está soportado todavía en el cálculo (solo mini_pc, tower, tower_sff, laptop).",
                    ]);
                }

                $totals[$code] += $qty;
            }

            // Sobrescribir valores legacy para que el cálculo siga funcionando
            $data['mini_pc']   = $totals['mini_pc'];
            $data['tower']     = $totals['tower'];
            $data['tower_sff'] = $totals['tower_sff'];
            $data['laptop']    = $totals['laptop'];
        }


        $items = [
            'mini_pc'   => (int) $data['mini_pc'],
            'tower'     => (int) $data['tower'],
            'tower_sff' => (int) ($data['tower_sff'] ?? 0),
            'laptop'    => (int) $data['laptop'],
        ];

        // Pasamos también lines al service (si vienen) para que pueda usar pesos de device_models
        if (!empty($data['lines']) && is_array($data['lines'])) {
            $items['lines'] = $data['lines'];
        }

        if (!empty($data['packaging']) && is_array($data['packaging'])) {
            // Solo pasar packaging si al menos un tipo tiene un variant_id válido (> 0)
            $packHasValues = false;
            foreach ($data['packaging'] as $v) {
                if ($v !== null && (int)$v > 0) {
                    $packHasValues = true;
                    break;
                }
            }
            if ($packHasValues) {
                $items['packaging'] = $data['packaging'];
            }
        }



        $allowSeparators = (bool) $data['allow_separators'];
        $carrierIds = ($data['carrier_mode'] === 'manual') ? $data['carrier_ids'] : null;

        $plan = $svc->calculateBestPlanAcrossCarriers(
            $items,
            $isES ? (int) $data['province_id'] : null,  // provincia para España
            $isES ? null : (int) $data['zone_id'],       // zona directa para otros países
            null,
            $allowSeparators,
            $carrierIds
        );

        return Inertia::render('Palletizer/Index', [
            'result' => [
                'country_code' => $data['country_code'],
                'destination'  => $destinationLabel,
                'province_id'  => $isES ? (int) $data['province_id'] : null,
                'zone_id'      => $isES ? null : (int) $data['zone_id'],
                'items'        => $items,
                'plan'         => $plan,
            ],
        ]);
    }
}