<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class BoxTypeController extends Controller
{
    public function index()
    {
        $boxTypes = DB::table('box_types')->orderBy('name')->get();

        return Inertia::render('Admin/BoxTypes', [
            'boxTypes' => $boxTypes,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code'                              => ['required', 'string', 'max:50', 'unique:box_types,code'],
            'name'                              => ['required', 'string', 'max:100'],
            'length_cm'                         => ['required', 'integer', 'min:1'],
            'width_cm'                          => ['required', 'integer', 'min:1'],
            'height_cm'                         => ['required', 'integer', 'min:1'],
            'weight_kg'                         => ['required', 'numeric', 'min:0'],
            'security_separator_every_n_layers' => ['nullable', 'integer', 'min:1'],
        ]);

        DB::table('box_types')->insert([...$data, 'created_at' => now(), 'updated_at' => now()]);
        return back()->with('success', "Tipo de caja {$data['name']} creado.");
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'code'                              => ['required', 'string', 'max:50', "unique:box_types,code,{$id}"],
            'name'                              => ['required', 'string', 'max:100'],
            'length_cm'                         => ['required', 'integer', 'min:1'],
            'width_cm'                          => ['required', 'integer', 'min:1'],
            'height_cm'                         => ['required', 'integer', 'min:1'],
            'weight_kg'                         => ['required', 'numeric', 'min:0'],
            'security_separator_every_n_layers' => ['nullable', 'integer', 'min:1'],
        ]);

        DB::table('box_types')->where('id', $id)->update([...$data, 'updated_at' => now()]);
        return back()->with('success', 'Tipo de caja actualizado.');
    }

    public function destroy(int $id)
    {
        $hasModels   = DB::table('device_models')->where('box_type_id', $id)->exists();
        $hasVariants = DB::table('box_variants')->where('kind', function ($q) use ($id) {
            $q->select('code')->from('box_types')->where('id', $id);
        })->exists();

        if ($hasModels) {
            return back()->withErrors(['delete' => 'No se puede eliminar: tiene modelos de dispositivo asociados.']);
        }

        DB::table('box_types')->where('id', $id)->delete();
        return back()->with('success', 'Tipo de caja eliminado.');
    }
}
