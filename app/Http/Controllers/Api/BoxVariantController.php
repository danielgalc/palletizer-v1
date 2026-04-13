<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BoxVariantController extends Controller
{
    public function index(Request $request)
    {
        $query = DB::table('box_variants as v')
            ->join('box_providers as p', 'p.id', '=', 'v.provider_id')
            ->orderBy('v.kind')
            ->orderBy('v.condition')
            ->orderBy('p.name')
            ->select(
                'v.id', 'v.kind', 'v.condition', 'v.length_cm', 'v.width_cm', 'v.height_cm',
                'v.unit_cost_eur', 'v.on_hand_qty', 'v.is_active',
                'v.provider_id', 'p.name as provider_name'
            );

        if ($request->boolean('only_active')) {
            $query->where('v.is_active', true);
        }

        return $query->get();
    }

    public function updateStock(Request $request, int $id)
    {
        $data = $request->validate([
            'on_hand_qty' => ['required', 'integer', 'min:0'],
        ]);

        DB::table('box_variants')->where('id', $id)->update([
            'on_hand_qty' => $data['on_hand_qty'],
            'updated_at'  => now(),
        ]);

        return DB::table('box_variants as v')
            ->join('box_providers as p', 'p.id', '=', 'v.provider_id')
            ->where('v.id', $id)
            ->select(
                'v.id', 'v.kind', 'v.condition', 'v.length_cm', 'v.width_cm', 'v.height_cm',
                'v.unit_cost_eur', 'v.on_hand_qty', 'v.is_active',
                'v.provider_id', 'p.name as provider_name'
            )
            ->first();
    }
}
