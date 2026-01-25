<?php

namespace App\Exports\Sheets;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithTitle;

class BestPlanLayersSheet implements FromArray, WithTitle
{
    public function __construct(private array $data) {}

    public function title(): string
    {
        return 'Capas';
    }

    public function array(): array
    {
        $best = $this->data['best'] ?? [];
        $pallets = $best['pallets'] ?? [];

        $rows = [
            ['Pallet #', 'Capa #', 'Base', 'Torres', 'Portátiles', 'Minis', 'Altura (cm)', 'Peso (kg)', 'Separador', 'Huecos'],
        ];

        foreach ($pallets as $pi => $p) {
            $layers = $p['layers'] ?? [];
            foreach ($layers as $li => $layer) {
                $rows[] = [
                    $pi + 1,
                    $li + 1,
                    $layer['base_type'] ?? '',
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

        return $rows;
    }
}
