<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class BoxTypeController extends Controller
{
    public function index()
    {
        // Devolvemos los 3 tipos, ordenados (y por si en el futuro hay más)
        return DB::table('box_types')
            ->select('id', 'code', 'name', 'length_cm', 'width_cm', 'height_cm', 'weight_kg', 'updated_at')
            ->orderBy('id')
            ->get();
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'length_cm' => ['required', 'integer', 'min:1', 'max:200'],
            'width_cm'  => ['required', 'integer', 'min:1', 'max:200'],
            'height_cm' => ['required', 'integer', 'min:1', 'max:250'],
            'weight_kg' => ['required', 'numeric', 'min:0.01', 'max:200'],
        ]);

        $exists = DB::table('box_types')->where('id', $id)->exists();
        if (!$exists) {
            return response()->json(['message' => 'Box type not found'], 404);
        }

        DB::table('box_types')->where('id', $id)->update([
            'name' => $data['name'],
            'length_cm' => $data['length_cm'],
            'width_cm' => $data['width_cm'],
            'height_cm' => $data['height_cm'],
            'weight_kg' => $data['weight_kg'],
            'updated_at' => now(),
        ]);

        return DB::table('box_types')
            ->select('id', 'code', 'name', 'length_cm', 'width_cm', 'height_cm', 'weight_kg', 'updated_at')
            ->where('id', $id)
            ->first();
    }
}
