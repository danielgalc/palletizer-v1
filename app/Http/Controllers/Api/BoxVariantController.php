<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

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

        if ($request->filled('kind')) {
            $query->where('v.kind', $request->kind);
        }

        $variants  = $query->paginate(10)->withQueryString();
        $providers = DB::table('box_providers')->orderBy('name')->get();

        return Inertia::render('Admin/BoxVariants', [
            'variants'  => $variants,
            'providers' => $providers,
            'filters'   => $request->only(['kind']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'kind'          => ['required', 'in:laptop,tower,tower_sff,mini_pc'],
            'condition'     => ['required', 'in:new,reused'],
            'provider_id'   => ['required', 'integer', 'exists:box_providers,id'],
            'length_cm'     => ['required', 'integer', 'min:1'],
            'width_cm'      => ['required', 'integer', 'min:1'],
            'height_cm'     => ['required', 'integer', 'min:1'],
            'unit_cost_eur' => ['required', 'numeric', 'min:0'],
            'on_hand_qty'   => ['required', 'integer', 'min:0'],
            'is_active'     => ['boolean'],
        ]);

        $exists = DB::table('box_variants')
            ->where('kind', $data['kind'])
            ->where('condition', $data['condition'])
            ->where('provider_id', $data['provider_id'])
            ->exists();

        if ($exists) {
            return back()->withErrors(['kind' => 'Ya existe una variante con ese tipo, condición y proveedor.']);
        }

        DB::table('box_variants')->insert([
            ...$data,
            'is_active'  => $data['is_active'] ?? true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return back()->with('success', 'Variante de caja creada.');
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'kind'          => ['required', 'in:laptop,tower,tower_sff,mini_pc'],
            'condition'     => ['required', 'in:new,reused'],
            'provider_id'   => ['required', 'integer', 'exists:box_providers,id'],
            'length_cm'     => ['required', 'integer', 'min:1'],
            'width_cm'      => ['required', 'integer', 'min:1'],
            'height_cm'     => ['required', 'integer', 'min:1'],
            'unit_cost_eur' => ['required', 'numeric', 'min:0'],
            'on_hand_qty'   => ['required', 'integer', 'min:0'],
            'is_active'     => ['boolean'],
        ]);

        DB::table('box_variants')->where('id', $id)->update([...$data, 'updated_at' => now()]);
        return back()->with('success', 'Variante actualizada.');
    }

    public function destroy(int $id)
    {
        DB::table('box_variants')->where('id', $id)->delete();
        return back()->with('success', 'Variante eliminada.');
    }
}