<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class BoxVariantController extends Controller
{
    public function index(Request $request)
    {
        $onlyActive = $request->boolean('only_active', false);
        $kind = $request->query('kind');           // laptop|tower|mini_pc
        $condition = $request->query('condition'); // reused|new
        $providerId = $request->query('provider_id');

        $q = DB::table('box_variants as bv')
            ->join('box_providers as bp', 'bp.id', '=', 'bv.provider_id')
            ->leftJoin('box_variant_stocks as bvs', 'bvs.box_variant_id', '=', 'bv.id')
            ->select([
                'bv.id',
                'bv.kind',
                'bv.condition',
                'bv.provider_id',
                'bp.name as provider_name',
                'bp.provider_type',
                'bv.length_cm',
                'bv.width_cm',
                'bv.height_cm',
                'bv.unit_cost_eur',
                'bv.is_active',
                DB::raw('COALESCE(bvs.on_hand_qty, 0) as on_hand_qty'),
                'bv.updated_at',
            ])
            ->orderBy('bv.kind')
            ->orderBy('bv.condition')
            ->orderBy('bp.name');

        if ($onlyActive) $q->where('bv.is_active', true);
        if ($kind) $q->where('bv.kind', $kind);
        if ($condition) $q->where('bv.condition', $condition);
        if ($providerId) $q->where('bv.provider_id', (int)$providerId);

        return $q->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'kind' => ['required', Rule::in(['laptop', 'tower', 'mini_pc'])],
            'condition' => ['required', Rule::in(['reused', 'new'])],
            'provider_id' => ['required', 'integer', 'exists:box_providers,id'],
            'length_cm' => ['required', 'integer', 'min:1'],
            'width_cm'  => ['required', 'integer', 'min:1'],
            'height_cm' => ['required', 'integer', 'min:1'],
            'unit_cost_eur' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
            'on_hand_qty' => ['nullable', 'integer', 'min:0'],
        ]);

        $id = DB::table('box_variants')->insertGetId([
            'kind' => $data['kind'],
            'condition' => $data['condition'],
            'provider_id' => (int)$data['provider_id'],
            'length_cm' => (int)$data['length_cm'],
            'width_cm'  => (int)$data['width_cm'],
            'height_cm' => (int)$data['height_cm'],
            'unit_cost_eur' => (float)($data['unit_cost_eur'] ?? 0),
            'is_active' => isset($data['is_active']) ? (bool)$data['is_active'] : true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('box_variant_stocks')->updateOrInsert(
            ['box_variant_id' => $id],
            [
                'on_hand_qty' => (int)($data['on_hand_qty'] ?? 0),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        return response()->json($this->findOne($id), 201);
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'kind' => ['required', Rule::in(['laptop', 'tower', 'mini_pc'])],
            'condition' => ['required', Rule::in(['reused', 'new'])],
            'provider_id' => ['required', 'integer', 'exists:box_providers,id'],
            'length_cm' => ['required', 'integer', 'min:1'],
            'width_cm'  => ['required', 'integer', 'min:1'],
            'height_cm' => ['required', 'integer', 'min:1'],
            'unit_cost_eur' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
            'on_hand_qty' => ['nullable', 'integer', 'min:0'],
        ]);

        DB::table('box_variants')->where('id', $id)->update([
            'kind' => $data['kind'],
            'condition' => $data['condition'],
            'provider_id' => (int)$data['provider_id'],
            'length_cm' => (int)$data['length_cm'],
            'width_cm'  => (int)$data['width_cm'],
            'height_cm' => (int)$data['height_cm'],
            'unit_cost_eur' => (float)($data['unit_cost_eur'] ?? 0),
            'is_active' => isset($data['is_active']) ? (bool)$data['is_active'] : true,
            'updated_at' => now(),
        ]);

        if (array_key_exists('on_hand_qty', $data)) {
            DB::table('box_variant_stocks')->updateOrInsert(
                ['box_variant_id' => $id],
                [
                    'on_hand_qty' => (int)($data['on_hand_qty'] ?? 0),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        return $this->findOne($id);
    }

    public function updateStock(Request $request, int $id)
    {
        $data = $request->validate([
            'on_hand_qty' => ['required', 'integer', 'min:0'],
        ]);

        DB::table('box_variant_stocks')->updateOrInsert(
            ['box_variant_id' => $id],
            [
                'on_hand_qty' => (int)$data['on_hand_qty'],
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        return $this->findOne($id);
    }

    private function findOne(int $id)
    {
        return DB::table('box_variants as bv')
            ->join('box_providers as bp', 'bp.id', '=', 'bv.provider_id')
            ->leftJoin('box_variant_stocks as bvs', 'bvs.box_variant_id', '=', 'bv.id')
            ->select([
                'bv.id',
                'bv.kind',
                'bv.condition',
                'bv.provider_id',
                'bp.name as provider_name',
                'bp.provider_type',
                'bv.length_cm',
                'bv.width_cm',
                'bv.height_cm',
                'bv.unit_cost_eur',
                'bv.is_active',
                DB::raw('COALESCE(bvs.on_hand_qty, 0) as on_hand_qty'),
                'bv.updated_at',
            ])
            ->where('bv.id', $id)
            ->first();
    }
}