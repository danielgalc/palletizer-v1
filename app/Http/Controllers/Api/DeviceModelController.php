<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
                'dm.box_type_id',
                'bt.id as bt_id', 'bt.name as bt_name', 'bt.code as bt_code'
            );

        if ($request->boolean('only_active')) {
            $query->where('dm.is_active', true);
        }

        return $query->get()->map(fn($row) => [
            'id'          => $row->id,
            'brand'       => $row->brand,
            'name'        => $row->name,
            'sku'         => $row->sku,
            'weight_kg'   => $row->weight_kg,
            'is_active'   => $row->is_active,
            'box_type_id' => $row->box_type_id,
            'box_type'    => [
                'id'   => $row->bt_id,
                'name' => $row->bt_name,
                'code' => $row->bt_code,
            ],
        ]);
    }
}
