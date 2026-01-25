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

        // 1) Resolver zona desde province_id
        $province = DB::table('provinces')->where('id', $request->province_id)->first();
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

        $this->styleTitle($summary, 'A1', 'Palletizer · Export plan óptimo');
        $summary->setCellValue('A2', "Generado: {$exportedAt}");

        // Bloque info
        $row = 4;
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
        $row += 2;

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
                $this->setAutoFilterAndFreeze($summary, "A".($start - 1).":C{$end}", "A3");
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
                $this->setAutoFilterAndFreeze($summary, "A".($start - 1).":B{$end}", "A3");
            }
        }

        $this->autosizeColumns($summary, ['A','B','C']);
        $summary->getColumnDimension('A')->setWidth(24);
        $summary->getColumnDimension('B')->setWidth(60);

        // ======================
        // HOJA 2: PALLETS
        // ======================
        $palletSheet = $spreadsheet->createSheet();
        $palletSheet->setTitle('Pallets');

        $this->styleTitle($palletSheet, 'A1', 'Detalle por pallet');

        $headers = ['#', 'Torres', 'Portátiles', 'Mini PCs', 'Separadores', 'Altura libre (cm)', 'Peso libre (kg)', 'Capas'];
        $palletSheet->fromArray($headers, null, 'A3');
        $this->styleHeaderRow($palletSheet, 'A3:H3');
        $this->setAutoFilterAndFreeze($palletSheet, 'A3:H3', 'A4');

        $r = 4;
        foreach ($bestPallets as $i => $p) {
            $layers = is_array($p['layers'] ?? null) ? $p['layers'] : [];
            $palletSheet->setCellValue("A{$r}", $i + 1);
            $palletSheet->setCellValue("B{$r}", (int)($p['tower'] ?? 0));
            $palletSheet->setCellValue("C{$r}", (int)($p['laptop'] ?? 0));
            $palletSheet->setCellValue("D{$r}", (int)($p['mini_pc'] ?? 0));
            $palletSheet->setCellValue("E{$r}", (int)($p['separators_used'] ?? 0));
            $palletSheet->setCellValue("F{$r}", (int)($p['remaining_capacity']['height_cm_left'] ?? 0));
            $palletSheet->setCellValue("G{$r}", (float)($p['remaining_capacity']['weight_kg_left'] ?? 0));
            $palletSheet->setCellValue("H{$r}", count($layers));
            $r++;
        }

        if ($r > 4) {
            $this->num2Format($palletSheet, "G4:G".($r - 1), 'kg');
        }

        $this->autosizeColumns($palletSheet, ['A','B','C','D','E','F','G','H']);

        // ======================
        // HOJA 3: CAPAS
        // ======================
        $layerSheet = $spreadsheet->createSheet();
        $layerSheet->setTitle('Capas');

        $this->styleTitle($layerSheet, 'A1', 'Detalle por capa');

        $headers = ['Pallet #', 'Capa #', 'Base', 'Torres', 'Portátiles', 'Mini PCs', 'Altura (cm)', 'Peso (kg)', 'Huecos', 'Separador'];
        $layerSheet->fromArray($headers, null, 'A3');
        $this->styleHeaderRow($layerSheet, 'A3:J3');
        $this->setAutoFilterAndFreeze($layerSheet, 'A3:J3', 'A4');

        $r = 4;
        foreach ($bestPallets as $pi => $p) {
            $layers = is_array($p['layers'] ?? null) ? $p['layers'] : [];
            foreach ($layers as $li => $layer) {
                $counts = is_array($layer['counts'] ?? null) ? $layer['counts'] : [];
                $layerSheet->setCellValue("A{$r}", $pi + 1);
                $layerSheet->setCellValue("B{$r}", $li + 1);
                $layerSheet->setCellValue("C{$r}", (string)($layer['base_type'] ?? ''));
                $layerSheet->setCellValue("D{$r}", (int)($counts['tower'] ?? 0));
                $layerSheet->setCellValue("E{$r}", (int)($counts['laptop'] ?? 0));
                $layerSheet->setCellValue("F{$r}", (int)($counts['mini_pc'] ?? 0));
                $layerSheet->setCellValue("G{$r}", (int)($layer['height_cm'] ?? 0));
                $layerSheet->setCellValue("H{$r}", (float)($layer['weight_kg'] ?? 0));
                $layerSheet->setCellValue("I{$r}", (int)($layer['slots_empty'] ?? 0));
                $layerSheet->setCellValue("J{$r}", !empty($layer['needs_separator']) ? 'Sí' : 'No');
                $r++;
            }
        }

        if ($r > 4) {
            $this->num2Format($layerSheet, "H4:H".($r - 1), 'kg');
        }

        $this->autosizeColumns($layerSheet, ['A','B','C','D','E','F','G','H','I','J']);

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
        $fmt = $suffix ? '#,##0.00" '.$suffix.'"' : '#,##0.00';
        $sheet->getStyle($range)->getNumberFormat()->setFormatCode($fmt);
    }
}
