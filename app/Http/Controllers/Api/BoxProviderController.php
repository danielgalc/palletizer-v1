<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class BoxProviderController extends Controller
{
    public function index()
    {
        return DB::table('box_providers')
            ->select('id', 'name', 'provider_type', 'updated_at')
            ->orderBy('provider_type')
            ->orderBy('name')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:box_providers,name'],
            'provider_type' => ['required', Rule::in(['reused_source', 'new_supplier'])],
        ]);

        $id = DB::table('box_providers')->insertGetId([
            'name' => trim($data['name']),
            'provider_type' => $data['provider_type'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(DB::table('box_providers')->where('id', $id)->first(), 201);
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('box_providers', 'name')->ignore($id)],
            'provider_type' => ['required', Rule::in(['reused_source', 'new_supplier'])],
        ]);

        DB::table('box_providers')->where('id', $id)->update([
            'name' => trim($data['name']),
            'provider_type' => $data['provider_type'],
            'updated_at' => now(),
        ]);

        return DB::table('box_providers')->where('id', $id)->first();
    }
}
