<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class BoxProviderController extends Controller
{
    public function index()
    {
        $providers = DB::table('box_providers')->orderBy('name')->get();

        return Inertia::render('Admin/BoxProviders', [
            'providers' => $providers,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:100', 'unique:box_providers,name'],
            'provider_type' => ['required', 'in:reused_source,new_supplier'],
        ]);

        DB::table('box_providers')->insert([...$data, 'created_at' => now(), 'updated_at' => now()]);
        return back()->with('success', "Proveedor {$data['name']} creado.");
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:100', "unique:box_providers,name,{$id}"],
            'provider_type' => ['required', 'in:reused_source,new_supplier'],
        ]);

        DB::table('box_providers')->where('id', $id)->update([...$data, 'updated_at' => now()]);
        return back()->with('success', 'Proveedor actualizado.');
    }

    public function destroy(int $id)
    {
        $hasVariants = DB::table('box_variants')->where('provider_id', $id)->exists();
        if ($hasVariants) {
            return back()->withErrors(['delete' => 'No se puede eliminar: tiene variantes de caja asociadas.']);
        }

        DB::table('box_providers')->where('id', $id)->delete();
        return back()->with('success', 'Proveedor eliminado.');
    }
}
