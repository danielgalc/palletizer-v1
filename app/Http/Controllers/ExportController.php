<?php

namespace App\Http\Controllers;

use App\Services\PalletizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\StreamedResponse;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;

use Barryvdh\DomPDF\Facade\Pdf;


class ExportController extends Controller
{
    public function bestPlan(Request $request, PalletizationService $service): StreamedResponse
    {

        $request->merge([
            'country_code' => strtoupper($request->input('country_code', 'ES')),
        ]);

        $v = Validator::make($request->all(), [
            'country_code'        => ['required', 'string', 'size:2', 'exists:countries,code'],
            'province_id'         => ['required_if:country_code,ES', 'nullable', 'integer'],
            'zone_id'             => ['required_unless:country_code,ES', 'nullable', 'integer', 'exists:zones,id'],
            'tower'               => ['nullable', 'integer', 'min:0'],
            'tower_sff'           => ['nullable', 'integer', 'min:0'],
            'laptop'              => ['nullable', 'integer', 'min:0'],
            'mini_pc'             => ['nullable', 'integer', 'min:0'],
            'allow_separators'    => ['boolean'],
            'pallet_mode'         => ['required', 'in:auto,manual'],
            'pallet_type_codes'   => ['array'],
            'pallet_type_codes.*' => ['string'],
            'carrier_mode'        => ['required', 'in:auto,manual'],
            'carrier_ids'         => ['nullable', 'array'],
            'carrier_ids.*'       => ['integer', 'exists:carriers,id'],
            'lines'               => ['nullable', 'array'],
            'lines.*.device_model_id' => ['nullable', 'integer', 'exists:device_models,id'],
            'lines.*.qty'         => ['nullable', 'integer', 'min:0'],
            'packaging'           => ['nullable', 'array'],
            'packaging.tower'     => ['nullable', 'integer', 'min:1', 'exists:box_variants,id'],
            'packaging.tower_sff' => ['nullable', 'integer', 'min:1', 'exists:box_variants,id'],
            'packaging.laptop'    => ['nullable', 'integer', 'min:1', 'exists:box_variants,id'],
            'packaging.mini_pc'   => ['nullable', 'integer', 'min:1', 'exists:box_variants,id'],
        ]);
        $v->validate();

        // 1) Resolver zona
        $zoneId = $this->resolveZoneId($request);

        // 2) Preparar items (lines tienen prioridad sobre contadores directos)
        $items = $this->buildItems($request);

        $allowSeparators = (bool)($request->allow_separators ?? true);

        $allowedTypes = null;
        if ($request->pallet_mode === 'manual') {
            $allowedTypes = $request->pallet_type_codes ?? [];
        }

        $carrierIds = null;
        if (($request->carrier_mode ?? 'auto') === 'manual') {
            $carrierIds = $request->carrier_ids ?? [];
        }

        // 3) Calcular
        $plan = $service->calculateBestPlanAcrossCarriers($zoneId, $items, $allowedTypes, $allowSeparators, $carrierIds);
        if (!empty($plan['error'])) {
            abort(422, $plan['error']);
        }

        $best = $plan['best'] ?? null;
        if (!$best) {
            abort(422, 'No hay plan óptimo');
        }

        // Normaliza datos base
        $bestPallets = is_array($best['pallets'] ?? null) ? $best['pallets'] : [];
        $metrics = is_array($best['metrics'] ?? null) ? $best['metrics'] : [];
        $warnings = is_array($best['warnings'] ?? null) ? $best['warnings'] : [];

        $total = (float)($best['total_price'] ?? 0);
        $count = (int)($best['pallet_count'] ?? 0);
        $avg = ($count > 0) ? ($total / $count) : 0;

        $isMixed = (bool)($metrics['mixed'] ?? false);
        $mixTypes = is_array($metrics['types'] ?? null) ? $metrics['types'] : [];
        $mixCosts = is_array($metrics['cost_breakdown'] ?? null) ? $metrics['cost_breakdown'] : [];

        $exportedAt = date('Y-m-d H:i');

        // 4) Crear Excel
        $spreadsheet = new Spreadsheet();

        // ======================
        // HOJA 1: RESUMEN
        // ======================
        $summary = $spreadsheet->getActiveSheet();
        $summary->setTitle('Resumen');

        $this->styleTitle($summary, 'A1', 'Palletizer · Plan óptimo de paletización');
        $summary->setCellValue('A2', 'Pulsia');
        $summary->getStyle('A2')->getFont()->setSize(11)->setBold(false)->getColor()->setRGB('6B7280');
        $summary->setCellValue('B2', "Generado: {$exportedAt}");
        $summary->getStyle('B2')->getFont()->getColor()->setRGB('6B7280');

        // Bloque info — etiquetas en negrita
        $row = 4;
        $infoStart = $row;
        $summary->setCellValue("A{$row}", 'Provincia');
        $summary->setCellValue("B{$row}", (string)($province->name ?? ''));
        $row++;

        $summary->setCellValue("A{$row}", 'Zona');
        $summary->setCellValue("B{$row}", $zoneId);
        $row++;

        $summary->setCellValue("A{$row}", 'Tipo de plan');
        $summary->setCellValue("B{$row}", $isMixed ? 'Mixto' : 'Mono');
        $row++;

        $summary->setCellValue("A{$row}", 'Pallets');
        $summary->setCellValue("B{$row}", $count);
        $row++;

        $summary->setCellValue("A{$row}", 'Total');
        $summary->setCellValue("B{$row}", $total);
        $this->moneyFormat($summary, "B{$row}:B{$row}");
        $row++;

        $summary->setCellValue("A{$row}", '€/pallet (promedio)');
        $summary->setCellValue("B{$row}", $avg);
        $this->moneyFormat($summary, "B{$row}:B{$row}");
        $row++;

        $summary->setCellValue("A{$row}", 'Descripción');
        $summary->setCellValue("B{$row}", (string)($best['pallet_type_name'] ?? ''));
        $infoEnd = $row;
        $row += 2;

        // Estilo del bloque info: etiquetas en gris oscuro y negrita
        for ($ir = $infoStart; $ir <= $infoEnd; $ir++) {
            $summary->getStyle("A{$ir}")->getFont()->setBold(true)->getColor()->setRGB('374151');
            $summary->getStyle("A{$ir}:B{$ir}")->getAlignment()
                ->setVertical(Alignment::VERTICAL_CENTER);
            // Fila alterna muy suave
            if (($ir - $infoStart) % 2 === 1) {
                $summary->getStyle("A{$ir}:B{$ir}")->getFill()
                    ->setFillType(Fill::FILL_SOLID)
                    ->getStartColor()->setRGB('F8F9FB');
            }
        }

        // Desglose mixto
        if ($isMixed && !empty($mixTypes)) {
            $summary->setCellValue("A{$row}", 'Desglose (plan mixto)');
            $summary->getStyle("A{$row}")->getFont()->setBold(true);
            $row++;

            $summary->fromArray(['Tipo', 'Pallets', 'Coste'], null, "A{$row}");
            $this->styleHeaderRow($summary, "A{$row}:C{$row}");
            $row++;

            $start = $row;
            foreach ($mixTypes as $code => $palletCountByType) {
                $summary->setCellValue("A{$row}", (string)$code);
                $summary->setCellValue("B{$row}", (int)$palletCountByType);
                $summary->setCellValue("C{$row}", (float)($mixCosts[$code] ?? 0));
                $row++;
            }
            $end = $row - 1;

            if ($end >= $start) {
                $this->moneyFormat($summary, "C{$start}:C{$end}");
                $this->setAutoFilterAndFreeze($summary, "A" . ($start - 1) . ":C{$end}", "A3");
            }
            $row += 1;
        }

        // Avisos
        if (!empty($warnings)) {
            $summary->setCellValue("A{$row}", 'Avisos');
            $summary->getStyle("A{$row}")->getFont()->setBold(true);
            $row++;

            $summary->fromArray(['Severidad', 'Mensaje'], null, "A{$row}");
            $this->styleHeaderRow($summary, "A{$row}:B{$row}");
            $row++;

            $start = $row;
            foreach ($warnings as $w) {
                $summary->setCellValue("A{$row}", (string)($w['severity'] ?? ''));
                $summary->setCellValue("B{$row}", (string)($w['message'] ?? ''));
                $row++;
            }
            $end = $row - 1;

            if ($end >= $start) {
                $this->setAutoFilterAndFreeze($summary, "A" . ($start - 1) . ":B{$end}", "A3");
            }
        }

        $this->autosizeColumns($summary, ['A', 'B', 'C']);
        $summary->getColumnDimension('A')->setWidth(24);
        $summary->getColumnDimension('B')->setWidth(60);

        // ======================
        // HOJA 2: PALLETS
        // ======================
        $palletSheet = $spreadsheet->createSheet();
        $palletSheet->setTitle('Pallets');

        $this->styleTitle($palletSheet, 'A1', 'Pallets · Detalle por pallet');
        $palletSheet->setCellValue('A2', "Generado: {$exportedAt}");
        $palletSheet->getStyle('A2')->getFont()->getColor()->setRGB('6B7280');

        $headers = ['#', 'Torres MT', 'Torres SFF', 'Portátiles', 'Mini PCs', 'Sep. mezcla', 'Sep. seguridad', 'Altura libre (cm)', 'Peso libre (kg)', 'Capas'];
        $palletSheet->fromArray($headers, null, 'A3');
        $this->styleHeaderRow($palletSheet, 'A3:J3');
        $this->setAutoFilterAndFreeze($palletSheet, 'A3:J3', 'A4');

        $r = 4;
        $totals = ['tower' => 0, 'tower_sff' => 0, 'laptop' => 0, 'mini_pc' => 0, 'mixSeps' => 0, 'secSeps' => 0, 'layers' => 0];

        foreach ($bestPallets as $i => $p) {
            $layers  = is_array($p['layers'] ?? null) ? $p['layers'] : [];
            $boxes   = is_array($p['boxes']  ?? null) ? $p['boxes']  : [];

            $secSeps    = count(array_filter($layers, fn($l) => !empty($l['security_separator'])));
            $mixSeps    = count(array_filter($layers, fn($l) => !empty($l['separator']) && empty($l['security_separator'])));
            $realLayers = count(array_filter($layers, fn($l) => empty($l['security_separator'])));

            $heightLeft = (int)($p['remaining_capacity']['height_cm_left']
                ?? (($p['height_cm'] ?? 0) > 0 ? 0 : ''));
            $weightLeft = (float)($p['remaining_capacity']['weight_kg_left'] ?? 0);

            $palletSheet->setCellValue("A{$r}", $i + 1);
            $palletSheet->setCellValue("B{$r}", (int)($boxes['tower']     ?? 0));
            $palletSheet->setCellValue("C{$r}", (int)($boxes['tower_sff'] ?? 0));
            $palletSheet->setCellValue("D{$r}", (int)($boxes['laptop']    ?? 0));
            $palletSheet->setCellValue("E{$r}", (int)($boxes['mini_pc']   ?? 0));
            $palletSheet->setCellValue("F{$r}", $mixSeps);
            $palletSheet->setCellValue("G{$r}", $secSeps);
            $palletSheet->setCellValue("H{$r}", $heightLeft);
            $palletSheet->setCellValue("I{$r}", $weightLeft);
            $palletSheet->setCellValue("J{$r}", $realLayers);

            // Fila alterna: gris muy claro en filas pares (i es 0-based)
            if ($i % 2 === 1) {
                $palletSheet->getStyle("A{$r}:J{$r}")->getFill()
                    ->setFillType(Fill::FILL_SOLID)
                    ->getStartColor()->setRGB('F8F9FB');
            }

            // Acumular totales
            $totals['tower']     += (int)($boxes['tower']     ?? 0);
            $totals['tower_sff'] += (int)($boxes['tower_sff'] ?? 0);
            $totals['laptop']    += (int)($boxes['laptop']    ?? 0);
            $totals['mini_pc']   += (int)($boxes['mini_pc']   ?? 0);
            $totals['mixSeps']   += $mixSeps;
            $totals['secSeps']   += $secSeps;
            $totals['layers']    += $realLayers;

            $r++;
        }

        // Fila de totales
        if ($r > 4) {
            $this->num2Format($palletSheet, "I4:I" . ($r - 1), 'kg');

            $palletSheet->setCellValue("A{$r}", 'TOTAL');
            $palletSheet->setCellValue("B{$r}", $totals['tower']);
            $palletSheet->setCellValue("C{$r}", $totals['tower_sff']);
            $palletSheet->setCellValue("D{$r}", $totals['laptop']);
            $palletSheet->setCellValue("E{$r}", $totals['mini_pc']);
            $palletSheet->setCellValue("F{$r}", $totals['mixSeps']);
            $palletSheet->setCellValue("G{$r}", $totals['secSeps']);
            $palletSheet->setCellValue("J{$r}", $totals['layers']);

            $palletSheet->getStyle("A{$r}:J{$r}")->applyFromArray([
                'font' => ['bold' => true],
                'fill' => [
                    'fillType'   => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'F3F5F9'],
                ],
                'borders' => [
                    'top' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'D6DCE7']],
                ],
            ]);
        }

        // Anchos afinados para la hoja Pallets
        $palletSheet->getColumnDimension('A')->setWidth(8);   // #
        $palletSheet->getColumnDimension('B')->setWidth(11);  // Torres MT
        $palletSheet->getColumnDimension('C')->setWidth(11);  // Torres SFF
        $palletSheet->getColumnDimension('D')->setWidth(11);  // Portátiles
        $palletSheet->getColumnDimension('E')->setWidth(10);  // Mini PCs
        $palletSheet->getColumnDimension('F')->setWidth(13);  // Sep. mezcla
        $palletSheet->getColumnDimension('G')->setWidth(15);  // Sep. seguridad
        $palletSheet->getColumnDimension('H')->setWidth(17);  // Altura libre
        $palletSheet->getColumnDimension('I')->setWidth(15);  // Peso libre
        $palletSheet->getColumnDimension('J')->setWidth(8);   // Capas

        // ======================
        // HOJA 3: CAPAS
        // ======================
        $layerSheet = $spreadsheet->createSheet();
        $layerSheet->setTitle('Capas');

        $this->styleTitle($layerSheet, 'A1', 'Capas · Detalle por capa');
        $layerSheet->setCellValue('A2', "Generado: {$exportedAt}");
        $layerSheet->getStyle('A2')->getFont()->getColor()->setRGB('6B7280');

        $headers = ['Pallet #', 'Capa #', 'Tipo', 'Torres MT', 'Torres SFF', 'Portátiles', 'Mini PCs', 'Vertical', 'Altura (cm)', 'Peso (kg)', 'Sep. mezcla', 'Sep. seguridad'];
        $layerSheet->fromArray($headers, null, 'A3');
        $this->styleHeaderRow($layerSheet, 'A3:L3');
        $this->setAutoFilterAndFreeze($layerSheet, 'A3:L3', 'A4');

        $r = 4;
        $layerNum    = 0;
        $dataRowNum  = 0; // contador solo de filas de datos (no separadores) para alternar color

        foreach ($bestPallets as $pi => $p) {
            $layers = is_array($p['layers'] ?? null) ? $p['layers'] : [];
            $layerNum = 0;
            foreach ($layers as $layer) {
                // Separador de seguridad: fila especial en amarillo
                if (!empty($layer['security_separator'])) {
                    $layerSheet->setCellValue("A{$r}", $pi + 1);
                    $layerSheet->setCellValue("B{$r}", '—');
                    $layerSheet->setCellValue("C{$r}", 'Separador de seguridad');
                    $layerSheet->getStyle("A{$r}:L{$r}")->getFont()->setItalic(true);
                    $layerSheet->getStyle("A{$r}:L{$r}")->getFill()
                        ->setFillType(Fill::FILL_SOLID)
                        ->getStartColor()->setRGB('FEF9C3');
                    $r++;
                    continue;
                }

                $layerNum++;
                $dataRowNum++;

                $counts = $this->layerCounts($layer);

                $vertTotal = 0;
                foreach (($layer['vertical'] ?? []) as $v) {
                    $vertTotal += (int)($v['count'] ?? 0);
                }

                $typeLabels = ['tower' => 'Torre MT', 'tower_sff' => 'Torre SFF', 'laptop' => 'Portátil', 'mini_pc' => 'Mini PC'];
                $baseLabel  = $typeLabels[$layer['type'] ?? ''] ?? ($layer['type'] ?? '—');

                $layerSheet->setCellValue("A{$r}", $pi + 1);
                $layerSheet->setCellValue("B{$r}", $layerNum);
                $layerSheet->setCellValue("C{$r}", $baseLabel);
                $layerSheet->setCellValue("D{$r}", (int)($counts['tower']     ?? 0));
                $layerSheet->setCellValue("E{$r}", (int)($counts['tower_sff'] ?? 0));
                $layerSheet->setCellValue("F{$r}", (int)($counts['laptop']    ?? 0));
                $layerSheet->setCellValue("G{$r}", (int)($counts['mini_pc']   ?? 0));
                $layerSheet->setCellValue("H{$r}", $vertTotal > 0 ? $vertTotal : '');
                $layerSheet->setCellValue("I{$r}", (int)($layer['height_cm']  ?? 0));
                $layerSheet->setCellValue("J{$r}", (float)($layer['weight_kg'] ?? 0));
                $layerSheet->setCellValue("K{$r}", !empty($layer['separator']) ? 'Sí' : 'No');
                $layerSheet->setCellValue("L{$r}", 'No');

                // Filas alternas en gris muy claro (solo en filas de datos, no separadores)
                if ($dataRowNum % 2 === 0) {
                    $layerSheet->getStyle("A{$r}:L{$r}")->getFill()
                        ->setFillType(Fill::FILL_SOLID)
                        ->getStartColor()->setRGB('F8F9FB');
                }

                $r++;
            }
        }

        if ($r > 4) {
            $this->num2Format($layerSheet, "J4:J" . ($r - 1), 'kg');
        }

        // Anchos afinados para la hoja Capas
        $layerSheet->getColumnDimension('A')->setWidth(10);   // Pallet #
        $layerSheet->getColumnDimension('B')->setWidth(8);    // Capa #
        $layerSheet->getColumnDimension('C')->setWidth(14);   // Tipo
        $layerSheet->getColumnDimension('D')->setWidth(11);   // Torres MT
        $layerSheet->getColumnDimension('E')->setWidth(11);   // Torres SFF
        $layerSheet->getColumnDimension('F')->setWidth(11);   // Portátiles
        $layerSheet->getColumnDimension('G')->setWidth(10);   // Mini PCs
        $layerSheet->getColumnDimension('H')->setWidth(9);    // Vertical
        $layerSheet->getColumnDimension('I')->setWidth(12);   // Altura
        $layerSheet->getColumnDimension('J')->setWidth(11);   // Peso
        $layerSheet->getColumnDimension('K')->setWidth(12);   // Sep. mezcla
        $layerSheet->getColumnDimension('L')->setWidth(15);   // Sep. seguridad

        // ======================
        // HOJA 4: MODELOS
        // ======================
        $modelLines = $this->resolveModelLines($request);

        if (!empty($modelLines)) {
            $modelSheet = $spreadsheet->createSheet();
            $modelSheet->setTitle('Modelos');

            $this->styleTitle($modelSheet, 'A1', 'Modelos · Dispositivos incluidos en el envío');
            $modelSheet->setCellValue('A2', "Generado: {$exportedAt}");
            $modelSheet->getStyle('A2')->getFont()->getColor()->setRGB('6B7280');

            $modelSheet->fromArray(['Marca', 'Modelo', 'Tipo de caja', 'Uds.'], null, 'A3');
            $this->styleHeaderRow($modelSheet, 'A3:D3');
            $this->setAutoFilterAndFreeze($modelSheet, 'A3:D3', 'A4');

            $r = 4;
            foreach ($modelLines as $m) {
                $modelSheet->setCellValue("A{$r}", $m['brand']);
                $modelSheet->setCellValue("B{$r}", $m['name']);
                $modelSheet->setCellValue("C{$r}", $m['box_type']);
                $modelSheet->setCellValue("D{$r}", $m['qty']);
                $r++;
            }

            $this->autosizeColumns($modelSheet, ['A', 'B', 'C', 'D']);
        }

        // Volver a Resumen por defecto
        $spreadsheet->setActiveSheetIndex(0);

        $filename = 'best_plan_' . date('Y-m-d_H-i') . '.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function bestPlanPdf(Request $request, PalletizationService $service)
    {
        $request->merge([
            'country_code' => strtoupper($request->input('country_code', 'ES')),
        ]);

        $v = Validator::make($request->all(), [
            'country_code'        => ['required', 'string', 'size:2', 'exists:countries,code'],
            'province_id'         => ['required_if:country_code,ES', 'nullable', 'integer'],
            'zone_id'             => ['required_unless:country_code,ES', 'nullable', 'integer', 'exists:zones,id'],
            'tower'               => ['nullable', 'integer', 'min:0'],
            'tower_sff'           => ['nullable', 'integer', 'min:0'],
            'laptop'              => ['nullable', 'integer', 'min:0'],
            'mini_pc'             => ['nullable', 'integer', 'min:0'],
            'allow_separators'    => ['boolean'],
            'pallet_mode'         => ['required', 'in:auto,manual'],
            'pallet_type_codes'   => ['array'],
            'pallet_type_codes.*' => ['string'],
            'carrier_mode'        => ['required', 'in:auto,manual'],
            'carrier_ids'         => ['nullable', 'array'],
            'carrier_ids.*'       => ['integer', 'exists:carriers,id'],
            'lines'               => ['nullable', 'array'],
            'lines.*.device_model_id' => ['nullable', 'integer', 'exists:device_models,id'],
            'lines.*.qty'         => ['nullable', 'integer', 'min:0'],
            'packaging'           => ['nullable', 'array'],
            'packaging.tower'     => ['nullable', 'integer', 'min:1', 'exists:box_variants,id'],
            'packaging.tower_sff' => ['nullable', 'integer', 'min:1', 'exists:box_variants,id'],
            'packaging.laptop'    => ['nullable', 'integer', 'min:1', 'exists:box_variants,id'],
            'packaging.mini_pc'   => ['nullable', 'integer', 'min:1', 'exists:box_variants,id'],
        ]);
        $v->validate();

        $zoneId = $this->resolveZoneId($request);
        $items  = $this->buildItems($request);

        $allowSeparators = (bool)($request->allow_separators ?? true);

        $allowedTypes = null;
        if ($request->pallet_mode === 'manual') {
            $allowedTypes = $request->pallet_type_codes ?? [];
        }

        $carrierIds = null;
        if (($request->carrier_mode ?? 'auto') === 'manual') {
            $carrierIds = $request->carrier_ids ?? [];
        }

        $plan = $service->calculateBestPlanAcrossCarriers($zoneId, $items, $allowedTypes, $allowSeparators, $carrierIds);
        if (!empty($plan['error'])) abort(422, $plan['error']);

        $best = $plan['best'] ?? null;
        if (!$best) abort(422, 'No hay plan óptimo');

        $total = (float)($best['total_price'] ?? 0);
        $count = (int)($best['pallet_count'] ?? 0);
        $avg   = ($count > 0) ? ($total / $count) : 0;

        $province = DB::table('provinces')->where('id', $request->province_id)->first();

        $meta = [
            'company'      => 'Pulsia',
            'province'     => (string)($province->name ?? ''),
            'zone_id'      => $zoneId,
            'generated_at' => now()->format('Y-m-d H:i'),
        ];

        $pdf = Pdf::loadView('exports.best_plan', [
            'best'        => $best,
            'avg'         => $avg,
            'meta'        => $meta,
            'modelLines'  => $this->resolveModelLines($request),
        ])->setPaper('a4', 'portrait');

        $filename = 'best_plan_' . date('Y-m-d_H-i') . '.pdf';
        return $pdf->download($filename);
    }

    // ======================
    // Helpers internos
    // ======================

    private function resolveZoneId(Request $request): int
    {
        if ($request->country_code !== 'ES') {
            $zoneId = (int)($request->zone_id ?? 0);
            if ($zoneId <= 0) abort(422, 'zone_id inválido');
            return $zoneId;
        }

        $province = DB::table('provinces')->where('id', $request->province_id)->first();
        if (!$province) abort(422, 'Provincia no encontrada');

        $zoneId = (int)($province->zone_id ?? 0);
        if ($zoneId <= 0) abort(422, 'La provincia no tiene zone_id válido');

        return $zoneId;
    }

    private function buildItems(Request $request): array
    {
        $items = [
            'tower'     => (int)($request->tower     ?? 0),
            'tower_sff' => (int)($request->tower_sff ?? 0),
            'laptop'    => (int)($request->laptop    ?? 0),
            'mini_pc'   => (int)($request->mini_pc   ?? 0),
        ];

        // Lines de modelos (tienen prioridad sobre los contadores directos)
        if (!empty($request->lines) && is_array($request->lines)) {
            $items['lines'] = $request->lines;
        }

        // Selección de variantes de embalaje
        if (!empty($request->packaging) && is_array($request->packaging)) {
            $items['packaging'] = $request->packaging;
        }

        return $items;
    }

    /**
     * Calcula el conteo de cajas por tipo en una capa, equivalente a getLayerCounts del frontend.
     * Formato nuevo: {type, count, mixed:[{type,count}], vertical:[{type,count}]}
     */
    private function layerCounts(array $layer): array
    {
        $counts = ['tower' => 0, 'tower_sff' => 0, 'laptop' => 0, 'mini_pc' => 0];

        $t = $layer['type'] ?? null;
        $c = (int)($layer['count'] ?? 0);
        if ($t && array_key_exists($t, $counts)) {
            $counts[$t] += $c;
        }

        foreach (($layer['mixed'] ?? []) as $m) {
            $mt = $m['type'] ?? null;
            $mc = (int)($m['count'] ?? 0);
            if ($mt && array_key_exists($mt, $counts)) {
                $counts[$mt] += $mc;
            }
        }

        // Las verticales van en columna separada, NO se suman aquí al horizontal
        return $counts;
    }

    /**
     * Resuelve los modelos del request (lines) en filas con brand, name, box_type y qty.
     * Devuelve array vacío si no hay lines.
     * [['brand'=>..., 'name'=>..., 'box_type'=>..., 'qty'=>...], ...]
     */
    private function resolveModelLines(Request $request): array
    {
        $lines = $request->lines ?? [];
        if (empty($lines) || !is_array($lines)) return [];

        $modelQty = [];
        foreach ($lines as $line) {
            $id  = (int)($line['device_model_id'] ?? 0);
            $qty = (int)($line['qty'] ?? 0);
            if ($id > 0 && $qty > 0) {
                $modelQty[$id] = ($modelQty[$id] ?? 0) + $qty;
            }
        }

        if (empty($modelQty)) return [];

        $rows = DB::table('device_models as dm')
            ->join('box_types as bt', 'bt.id', '=', 'dm.box_type_id')
            ->whereIn('dm.id', array_keys($modelQty))
            ->select(['dm.id', 'dm.brand', 'dm.name', 'bt.name as box_type_name'])
            ->get();

        $result = [];
        foreach ($rows as $row) {
            $result[] = [
                'brand'     => (string)($row->brand          ?? ''),
                'name'      => (string)($row->name           ?? ''),
                'box_type'  => (string)($row->box_type_name  ?? ''),
                'qty'       => (int)($modelQty[$row->id]     ?? 0),
            ];
        }

        // Ordenar por tipo de caja, luego marca, luego nombre
        usort($result, fn($a, $b) =>
            [$a['box_type'], $a['brand'], $a['name']] <=> [$b['box_type'], $b['brand'], $b['name']]
        );

        return $result;
    }

    // ======================
    // Helpers de estilo
    // ======================

    private function styleTitle($sheet, string $cell, string $text): void
    {
        $sheet->setCellValue($cell, $text);
        $sheet->getStyle($cell)->applyFromArray([
            'font' => ['bold' => true, 'size' => 16],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT],
        ]);
    }

    private function styleHeaderRow($sheet, string $range): void
    {
        $sheet->getStyle($range)->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => '0B1220']], // ink-900
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'F3F5F9'], // ink-50
            ],
            'borders' => [
                'bottom' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'D6DCE7']],
            ],
            'alignment' => [
                'vertical' => Alignment::VERTICAL_CENTER,
                'horizontal' => Alignment::HORIZONTAL_LEFT,
            ],
        ]);
    }

    private function setAutoFilterAndFreeze($sheet, string $filterRange, string $freezeCell = 'A2'): void
    {
        $sheet->setAutoFilter($filterRange);
        $sheet->freezePane($freezeCell);
    }

    private function autosizeColumns($sheet, array $cols): void
    {
        foreach ($cols as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
    }

    private function moneyFormat($sheet, string $range): void
    {
        $sheet->getStyle($range)->getNumberFormat()->setFormatCode('#,##0.00" €"');
    }

    private function num2Format($sheet, string $range, string $suffix = ''): void
    {
        $fmt = $suffix ? '#,##0.00" ' . $suffix . '"' : '#,##0.00';
        $sheet->getStyle($range)->getNumberFormat()->setFormatCode($fmt);
    }
}