<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class BestPlanExport implements WithMultipleSheets
{
    public function __construct(private array $data) {}

    public function sheets(): array
    {
        return [
            new Sheets\BestPlanSummarySheet($this->data),
            new Sheets\BestPlanPalletsSheet($this->data),
            new Sheets\BestPlanLayersSheet($this->data),
        ];
    }
}
