<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DeviceModelController extends Controller
{
    public function index(Request $request)
    {
        $query = DB::table('device_models as dm')
            ->join('box_types as bt', 'bt.id', '=', 'dm.box_type_id')
            ->orderBy('dm.brand')
            ->orderBy('dm.name')
            ->select(
                'dm.id', 'dm.brand', 'dm.name', 'dm.sku', 'dm.weight_kg', 'dm.is_active',
                'dm.box_type_id', 'bt.name as box_type_name', 'bt.code as box_type_code'
            );

        if ($request->filled('search')) {
            $search = '%' . $request->search . '%';
            $query->where(function ($q) use ($search) {
                $q->where('dm.name', 'like', $search)
                  ->orWhere('dm.brand', 'like', $search)
                  ->orWhere('dm.sku', 'like', $search);
            });
        }

        if ($request->filled('box_type_id')) {
            $query->where('dm.box_type_id', $request->box_type_id);
        }

        $models   = $query->paginate(25)->withQueryString();
        $boxTypes = DB::table('box_types')->orderBy('name')->get();

        return Inertia::render('Admin/DeviceModels', [
            'models'   => $models,
            'boxTypes' => $boxTypes,
            'filters'  => $request->only(['search', 'box_type_id']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'brand'       => ['nullable', 'string', 'max:100'],
            'name'        => ['required', 'string', 'max:150'],
            'sku'         => ['nullable', 'string', 'max:100', 'unique:device_models,sku'],
            'box_type_id' => ['required', 'integer', 'exists:box_types,id'],
            'weight_kg'   => ['nullable', 'numeric', 'min:0'],
            'is_active'   => ['boolean'],
        ]);

        DB::table('device_models')->insert([
            ...$data,
            'is_active'  => $data['is_active'] ?? true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return back()->with('success', "Modelo {$data['name']} creado.");
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'brand'       => ['nullable', 'string', 'max:100'],
            'name'        => ['required', 'string', 'max:150'],
            'sku'         => ['nullable', 'string', 'max:100', "unique:device_models,sku,{$id}"],
            'box_type_id' => ['required', 'integer', 'exists:box_types,id'],
            'weight_kg'   => ['nullable', 'numeric', 'min:0'],
            'is_active'   => ['boolean'],
        ]);

        DB::table('device_models')->where('id', $id)->update([...$data, 'updated_at' => now()]);
        return back()->with('success', 'Modelo actualizado.');
    }

    public function destroy(int $id)
    {
        DB::table('device_models')->where('id', $id)->delete();
        return back()->with('success', 'Modelo eliminado.');
    }
}