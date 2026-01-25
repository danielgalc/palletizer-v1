<?php

namespace App\Exports\Sheets;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithTitle;

class BestPlanPalletsSheet implements FromArray, WithTitle
{
    public function __construct(private array $data) {}

    public function title(): string
    {
        return 'Pallets';
    }

    public function array(): array
    {
        $best = $this->data['best'] ?? [];
        $pallets = $best['pallets'] ?? [];

        $rows = [
            ['#', 'Torres', 'Portátiles', 'Minis', 'Separadores', 'Altura libre (cm)', 'Peso libre (kg)'],
        ];

        foreach ($pallets as $i => $p) {
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

        return $rows;
    }
}
