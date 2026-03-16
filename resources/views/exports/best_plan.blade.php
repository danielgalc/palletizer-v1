<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Plan de Paletizado · Pulsia</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #1F2937; background: #fff; }

    /* Cabecera */
    .page-header { background: #111827; color: #fff; padding: 18px 28px 16px; }
    .page-header table { width: 100%; border-collapse: collapse; }
    .page-header td { border: none; padding: 0; vertical-align: middle; }
    .brand { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; color: #fff; }
    .brand span { color: #FBBF24; }
    .doc-title { font-size: 11px; font-weight: 700; color: #F9FAFB; margin-top: 3px; }
    .meta-right { text-align: right; font-size: 9px; color: #9CA3AF; line-height: 1.6; }
    .meta-right strong { color: #E5E7EB; }

    /* Cuerpo */
    .body { padding: 20px 28px 28px; }

    /* KPIs */
    .kpi-row { width: 100%; border-collapse: separate; border-spacing: 6px 0; }
    .kpi-row td { border: none; padding: 0; vertical-align: top; }
    .kpi-card { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 10px 12px; text-align: center; }
    .kpi-card .kpi-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6B7280; margin-bottom: 4px; }
    .kpi-card .kpi-value { font-size: 14px; font-weight: 700; color: #111827; white-space: nowrap; }
    .kpi-card.accent { background: #111827; border-color: #111827; }
    .kpi-card.accent .kpi-label { color: #9CA3AF; }
    .kpi-card.accent .kpi-value { color: #FBBF24; }

    /* Info bar */
    .info-bar { background: #F3F4F6; border-radius: 8px; padding: 10px 14px; margin: 14px 0 18px; font-size: 9.5px; color: #374151; line-height: 1.7; }
    .info-bar strong { color: #111827; }
    .badge { display: inline-block; background: #DBEAFE; color: #1E40AF; font-size: 8px; font-weight: 700; padding: 1px 7px; border-radius: 999px; }
    .badge-yellow { background: #FEF9C3; color: #92400E; }

    /* Secciones */
    .section-title { font-size: 9.5px; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: 0.6px; background: #374151; padding: 5px 10px; border-radius: 4px; margin: 18px 0 8px; }

    /* Tablas */
    .data-table { width: 100%; border-collapse: collapse; font-size: 9px; }
    .data-table thead tr { background: #111827; color: #F9FAFB; }
    .data-table thead th { padding: 6px 8px; text-align: left; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; white-space: nowrap; }
    .data-table thead th.num { text-align: right; }
    .data-table tbody tr:nth-child(even) { background: #F9FAFB; }
    .data-table tbody tr:nth-child(odd) { background: #fff; }
    .data-table tbody td { padding: 5px 8px; color: #1F2937; border-bottom: 1px solid #F3F4F6; vertical-align: middle; }
    .data-table tbody td.num { text-align: right; white-space: nowrap; }
    .data-table tbody td.bold { font-weight: 700; }

    /* Fila separador de seguridad */
    .row-sec-sep td { background: #FEF9C3 !important; color: #92400E; font-style: italic; font-size: 8.5px; padding: 4px 8px; border-bottom: 1px solid #FDE68A; }

    /* Pie */
    .page-footer { margin-top: 24px; border-top: 1px solid #E5E7EB; padding-top: 8px; font-size: 8px; color: #9CA3AF; text-align: center; }
  </style>
</head>
<body>

  {{-- CABECERA --}}
  <div class="page-header">
    <table><tr>
      <td style="width:60%;">
        <div class="brand">Pallet<span>izer</span></div>
        <div class="doc-title">Plan de Paletizado &middot; Óptimo</div>
      </td>
      <td style="width:40%;">
        <div class="meta-right">
          <strong>{{ $meta['company'] ?? 'Pulsia' }}</strong><br>
          Destino: <strong>{{ $meta['province'] ?? '—' }}</strong> &middot; Zona <strong>{{ $meta['zone_id'] ?? '—' }}</strong><br>
          Generado: {{ $meta['generated_at'] ?? now()->format('Y-m-d H:i') }}
        </div>
      </td>
    </tr></table>
  </div>

  <div class="body">

    {{-- KPIs --}}
    @php
      $total    = (float)($best['total_price'] ?? 0);
      $count    = (int)($best['pallet_count'] ?? 0);
      $avgPp    = $count > 0 ? $total / $count : 0;
      $packed   = $best['packed_items'] ?? [];
      $allBoxes = array_sum($packed);
      $eurBox   = $allBoxes > 0 ? $total / $allBoxes : 0;
      $boxCost  = (float)($best['metrics']['packaging_cost'] ?? 0);
      $isMixed  = ($best['metrics']['mixed'] ?? false) === true;
    @endphp

    <table class="kpi-row">
      <tr>
        <td><div class="kpi-card"><div class="kpi-label">Pallets</div><div class="kpi-value">{{ $count }}</div></div></td>
        <td><div class="kpi-card"><div class="kpi-label">&euro; / pallet</div><div class="kpi-value">{{ number_format($avgPp, 2, ',', '.') }} &euro;</div></div></td>
        <td><div class="kpi-card"><div class="kpi-label">&euro; / equipo</div><div class="kpi-value">{{ number_format($eurBox, 2, ',', '.') }} &euro;</div></div></td>
        <td><div class="kpi-card"><div class="kpi-label">Total cajas</div><div class="kpi-value">{{ number_format($boxCost, 2, ',', '.') }} &euro;</div></div></td>
        <td><div class="kpi-card accent"><div class="kpi-label">Total</div><div class="kpi-value">{{ number_format($total, 2, ',', '.') }} &euro;</div></div></td>
      </tr>
    </table>

    {{-- INFO ENVÍO --}}
    <div class="info-bar">
      <table style="width:100%; border-collapse:collapse;"><tr>
        <td style="width:55%; border:none; padding:0; vertical-align:top;">
          @if(!empty($best['carrier_name']))<strong>Transportista:</strong> {{ $best['carrier_name'] }}<br>@endif
          <strong>Tarifa:</strong> {{ $best['pallet_type_name'] ?? '—' }}<br>
          <strong>Plan:</strong> <span class="badge {{ $isMixed ? 'badge-yellow' : '' }}">{{ $isMixed ? 'Mixto' : 'Mono' }}</span>
        </td>
        <td style="width:45%; border:none; padding:0; vertical-align:top; text-align:right;">
          @if(($packed['tower']     ?? 0) > 0)<strong>Torres MT:</strong> {{ $packed['tower'] }}&nbsp;&nbsp;@endif
          @if(($packed['tower_sff'] ?? 0) > 0)<strong>Torres SFF:</strong> {{ $packed['tower_sff'] }}&nbsp;&nbsp;@endif
          @if(($packed['laptop']    ?? 0) > 0)<strong>Portátiles:</strong> {{ $packed['laptop'] }}&nbsp;&nbsp;@endif
          @if(($packed['mini_pc']   ?? 0) > 0)<strong>Mini PCs:</strong> {{ $packed['mini_pc'] }}@endif
        </td>
      </tr></table>
      @if($isMixed && !empty($best['metrics']['cost_breakdown']))
        <div style="margin-top:8px; border-top:1px solid #E5E7EB; padding-top:6px;">
          <strong>Desglose mixto:</strong>&nbsp;
          @foreach($best['metrics']['cost_breakdown'] as $code => $cost)
            {{ $code }}: {{ number_format((float)$cost, 2, ',', '.') }} &euro;&nbsp;&nbsp;
          @endforeach
        </div>
      @endif
    </div>

    {{-- MODELOS --}}
    @if(!empty($modelLines))
      <div class="section-title">Modelos incluidos en el envío</div>
      <table class="data-table">
        <thead><tr>
          <th>Marca</th><th>Modelo</th><th>Tipo de caja</th><th class="num">Uds.</th>
        </tr></thead>
        <tbody>
          @foreach($modelLines as $m)
            <tr>
              <td class="bold">{{ $m['brand'] }}</td>
              <td>{{ $m['name'] }}</td>
              <td>{{ $m['box_type'] }}</td>
              <td class="num">{{ $m['qty'] }}</td>
            </tr>
          @endforeach
        </tbody>
      </table>
    @endif

    {{-- RESUMEN POR PALLET --}}
    <div class="section-title">Resumen por pallet</div>
    <table class="data-table">
      <thead><tr>
        <th>#</th>
        <th class="num">Torres MT</th><th class="num">Torres SFF</th>
        <th class="num">Portátiles</th><th class="num">Mini PCs</th>
        <th class="num">Sep. mezcla</th><th class="num">Sep. seguridad</th>
        <th class="num">Alt. libre (cm)</th><th class="num">Peso libre (kg)</th>
      </tr></thead>
      <tbody>
        @foreach(($best['pallets'] ?? []) as $i => $p)
          @php
            $boxes   = $p['boxes'] ?? [];
            $layers  = $p['layers'] ?? [];
            $secSeps = count(array_filter($layers, fn($l) => !empty($l['security_separator'])));
            $mixSeps = count(array_filter($layers, fn($l) => !empty($l['separator']) && empty($l['security_separator'])));
          @endphp
          <tr>
            <td class="bold">{{ $i + 1 }}</td>
            <td class="num">{{ (int)($boxes['tower']     ?? 0) ?: '—' }}</td>
            <td class="num">{{ (int)($boxes['tower_sff'] ?? 0) ?: '—' }}</td>
            <td class="num">{{ (int)($boxes['laptop']    ?? 0) ?: '—' }}</td>
            <td class="num">{{ (int)($boxes['mini_pc']   ?? 0) ?: '—' }}</td>
            <td class="num">{{ $mixSeps ?: '—' }}</td>
            <td class="num">{{ $secSeps ?: '—' }}</td>
            <td class="num">{{ $p['remaining_capacity']['height_cm_left'] ?? '—' }}</td>
            <td class="num">{{ isset($p['remaining_capacity']['weight_kg_left']) ? number_format((float)$p['remaining_capacity']['weight_kg_left'], 2, ',', '.') . ' kg' : '—' }}</td>
          </tr>
        @endforeach
      </tbody>
    </table>

    {{-- DETALLE DE CAPAS --}}
    <div class="section-title">Detalle de capas</div>
    <table class="data-table">
      <thead><tr>
        <th>Pallet</th><th>Capa</th><th>Tipo base</th>
        <th class="num">MT</th><th class="num">SFF</th>
        <th class="num">Port.</th><th class="num">Mini</th><th class="num">Vert.</th>
        <th class="num">Alt. (cm)</th><th class="num">Peso (kg)</th><th class="num">Sep.</th>
      </tr></thead>
      <tbody>
        @php $typeLabels = ['tower'=>'Torre MT','tower_sff'=>'Torre SFF','laptop'=>'Portátil','mini_pc'=>'Mini PC']; @endphp
        @foreach(($best['pallets'] ?? []) as $pi => $p)
          @php $layerNum = 0; @endphp
          @foreach(($p['layers'] ?? []) as $layer)
            @if(!empty($layer['security_separator']))
              <tr class="row-sec-sep">
                <td>{{ $pi + 1 }}</td>
                <td colspan="10">&mdash; Separador de seguridad &mdash;</td>
              </tr>
            @else
              @php
                $layerNum++;
                $counts = ['tower'=>0,'tower_sff'=>0,'laptop'=>0,'mini_pc'=>0];
                $t = $layer['type'] ?? null;
                if ($t && isset($counts[$t])) $counts[$t] += (int)($layer['count'] ?? 0);
                foreach (($layer['mixed'] ?? []) as $mx) {
                    $mt = $mx['type'] ?? null;
                    if ($mt && isset($counts[$mt])) $counts[$mt] += (int)($mx['count'] ?? 0);
                }
                $vertTotal = array_sum(array_column($layer['vertical'] ?? [], 'count'));
              @endphp
              <tr>
                <td class="num bold">{{ $pi + 1 }}</td>
                <td class="num">{{ $layerNum }}</td>
                <td>{{ $typeLabels[$layer['type'] ?? ''] ?? ($layer['type'] ?? '—') }}</td>
                <td class="num">{{ $counts['tower']     ?: '—' }}</td>
                <td class="num">{{ $counts['tower_sff'] ?: '—' }}</td>
                <td class="num">{{ $counts['laptop']    ?: '—' }}</td>
                <td class="num">{{ $counts['mini_pc']   ?: '—' }}</td>
                <td class="num">{{ $vertTotal           ?: '—' }}</td>
                <td class="num">{{ $layer['height_cm']  ?? '—' }}</td>
                <td class="num">{{ isset($layer['weight_kg']) ? number_format((float)$layer['weight_kg'], 3, ',', '.') : '—' }}</td>
                <td class="num">{{ !empty($layer['separator']) ? 'Sí' : '—' }}</td>
              </tr>
            @endif
          @endforeach
        @endforeach
      </tbody>
    </table>

    {{-- PIE --}}
    <div class="page-footer">
      Palletizer &middot; {{ $meta['company'] ?? 'Pulsia' }} &middot; Documento generado automáticamente el {{ $meta['generated_at'] ?? now()->format('Y-m-d H:i') }}
    </div>

  </div>
</body>
</html>