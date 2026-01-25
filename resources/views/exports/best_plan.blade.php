<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Plan de Paletizado</title>
  <style>
    @page { size: A4; margin: 18mm 14mm; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #111827; }
    h1 { font-size: 16px; margin: 0 0 6px; }
    h2 { font-size: 12px; margin: 16px 0 8px; }
    .muted { color: #6B7280; }
    .pill { display:inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; background:#EEF2FF; color:#3730A3; font-weight:700; }
    .grid { width:100%; border-collapse: collapse; }
    .grid th, .grid td { border: 1px solid #E5E7EB; padding: 6px; vertical-align: top; }
    .grid th { background: #F9FAFB; text-align:left; font-size: 10px; color:#374151; }
    .num { text-align: right; white-space: nowrap; }
    .section { margin-top: 10px; }
    .box { border: 1px solid #E5E7EB; border-radius: 10px; padding: 10px; }
    .row { width:100%; }
    .row td { padding: 0; border: none; }
    .header { margin-bottom: 10px; }
    .small { font-size: 10px; }
  </style>
</head>
<body>

  <div class="header">
    <h1>Plan de Paletizado</h1>
    <div class="muted small">
      {{ $meta['company'] ?? 'Pulsia' }} · {{ $meta['province'] ?? '—' }} · Zona {{ $meta['zone_id'] ?? '—' }}
      · Generado: {{ $meta['generated_at'] ?? now()->format('Y-m-d H:i') }}
    </div>
  </div>

  <div class="box">
    <table class="row" style="width:100%;">
      <tr>
        <td style="width:70%;">
          <div><b>Descripción:</b> {{ $best['pallet_type_name'] ?? '—' }}</div>
          <div class="muted small" style="margin-top:4px;">
            Tipo de plan:
            @if(($best['metrics']['mixed'] ?? false) === true)
              <span>Mixto</span>
            @else
              <span>Mono</span>
            @endif
          </div>
        </td>
        <td style="width:30%; text-align:right;">
          <div><b>Pallets:</b> {{ (int)($best['pallet_count'] ?? 0) }}</div>
          <div><b>Total:</b> {{ number_format((float)($best['total_price'] ?? 0), 2, ',', '.') }} €</div>
          <div class="muted small">
            €/pallet (promedio): {{ number_format((float)($avg ?? 0), 2, ',', '.') }} €
          </div>
        </td>
      </tr>
    </table>

    @if(!empty($best['metrics']['cost_breakdown']) && is_array($best['metrics']['cost_breakdown']))
      <div class="section">
        <div class="small muted"><b>Desglose (plan mixto)</b></div>
        <table class="grid" style="margin-top:6px;">
          <thead>
            <tr>
              <th>Tipo</th>
              <th class="num">Coste</th>
            </tr>
          </thead>
          <tbody>
            @foreach($best['metrics']['cost_breakdown'] as $code => $cost)
              <tr>
                <td>{{ $code }}</td>
                <td class="num">{{ number_format((float)$cost, 2, ',', '.') }} €</td>
              </tr>
            @endforeach
          </tbody>
        </table>
      </div>
    @endif
  </div>

  <h2>Resumen por pallet</h2>
  <table class="grid">
    <thead>
      <tr>
        <th>#</th>
        <th class="num">Torres</th>
        <th class="num">Portátiles</th>
        <th class="num">Mini PCs</th>
        <th class="num">Separadores</th>
        <th class="num">Altura libre (cm)</th>
        <th class="num">Peso libre (kg)</th>
      </tr>
    </thead>
    <tbody>
      @foreach(($best['pallets'] ?? []) as $i => $p)
        <tr>
          <td>{{ $i+1 }}</td>
          <td class="num">{{ (int)($p['tower'] ?? 0) }}</td>
          <td class="num">{{ (int)($p['laptop'] ?? 0) }}</td>
          <td class="num">{{ (int)($p['mini_pc'] ?? 0) }}</td>
          <td class="num">{{ (int)($p['separators_used'] ?? 0) }}</td>
          <td class="num">{{ $p['remaining_capacity']['height_cm_left'] ?? '' }}</td>
          <td class="num">{{ $p['remaining_capacity']['weight_kg_left'] ?? '' }}</td>
        </tr>
      @endforeach
    </tbody>
  </table>

  <h2>Capas</h2>
  <table class="grid">
    <thead>
      <tr>
        <th>Pallet</th>
        <th>Capa</th>
        <th>Base</th>
        <th class="num">Torres</th>
        <th class="num">Portátiles</th>
        <th class="num">Mini PCs</th>
        <th class="num">Altura (cm)</th>
        <th class="num">Peso (kg)</th>
        <th class="num">Separador</th>
        <th class="num">Huecos</th>
      </tr>
    </thead>
    <tbody>
      @foreach(($best['pallets'] ?? []) as $pi => $p)
        @foreach(($p['layers'] ?? []) as $li => $layer)
          <tr>
            <td class="num">{{ $pi+1 }}</td>
            <td class="num">{{ $li+1 }}</td>
            <td>{{ $layer['base_type'] ?? '' }}</td>
            <td class="num">{{ (int)($layer['counts']['tower'] ?? 0) }}</td>
            <td class="num">{{ (int)($layer['counts']['laptop'] ?? 0) }}</td>
            <td class="num">{{ (int)($layer['counts']['mini_pc'] ?? 0) }}</td>
            <td class="num">{{ $layer['height_cm'] ?? '' }}</td>
            <td class="num">{{ $layer['weight_kg'] ?? '' }}</td>
            <td class="num">{{ !empty($layer['needs_separator']) ? 'Sí' : 'No' }}</td>
            <td class="num">{{ (int)($layer['slots_empty'] ?? 0) }}</td>
          </tr>
        @endforeach
      @endforeach
    </tbody>
  </table>

</body>
</html>
