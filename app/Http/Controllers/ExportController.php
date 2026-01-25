<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\StreamedResponse;
use App\Services\PalletizationService;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ExportController extends Controller
{
    public function bestPlan(Request $request, PalletizationService $service): StreamedResponse
    {
        $v = Validator::make($request->all(), [
            'province_id' => ['required','integer'],
            'tower' => ['nullable','integer','min:0'],
            'laptop' => ['nullable','integer','min:0'],
            'mini_pc' => ['nullable','integer','min:0'],
            'allow_separators' => ['boolean'],
            'pallet_mode' => ['required','in:auto,manual'],
            'pallet_type_codes' => ['array'],
            'pallet_type_codes.*' => ['string'],
        ]);

        $v->validate();

        // 1) Resolver zona desde province_id (ajusta al nombre real de tus tablas/campos)
        $province = \DB::table('provinces')->where('id', $request->province_id)->first();
        if (!$province) {
            abort(422, 'Provincia no encontrada');
        }
        $zoneId = (int)($province->zone_id ?? 0);
        if ($zoneId <= 0) {
            abort(422, 'La provincia no tiene zone_id válido');
        }

        // 2) Preparar items
        $items = [
            'tower' => (int)($request->tower ?? 0),
            'laptop' => (int)($request->laptop ?? 0),
            'mini_pc' => (int)($request->mini_pc ?? 0),
        ];

        $allowSeparators = (bool)($request->allow_separators ?? true);

        $allowedTypes = null;
        if ($request->pallet_mode === 'manual') {
            $allowedTypes = $request->pallet_type_codes ?? [];
        }

        // 3) Calcular
        $plan = $service->calculateBestPlan($zoneId, $items, $allowedTypes, $allowSeparators);
        if (!empty($plan['error'])) {
            abort(422, $plan['error']);
        }

        $best = $plan['best'] ?? null;
        if (!$best) {
            abort(422, 'No hay plan óptimo');
        }

        // 4) Crear Excel
        $spreadsheet = new Spreadsheet();

        // Hoja 1: Resumen
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Resumen');

        $total = (float)($best['total_price'] ?? 0);
        $count = (int)($best['pallet_count'] ?? 0);
        $avg = ($count > 0) ? ($total / $count) : 0;

        $sheet->fromArray([
            ['Campo', 'Valor'],
            ['Tipo de plan', ($best['metrics']['mixed'] ?? false) ? 'Mixto' : 'Mono'],
            ['Pallets', $count],
            ['Total', $total],
            ['€/pallet (promedio)', $avg],
            ['Descripción', (string)($best['pallet_type_name'] ?? '')],
        ], null, 'A1');

        // Hoja 2: Pallets
        $spreadsheet->createSheet();
        $palletSheet = $spreadsheet->setActiveSheetIndex(1);
        $palletSheet->setTitle('Pallets');
        $palletSheet->fromArray([['#', 'Torres', 'Portátiles', 'Mini PCs', 'Separadores', 'Altura libre', 'Peso libre']], null, 'A1');

        $rows = [];
        foreach (($best['pallets'] ?? []) as $i => $p) {
            $rows[] = [
                $i + 1,
                (int)($p['tower'] ?? 0),
                (int)($p['laptop'] ?? 0),
                (int)($p['mini_pc'] ?? 0),
                (int)($p['separators_used'] ?? 0),
                $p['remaining_capacity']['height_cm_left'] ?? null,
                $p['remaining_capacity']['weight_kg_left'] ?? null,
            ];
        }
        if ($rows) $palletSheet->fromArray($rows, null, 'A2');

        // Hoja 3: Capas
        $spreadsheet->createSheet();
        $layerSheet = $spreadsheet->setActiveSheetIndex(2);
        $layerSheet->setTitle('Capas');
        $layerSheet->fromArray([['Pallet #', 'Capa #', 'Base', 'Torres', 'Portátiles', 'Mini PCs', 'Altura', 'Peso', 'Separador', 'Huecos']], null, 'A1');

        $layerRows = [];
        foreach (($best['pallets'] ?? []) as $pi => $p) {
            foreach (($p['layers'] ?? []) as $li => $layer) {
                $layerRows[] = [
                    $pi + 1,
                    $li + 1,
                    (string)($layer['base_type'] ?? ''),
                    (int)($layer['counts']['tower'] ?? 0),
                    (int)($layer['counts']['laptop'] ?? 0),
                    (int)($layer['counts']['mini_pc'] ?? 0),
                    $layer['height_cm'] ?? null,
                    $layer['weight_kg'] ?? null,
                    !empty($layer['needs_separator']) ? 'Sí' : 'No',
                    (int)($layer['slots_empty'] ?? 0),
                ];
            }
        }
        if ($layerRows) $layerSheet->fromArray($layerRows, null, 'A2');

        // Volver a la hoja Resumen por defecto
        $spreadsheet->setActiveSheetIndex(0);

        $filename = 'best_plan_' . date('Y-m-d_H-i') . '.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
