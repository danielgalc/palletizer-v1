<?php

namespace App\Exports\Sheets;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithTitle;

class BestPlanSummarySheet implements FromArray, WithTitle
{
    public function __construct(private array $data) {}

    public function title(): string
    {
        return 'Resumen';
    }

    public function array(): array
    {
        $best = $this->data['best'] ?? [];
        $items = $this->data['request_items'] ?? [];

        $palletCount = (int)($best['pallet_count'] ?? 0);
        $total = (float)($best['total_price'] ?? 0);

        $avg = ($palletCount > 0) ? ($total / $palletCount) : null;

        return [
            ['Destino', $this->data['province'] ?? '—'],
            ['Zona', $this->data['zone_id'] ?? '—'],
            [''],
            ['Pedido - Torres', $items['tower'] ?? 0],
            ['Pedido - Portátiles', $items['laptop'] ?? 0],
            ['Pedido - Minis', $items['mini_pc'] ?? 0],
            [''],
            ['Plan óptimo', $best['pallet_type_name'] ?? '—'],
            ['Número de pallets', $palletCount],
            ['Coste total (€)', round($total, 2)],
            ['€/pallet (promedio)', $avg !== null ? round($avg, 2) : '—'],
        ];
    }
}
