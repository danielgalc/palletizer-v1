<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DeviceModelController extends Controller
{
    public function index(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $onlyActive = $request->query('only_active', '1');
        $boxTypeId = $request->query('box_type_id');

        $query = DB::table('device_models as dm')
            ->join('box_types as bt', 'bt.id', '=', 'dm.box_type_id')
            ->select([
                'dm.id',
                'dm.brand',
                'dm.name',
                'dm.sku',
                'dm.box_type_id',
                'dm.weight_kg',
                'dm.is_active',
                'dm.created_at',
                'dm.updated_at',
                DB::raw("json_build_object('id', bt.id, 'code', bt.code, 'name', bt.name) as box_type"),
            ])
            ->orderBy('dm.brand')
            ->orderBy('dm.name');

        if ($onlyActive === '1' || $onlyActive === 1 || $onlyActive === true) {
            $query->where('dm.is_active', true);
        }

        if ($boxTypeId !== null && $boxTypeId !== '') {
            $query->where('dm.box_type_id', (int) $boxTypeId);
        }

        if ($q !== '') {
            $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $q) . '%';
            $query->where(function ($sub) use ($like) {
                $sub->where('dm.name', 'ILIKE', $like)
                    ->orWhere('dm.brand', 'ILIKE', $like)
                    ->orWhere('dm.sku', 'ILIKE', $like);
            });
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'brand' => ['nullable', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'sku' => ['nullable', 'string', 'max:255', 'unique:device_models,sku'],
            'box_type_id' => ['required', 'integer', 'exists:box_types,id'],
            'weight_kg' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $id = DB::table('device_models')->insertGetId([
            'brand' => $data['brand'] ?? null,
            'name' => $data['name'],
            'sku' => $data['sku'] ?? null,
            'box_type_id' => (int) $data['box_type_id'],
            'weight_kg' => array_key_exists('weight_kg', $data) ? $data['weight_kg'] : null,
            'is_active' => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['id' => $id], 201);
    }

    public function update(Request $request, int $id)
    {
        $exists = DB::table('device_models')->where('id', $id)->exists();
        if (!$exists) {
            return response()->json(['message' => 'Modelo no encontrado.'], 404);
        }

        $data = $request->validate([
            'brand' => ['nullable', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'sku' => ['nullable', 'string', 'max:255', Rule::unique('device_models', 'sku')->ignore($id)],
            'box_type_id' => ['required', 'integer', 'exists:box_types,id'],
            'weight_kg' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        DB::table('device_models')->where('id', $id)->update([
            'brand' => $data['brand'] ?? null,
            'name' => $data['name'],
            'sku' => $data['sku'] ?? null,
            'box_type_id' => (int) $data['box_type_id'],
            'weight_kg' => array_key_exists('weight_kg', $data) ? $data['weight_kg'] : null,
            'is_active' => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : true,
            'updated_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }
}
