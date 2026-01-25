import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "@inertiajs/react";
import AppLayout from "@/Layouts/AppLayout";

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl bg-white shadow-soft ring-1 ring-ink-100 ${className}`}>
      {children}
    </div>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-ink-700">{label}</label>
      <div className="mt-1">{children}</div>
      {hint && <div className="mt-1 text-xs text-ink-500">{hint}</div>}
      {error && <div className="mt-1 text-xs font-semibold text-red-600">{error}</div>}
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-ink-50 p-4">
      <div className="text-xs text-ink-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-ink-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-ink-500">{sub}</div> : null}
    </div>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-extrabold text-brand-800">
      {children}
    </span>
  );
}

function fmtEUR(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return `${n.toFixed(2)} €`;
}

function fmtNum(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return String(n);
}

function pricePerPallet(plan) {
  if (!plan) return null;

  // Si viene un €/pallet directo (planes mono-tipo), úsalo
  if (plan.price_per_pallet !== null && plan.price_per_pallet !== undefined) {
    const v = Number(plan.price_per_pallet);
    return Number.isFinite(v) ? v : null;
  }

  // Si es mixto (o no viene price_per_pallet), usa media: total / pallets
  const total = Number(plan.total_price);
  const count = Number(plan.pallet_count);

  if (!Number.isFinite(total) || !Number.isFinite(count) || count <= 0) return null;

  return total / count;
}

/* Desglose para planes mixtos: €/pallet por tipo */

/* function mixedBreakdownSub(plan) {
  const types = plan?.metrics?.types;
  const costs = plan?.metrics?.cost_breakdown;

  if (!types || !costs) return null;

  // Ej: "MQ: 1 (58.11€) · HP: 1 (58.11€)"
  return Object.entries(types)
    .map(([code, count]) => {
      const c = Number(costs?.[code]);
      const n = Number(count);
      if (!Number.isFinite(c) || !Number.isFinite(n) || n <= 0) {
        return `${code}: ${count}`;
      }
      const per = c / n;
      return `${code}: ${count} (${per.toFixed(2)}€)`;
    })
    .join(" · ");
} */



export default function Index({ result }) {
  const { data, setData, post, processing, errors } = useForm({
    province_id: null,
    mini_pc: 0,
    tower: 0,
    laptop: 0,
    allow_separators: true,

    pallet_mode: "auto",
    pallet_type_codes: [],
  });

  const [provinces, setProvinces] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [provincesError, setProvincesError] = useState(null);

  const [palletTypes, setPalletTypes] = useState([]);
  const [loadingPalletTypes, setLoadingPalletTypes] = useState(true);
  const [palletTypesError, setPalletTypesError] = useState(null);

  // Autocomplete state
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef(null);

  // --- Box types modal ---
  const [boxModalOpen, setBoxModalOpen] = useState(false);
  const [boxTypes, setBoxTypes] = useState([]);
  const [loadingBoxTypes, setLoadingBoxTypes] = useState(false);
  const [boxTypesError, setBoxTypesError] = useState(null);

  const [savingBoxById, setSavingBoxById] = useState({});
  const [boxMsgById, setBoxMsgById] = useState({});

  // Exportacion de docs
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);




  const fetchBoxTypes = async () => {
    setLoadingBoxTypes(true);
    setBoxTypesError(null);

    try {
      const r = await fetch("/api/box-types");
      if (!r.ok) throw new Error("No se pudieron cargar los tipos de caja");
      const list = await r.json();
      setBoxTypes(Array.isArray(list) ? list : []);
    } catch (e) {
      setBoxTypesError(e.message || "Error cargando tipos de caja");
    } finally {
      setLoadingBoxTypes(false);
    }
  };

  const openBoxTypesModal = async () => {
    setBoxModalOpen(true);

    // Si no los tenemos aún, los cargamos
    if (boxTypes.length === 0) {
      await fetchBoxTypes();
    }
  };

  const closeBoxTypesModal = () => {
    setBoxModalOpen(false);
  };

  const onBoxChange = (id, field, value) => {
    setBoxTypes((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
    setBoxMsgById((prev) => ({ ...prev, [id]: null }));
  };

  const saveBoxType = async (row) => {
    const id = row.id;
    setSavingBoxById((p) => ({ ...p, [id]: true }));
    setBoxMsgById((p) => ({ ...p, [id]: null }));
    setBoxTypesDirtyNotice(true);

    const payload = {
      name: row.name,
      length_cm: Number(row.length_cm),
      width_cm: Number(row.width_cm),
      height_cm: Number(row.height_cm),
      weight_kg: Number(row.weight_kg),
    };

    try {
      const res = await fetch(`/api/box-types/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errText = "No se pudo guardar";
        try {
          const data = await res.json();
          if (data?.message) errText = data.message;
          if (data?.errors) {
            const firstKey = Object.keys(data.errors)[0];
            if (firstKey) errText = data.errors[firstKey][0];
          }
        } catch (_) { }
        throw new Error(errText);
      }

      const updated = await res.json();
      setBoxTypes((prev) => prev.map((b) => (b.id === id ? updated : b)));
      setBoxMsgById((p) => ({ ...p, [id]: { type: "ok", text: "Guardado" } }));
    } catch (e) {
      setBoxMsgById((p) => ({ ...p, [id]: { type: "err", text: e.message || "Error guardando" } }));
    } finally {
      setSavingBoxById((p) => ({ ...p, [id]: false }));
    }
  };


  useEffect(() => {
    let cancelled = false;

    fetch("/api/pallet-types")
      .then((r) => {
        if (!r.ok) throw new Error("No se pudieron cargar tipos de pallet");
        return r.json();
      })
      .then((list) => {
        if (cancelled) return;
        setPalletTypes(list);
        setLoadingPalletTypes(false);

        if (Array.isArray(list) && list.length > 0 && data.pallet_type_codes.length === 0) {
          setData("pallet_type_codes", list.map((t) => t.code));
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadingPalletTypes(false);
        setPalletTypesError(e.message || "Error cargando tipos de pallet");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/provinces")
      .then((r) => {
        if (!r.ok) throw new Error("No se pudieron cargar provincias");
        return r.json();
      })
      .then((list) => {
        if (cancelled) return;
        setProvinces(list);
        setLoadingProvinces(false);

        /* const zaragoza = list.find((p) => normalize(p.name) === "zaragoza");
         const initial = zaragoza || list[0];
 
         if (initial) {
           setData("province_id", initial.id);
           setQuery(initial.name);
         } */
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadingProvinces(false);
        setProvincesError(e.message || "Error cargando provincias");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedProvinceObj = useMemo(() => {
    return provinces.find((p) => p.id === data.province_id) || null;
  }, [provinces, data.province_id]);

  useEffect(() => {
    if (selectedProvinceObj && query !== selectedProvinceObj.name) {
      setQuery(selectedProvinceObj.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.province_id]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return provinces;

    const starts = [];
    const contains = [];

    for (const p of provinces) {
      const nameN = normalize(p.name);
      if (nameN.startsWith(q)) starts.push(p);
      else if (nameN.includes(q)) contains.push(p);
    }

    return [...starts, ...contains].slice(0, 12);
  }, [provinces, query]);

  const selectProvince = (p) => {
    setData("province_id", p.id);
    setQuery(p.name);
    setIsOpen(false);
    setHighlightIndex(0);
  };

  useEffect(() => {
    const onDocClick = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const onKeyDown = (e) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setIsOpen(true);
      return;
    }
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (filtered[highlightIndex]) {
        e.preventDefault();
        selectProvince(filtered[highlightIndex]);
      } else {
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    setBoxTypesDirtyNotice(false);

    try {
      if (typeof route === "function") {
        post(route("palletizer.calculate"), { preserveScroll: true });
        return;
      }
    } catch (_) { }

    post("/palletizer/calculate", { preserveScroll: true });
  };

  const exportBestPlanExcel = async () => {
    setExporting(true);
    setExportError(null);

    try {
      // Validación mínima (misma lógica que canSubmit)
      if (!canSubmit) {
        throw new Error("Completa el formulario antes de exportar.");
      }

      const payload = {
        province_id: data.province_id,
        tower: Number(data.tower ?? 0),
        laptop: Number(data.laptop ?? 0),
        mini_pc: Number(data.mini_pc ?? 0),
        allow_separators: !!data.allow_separators,
        pallet_mode: data.pallet_mode,
        pallet_type_codes: Array.isArray(data.pallet_type_codes) ? data.pallet_type_codes : [],
      };

      const res = await fetch("/api/export/best-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Intentar leer mensaje de error JSON
        let msg = "No se pudo exportar.";
        try {
          const j = await res.json();
          if (j?.message) msg = j.message;
        } catch (_) { }
        throw new Error(msg);
      }

      const blob = await res.blob();

      // Nombre sugerido desde backend (si viene)
      const contentDisposition = res.headers.get("content-disposition");
      let filename = "best_plan.xlsx";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/i);
        if (match?.[1]) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e.message || "Error exportando");
    } finally {
      setExporting(false);
    }
  };

  const manualOk = data.pallet_mode !== "manual" || data.pallet_type_codes.length > 0;

  const canSubmit =
    !processing &&
    !loadingProvinces &&
    !provincesError &&
    data.province_id !== null &&
    provinces.some((p) => p.id === data.province_id) &&
    manualOk;

  const best = result?.plan?.best || null;
  const alternatives = Array.isArray(result?.plan?.alternatives) ? result.plan.alternatives : [];
  const metrics = best?.metrics || null;
  const recommendations = Array.isArray(result?.plan?.recommendations)
    ? result.plan.recommendations
    : [];


  const palletMeta = metrics?.pallet || null;
  const perType = metrics?.per_type || metrics?.box_info || null;

  const [boxTypesDirtyNotice, setBoxTypesDirtyNotice] = useState(false);

  /* const pricePerPallet =
     best?.price_per_pallet !== null && best?.price_per_pallet !== undefined
       ? best.price_per_pallet
       : (Number(best?.total_price) && Number(best?.pallet_count))
         ? Number(best.total_price) / Number(best.pallet_count)
         : null; */

  // Avisos
  const warnings = Array.isArray(best?.warnings) ? best.warnings : [];

  return (
    <AppLayout title="Palletizer">
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* Panel izquierdo */}
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-ink-900">
                Planificación de pedido
              </h1>
            </div>
            <div className="h-10 w-1 rounded-full bg-brand-500" />
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            {/* Provincia */}
            <Field
              label="Provincia destino"
              hint={
                selectedProvinceObj?.zone_name
                  ? `Seleccionada: ${selectedProvinceObj.name} · ${selectedProvinceObj.zone_name}`
                  : "Escribe para buscar (ej. Zara, Mad...)"
              }
              error={errors.province_id}
            >
              <div ref={containerRef} className="relative">
                <input
                  value={query}
                  disabled={loadingProvinces || !!provincesError}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setIsOpen(true);
                    setHighlightIndex(0);
                  }}
                  onFocus={() => setIsOpen(true)}
                  onKeyDown={onKeyDown}
                  placeholder={loadingProvinces ? "Cargando..." : "Buscar provincia..."}
                  className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2 disabled:bg-ink-50"
                />

                {isOpen && !loadingProvinces && !provincesError && (
                  <div className="absolute left-0 right-0 top-[42px] z-20 max-h-72 overflow-auto rounded-xl border border-ink-200 bg-white shadow-soft">
                    {filtered.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-ink-500">Sin resultados.</div>
                    ) : (
                      filtered.map((p, idx) => (
                        <div
                          key={p.id}
                          onMouseEnter={() => setHighlightIndex(idx)}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectProvince(p);
                          }}
                          className={[
                            "flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm",
                            idx === highlightIndex ? "bg-ink-50" : "bg-white",
                          ].join(" ")}
                        >
                          <span className="text-ink-800">{p.name}</span>
                          <span className="whitespace-nowrap text-xs text-ink-500">
                            {p.zone_name}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {provincesError && (
                <div className="mt-2 text-xs font-semibold text-red-600">
                  {provincesError} (revisa GET /api/provinces)
                </div>
              )}
            </Field>

            {/* Tipos de pallet */}
            <div className="rounded-2xl border border-ink-100 bg-ink-50 p-4">
              <div className="text-sm font-extrabold text-ink-900">Tipos de pallet</div>

              <div className="mt-3 flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm text-ink-800">
                  <input
                    type="radio"
                    name="pallet_mode"
                    value="auto"
                    checked={data.pallet_mode === "auto"}
                    onChange={() => setData("pallet_mode", "auto")}
                    className="h-4 w-4 accent-brand-500"
                  />
                  Auto (recomendado)
                </label>

                <label className="flex items-center gap-2 text-sm text-ink-800">
                  <input
                    type="radio"
                    name="pallet_mode"
                    value="manual"
                    checked={data.pallet_mode === "manual"}
                    onChange={() => setData("pallet_mode", "manual")}
                    className="h-4 w-4 accent-brand-500"
                  />
                  Manual (seleccionar)
                </label>
              </div>

              {loadingPalletTypes ? (
                <div className="mt-3 text-sm text-ink-500">Cargando tipos de pallet…</div>
              ) : palletTypesError ? (
                <div className="mt-3 text-sm font-semibold text-red-600">{palletTypesError}</div>
              ) : data.pallet_mode === "manual" ? (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setData("pallet_type_codes", palletTypes.map((t) => t.code))}
                      className="rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink-800 hover:bg-ink-50"
                    >
                      Seleccionar todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setData("pallet_type_codes", [])}
                      className="rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink-800 hover:bg-ink-50"
                    >
                      Quitar todos
                    </button>
                  </div>

                  <div className="grid gap-2">
                    {palletTypes.map((t) => {
                      const checked = data.pallet_type_codes.includes(t.code);
                      return (
                        <label key={t.code} className="flex items-center gap-2 text-sm text-ink-800">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...data.pallet_type_codes, t.code]
                                : data.pallet_type_codes.filter((c) => c !== t.code);
                              setData("pallet_type_codes", next);
                            }}
                            className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-500"
                          />
                          <span className="font-semibold">{t.name}</span>
                          <span className="text-xs text-ink-500">({t.code})</span>
                        </label>
                      );
                    })}
                  </div>

                  {errors.pallet_type_codes && (
                    <div className="text-xs font-semibold text-red-600">{errors.pallet_type_codes}</div>
                  )}

                  {data.pallet_type_codes.length === 0 && (
                    <div className="text-xs font-semibold text-red-600">
                      Selecciona al menos un tipo de pallet o usa modo Auto.
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 text-sm text-ink-500">
                  Se evaluarán automáticamente todos los tipos disponibles.
                </div>
              )}
            </div>

            {/* Toggle separadores */}
            <div className="rounded-2xl border border-ink-100 bg-white p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={data.allow_separators}
                  onChange={(e) => setData("allow_separators", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-500"
                />
                <div>
                  <div className="text-sm font-extrabold text-ink-900">
                    Permitir separador para capas mixtas
                  </div>
                  <div className="mt-1 text-xs text-ink-500">
                    Si está activado, se puede rellenar una capa con otros tipos aunque tengan distinta altura,
                    contabilizando separadores. Si está desactivado, solo se rellena con cajas de la misma altura.
                  </div>
                  {errors.allow_separators && (
                    <div className="mt-2 text-xs font-semibold text-red-600">
                      {errors.allow_separators}
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Tipos de caja */}
            <details className="rounded-2xl border border-ink-100 bg-ink-50 p-4">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-extrabold text-ink-900">
                <span>Datos de cajas (actual)</span>
                <span className="text-xs font-semibold text-ink-500">
                  {boxTypes.length > 0 ? `${boxTypes.length} tipos` : ""}
                </span>
              </summary>

              <div className="mt-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-ink-500">
                    Valores usados para el cálculo
                  </div>
                  {/* Botón para configurar cajas */}
                  <button
                    type="button"
                    onClick={openBoxTypesModal}
                    className="inline-flex w-auto items-center justify-center rounded-lg border border-ink-200 bg-yellow-400 p-1.5 text-xs font-extrabold text-ink-800 hover:bg-yellow-500"
                  >
                    Configurar cajas
                  </button>

                  {/* Botón actualizar */}

                  {/*<button
                    type="button"
                    onClick={fetchBoxTypes}
                    className="rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-xs font-extrabold text-ink-800 hover:bg-ink-50"
                  >
                    Actualizar
                  </button>*/}
                </div>

                {loadingBoxTypes ? (
                  <div className="mt-2 text-sm text-ink-500">Cargando…</div>
                ) : boxTypesError ? (
                  <div className="mt-2 text-xs font-semibold text-red-600">{boxTypesError}</div>
                ) : boxTypes.length === 0 ? (
                  <div className="mt-2 text-sm text-ink-500">No hay tipos de caja cargados.</div>
                ) : (
                  <div className="mt-3 grid gap-3">
                    {boxTypes.map((b) => (
                      <div key={b.id} className="rounded-xl bg-white p-3 ring-1 ring-ink-100">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-extrabold text-ink-900">{b.name}</div>
                          <span className="text-xs font-semibold text-ink-500">{b.code}</span>
                        </div>
                        <div className="mt-2 text-xs text-ink-600">
                          {b.length_cm}×{b.width_cm}×{b.height_cm} cm ·{" "}
                          {Number(b.weight_kg).toFixed(2)} kg/caja
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-2 text-xs text-ink-500">
                  Estos valores se usan para calcular capas, altura y peso.
                </div>
              </div>
            </details>

            {/* Cantidades */}
            <div className="grid grid-cols-3 gap-3">
              <Field label="Mini PCs" error={errors.mini_pc}>
                <input
                  type="number"
                  min="0"
                  value={data.mini_pc}
                  onChange={(e) => setData("mini_pc", Number(e.target.value))}
                  className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
                />
              </Field>

              <Field label="Torres" error={errors.tower}>
                <input
                  type="number"
                  min="0"
                  value={data.tower}
                  onChange={(e) => setData("tower", Number(e.target.value))}
                  className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
                />
              </Field>

              <Field label="Portátiles" error={errors.laptop}>
                <input
                  type="number"
                  min="0"
                  value={data.laptop}
                  onChange={(e) => setData("laptop", Number(e.target.value))}
                  className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
                />
              </Field>
            </div>
            {boxTypesDirtyNotice && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                Has modificado la configuración de cajas. Pulsa <b>Calcular</b> para recalcular con los nuevos datos.
              </div>
            )}
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex w-full items-center justify-center rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing ? "Calculando..." : "Calcular"}
            </button>

            {/** Aqui estaba el boton Excel */}

            {exportError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                {exportError}
              </div>
            )}
          </form>
        </Card>

        {/* Panel derecho */}
        <Card className="p-5">
          <div className="mx-auto flex items-center justify-center px-4 py-2">
            <div className="h-12 w-52 overflow-hidden flex items-center justify-center">
              <img
                src="/palletizer.png"
                alt="Palletizer"
                className="h-30 mt-1 w-auto object-contain"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-ink-900">Resultado</h2>
            {best && <Pill>Óptimo</Pill>}
          </div>

          {!result ? (
            <div className="mt-4 rounded-xl border border-dashed border-ink-200 bg-ink-50 p-6 text-sm text-ink-600">
              Introduce los datos y pulsa <b>Calcular</b>.
            </div>
          ) : result?.plan?.error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {result.plan.error}
            </div>
          ) : best ? (
            <div className="mt-4 space-y-4">
              {warnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="font-extrabold">¡Atención!</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {warnings.map((w, i) => (
                      <li key={i}>
                        {w.message}
                        {w?.details?.boxes !== undefined && (
                          <span className="text-amber-800">
                            {" "} (último pallet: {w.details.boxes} cajas)
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Pallets" value={fmtNum(best.pallet_count)} />
                {/* Sin desglose en caso plan mixto */}
                <Stat label="€/pallet" value={fmtEUR(pricePerPallet(best))} />

                {/* Con desglose en caso plan mixto */}
                {/**
                 * <Stat
                      label="€/pallet"
                      value={fmtEUR(pricePerPallet(best))}
                      sub={best?.metrics?.mixed ? mixedBreakdownSub(best) : null}
                    />
                 */}
                <Stat label="Total" value={fmtEUR(best.total_price)} />
              </div>

              <div className="rounded-xl border border-ink-100 p-4">
                <div className="text-sm font-extrabold text-ink-900">{best.pallet_type_name}</div>
                <div className="mt-1 text-xs text-ink-500">
                  Destino: {result.province} · Zona {result.zone_id}
                </div>
              </div>

              {/* RECOMENDACIONES */}
              {recommendations.length > 0 && (
                <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                  <div className="text-sm font-extrabold text-ink-900">Recomendaciones</div>

                  <div className="mt-2 space-y-2">
                    {recommendations.map((r, idx) => (
                      <div key={idx} className="rounded-xl bg-white p-3 ring-1 ring-yellow-200">
                        <div className="text-sm font-semibold text-ink-800">{r.message}</div>

                        <div className="mt-1 text-xs text-ink-600">
                          Diferencia: <b>{Number(r.delta_pct).toFixed(2)}%</b> ·
                          Best: <b>{fmtEUR(r.best_total)}</b> ·
                          Alt: <b>{fmtEUR(r.alt_total)}</b>
                          {r?.alt?.pallet_count !== undefined ? (
                            <>
                              {" "}· Pallets alt: <b>{fmtNum(r.alt.pallet_count)}</b>
                            </>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 text-xs text-ink-600">
                    Sugerencia: si la diferencia es pequeña, a veces compensa por facilidad de montaje o para evitar pallets muy vacíos.
                  </div>
                </div>
              )}

              {/* Distribución */}
              {Array.isArray(best.pallets) && best.pallets.length > 0 && (
                <details className="rounded-xl border border-ink-100 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-ink-800">
                    Distribución por pallet (primeros 10)
                  </summary>

                  <div className="mt-4 space-y-3">
                    {best.pallets.slice(0, 10).map((p, idx) => (
                      <div key={idx} className="rounded-xl border border-ink-100 bg-ink-50 p-4">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                          <div className="font-extrabold text-ink-900">Pallet #{idx + 1}</div>
                          <div>Torres: <b>{p.tower}</b></div>
                          <div>Portátiles: <b>{p.laptop}</b></div>
                          <div>Minis: <b>{p.mini_pc}</b></div>
                          {"separators_used" in p && (
                            <div className="text-ink-600">
                              Separadores: <b>{p.separators_used}</b>
                            </div>
                          )}
                          {p.remaining_capacity?.height_cm_left !== undefined && (
                            <div className="text-ink-600">
                              Altura libre: <b>{p.remaining_capacity.height_cm_left}</b> cm · Peso libre:{" "}
                              <b>{p.remaining_capacity.weight_kg_left}</b> kg
                            </div>
                          )}
                        </div>

                        {Array.isArray(p.layers) && p.layers.length > 0 && (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-sm font-semibold text-ink-800">
                              Ver capas
                            </summary>

                            <div className="mt-3 space-y-2">
                              {p.layers.map((layer, i) => (
                                <div key={i} className="rounded-lg bg-white p-3 ring-1 ring-ink-100">
                                  <div className="text-xs text-ink-500">
                                    Capa {i + 1} · Base <b>{layer.base_type}</b> · altura {layer.height_cm} cm · peso{" "}
                                    {layer.weight_kg} kg
                                    {layer.needs_separator ? " · separador" : ""}
                                    {layer.slots_empty > 0 ? ` · huecos ${layer.slots_empty}` : ""}
                                  </div>
                                  <div className="mt-1 text-sm text-ink-800">
                                    Torres: <b>{layer.counts?.tower ?? 0}</b> · Portátiles:{" "}
                                    <b>{layer.counts?.laptop ?? 0}</b> · Minis: <b>{layer.counts?.mini_pc ?? 0}</b>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* MÉTRICAS (bonitas) */}

              {metrics && (() => {
                const isMixed = !!metrics?.mixed;
                const mixTypes = metrics?.types || null;
                const mixCosts = metrics?.cost_breakdown || null;
                return (
                  <details className="rounded-xl border border-ink-100 p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-ink-800">
                      Métricas de cálculo
                    </summary>


                    <div className="mt-4 space-y-4">
                      {/* Ficha del pallet */}
                      {palletMeta && (
                        <div className="rounded-xl border border-ink-100 bg-ink-50 p-4">
                          <div className="text-sm font-extrabold text-ink-900">Pallet (límites)</div>
                          <div className="mt-3 grid gap-3 sm:grid-cols-4">
                            <Stat label="L (cm)" value={fmtNum(palletMeta.L_cm ?? palletMeta.L)} />
                            <Stat label="W (cm)" value={fmtNum(palletMeta.W_cm ?? palletMeta.W)} />
                            <Stat label="H máx (cm)" value={fmtNum(palletMeta.H_cm ?? palletMeta.H)} />
                            <Stat label="Kg máx" value={fmtNum(palletMeta.max_kg ?? palletMeta.kg)} />
                          </div>
                        </div>
                      )}

                      {isMixed && (
                        <div className="rounded-xl border border-ink-100 bg-ink-50 p-4">
                          <div className="text-sm font-extrabold text-ink-900">Plan mixto</div>

                          {mixTypes && (
                            <div className="mt-3 overflow-x-auto">
                              <table className="min-w-[420px] w-full border-separate border-spacing-0">
                                <thead>
                                  <tr className="text-left text-xs text-ink-500">
                                    <th className="py-2 pr-3">Tipo</th>
                                    <th className="py-2 pr-3">Pallets</th>
                                    <th className="py-2 pr-3">Coste</th>
                                  </tr>
                                </thead>
                                <tbody className="text-sm text-ink-800">
                                  {Object.entries(mixTypes).map(([code, count]) => (
                                    <tr key={code} className="border-t border-ink-100">
                                      <td className="py-2 pr-3 font-semibold">{code}</td>
                                      <td className="py-2 pr-3">{count}</td>
                                      <td className="py-2 pr-3">{fmtEUR(mixCosts?.[code])}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          <div className="mt-3 text-xs text-ink-500">
                            Nota: en planes mixtos el “€/pallet” mostrado es el promedio (total / nº pallets).
                          </div>
                        </div>
                      )}


                      {/* Datos por tipo */}
                      {perType && (
                        <div className="rounded-xl border border-ink-100 p-4">
                          <div className="text-sm font-extrabold text-ink-900">Cajas por tipo</div>
                          <div className="mt-3 overflow-x-auto">
                            <table className="min-w-[520px] w-full border-separate border-spacing-0">
                              <thead>
                                <tr className="text-left text-xs text-ink-500">
                                  <th className="py-2 pr-3">Tipo</th>
                                  <th className="py-2 pr-3">Cajas/capa</th>
                                  <th className="py-2 pr-3">Altura (cm)</th>
                                  <th className="py-2 pr-3">Peso/caja (kg)</th>
                                </tr>
                              </thead>
                              <tbody className="text-sm text-ink-800">
                                {["tower", "laptop", "mini_pc"].map((code) => {
                                  const t = perType?.[code];
                                  if (!t) return null;
                                  return (
                                    <tr key={code} className="border-t border-ink-100">
                                      <td className="py-2 pr-3 font-semibold">
                                        {code === "tower"
                                          ? "Torres"
                                          : code === "laptop"
                                            ? "Portátiles"
                                            : "Mini PCs"}
                                      </td>
                                      <td className="py-2 pr-3">{fmtNum(t.per_layer)}</td>
                                      <td className="py-2 pr-3">{fmtNum(t.height_cm)}</td>
                                      <td className="py-2 pr-3">{fmtNum(t.weight_kg)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Nota */}
                      {metrics?.note && (
                        <div className="text-xs text-ink-500">
                          <b>Nota:</b> {metrics.note}
                        </div>
                      )}
                    </div>
                  </details>
                );
              })()}

              {/* ALTERNATIVAS (tabla) */}
              {alternatives.length > 0 && (
                <details className="rounded-xl border border-ink-100 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-ink-800">
                    Alternativas
                  </summary>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-[620px] w-full border-separate border-spacing-0">
                      <thead>
                        <tr className="text-left text-xs text-ink-500">
                          <th className="py-2 pr-3">Tipo</th>
                          <th className="py-2 pr-3">Pallets</th>
                          <th className="py-2 pr-3">€/pallet</th>
                          <th className="py-2 pr-3">Total</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-ink-800">
                        {alternatives.map((a, idx) => (
                          <tr key={idx} className="border-t border-ink-100">
                            <td className="py-2 pr-3 font-semibold">{a.pallet_type_name}</td>
                            <td className="py-2 pr-3">{fmtNum(a.pallet_count)}</td>
                            <td className="py-2 pr-3">
                              <div className="text-sm font-semibold text-ink-800">
                                {fmtEUR(pricePerPallet(a))}
                              </div>

                              {/* Desglosa los costes en las alternativas */}

                              {/* {(a.price_per_pallet === null || a.price_per_pallet === undefined) && (
                                <div className="mt-1 text-xs text-ink-500">
                                  {a.metrics?.cost_breakdown && (
                                    <div className="mt-1">
                                      {Object.entries(a.metrics.cost_breakdown).map(([code, cost]) => (
                                        <div key={code}>
                                          {code}: <b>{fmtEUR(cost)}</b>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}*/}
                            </td>


                            <td className="py-2 pr-3">{fmtEUR(a.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 text-xs text-ink-500">
                    Consejo: si una alternativa es muy parecida en coste, a veces compensa por facilidad de montaje
                    (menos capas mixtas / menos separadores).
                  </div>
                </details>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-500">Aún no has calculado nada. Envía el formulario.</p>
          )}

          <div className="mt-24 flex items-end justify-end gap-3 -p-1">
            <button
              type="button"
              onClick={exportBestPlanExcel}
              disabled={!canSubmit || exporting}
              className="inline-flex w-auto items-center justify-center rounded-xl border border-ink-200 bg-red-500 px-4 py-2.5 text-sm font-extrabold text-ink-900 shadow-soft transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? "Exportando…" : "Exportar PDF"}
            </button>
            <button
              type="button"
              onClick={exportBestPlanExcel}
              disabled={!canSubmit || exporting}
              className="inline-flex w-auto items-center justify-center rounded-xl border border-ink-200 bg-green-500 px-4 py-2.5 text-sm font-extrabold text-ink-900 shadow-soft transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? "Exportando…" : "Exportar Excel"}
            </button>
          </div>
        </Card>
      </div>
      {boxModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onMouseDown={closeBoxTypesModal}
          />

          {/* Modal */}
          <div className="relative z-10 w-[min(980px,92vw)] rounded-2xl bg-white shadow-soft ring-1 ring-ink-100">
            <div className="flex items-start justify-between gap-4 border-b border-ink-100 p-5">
              <div>
                <div className="text-lg font-extrabold text-ink-900">Configuración de cajas</div>
                <div className="mt-1 text-sm text-ink-500">
                  Cambia dimensiones y peso por tipo. Afecta a la simulación.
                </div>
              </div>

              <button
                type="button"
                onClick={closeBoxTypesModal}
                className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-extrabold text-ink-800 hover:bg-ink-50"
              >
                Cerrar
              </button>
            </div>

            <div className="p-5">
              {loadingBoxTypes ? (
                <div className="text-sm text-ink-500">Cargando…</div>
              ) : boxTypesError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {boxTypesError} (revisa GET /api/box-types)
                </div>
              ) : boxTypes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50 p-6 text-sm text-ink-600">
                  No hay tipos de caja en la base de datos.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[860px] w-full border-separate border-spacing-0">
                    <thead>
                      <tr className="text-left text-xs text-ink-500">
                        <th className="py-2 pr-3">Código</th>
                        <th className="py-2 pr-3">Nombre</th>
                        <th className="py-2 pr-3">L (cm)</th>
                        <th className="py-2 pr-3">W (cm)</th>
                        <th className="py-2 pr-3">H (cm)</th>
                        <th className="py-2 pr-3">Peso (kg)</th>
                        <th className="py-2 pr-3"></th>
                      </tr>
                    </thead>

                    <tbody className="text-sm text-ink-800">
                      {boxTypes.map((b) => {
                        const saving = !!savingBoxById[b.id];
                        const msg = boxMsgById[b.id];

                        const L = Number(b.length_cm);
                        const W = Number(b.width_cm);
                        const H = Number(b.height_cm);
                        const KG = Number(b.weight_kg);

                        const rowValid =
                          b.name && b.name.trim().length > 0 &&
                          Number.isFinite(L) && L > 0 &&
                          Number.isFinite(W) && W > 0 &&
                          Number.isFinite(H) && H > 0 &&
                          Number.isFinite(KG) && KG > 0;


                        return (
                          <tr key={b.id} className="border-t border-ink-100">
                            <td className="py-3 pr-3 font-semibold">{b.code}</td>

                            <td className="py-3 pr-3">
                              <input
                                value={b.name ?? ""}
                                onChange={(e) => onBoxChange(b.id, "name", e.target.value)}
                                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
                              />
                            </td>

                            <td className="py-3 pr-3">
                              <input
                                type="number"
                                min="1"
                                value={b.length_cm ?? ""}
                                onChange={(e) => onBoxChange(b.id, "length_cm", e.target.value)}
                                className="w-28 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
                              />
                            </td>

                            <td className="py-3 pr-3">
                              <input
                                type="number"
                                min="1"
                                value={b.width_cm ?? ""}
                                onChange={(e) => onBoxChange(b.id, "width_cm", e.target.value)}
                                className="w-28 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
                              />
                            </td>

                            <td className="py-3 pr-3">
                              <input
                                type="number"
                                min="1"
                                value={b.height_cm ?? ""}
                                onChange={(e) => onBoxChange(b.id, "height_cm", e.target.value)}
                                className="w-28 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
                              />
                            </td>

                            <td className="py-3 pr-3">
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={b.weight_kg ?? ""}
                                onChange={(e) => onBoxChange(b.id, "weight_kg", e.target.value)}
                                className="w-32 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
                              />
                            </td>

                            <td className="py-3 pr-3">
                              <div className="flex items-center justify-end gap-3">
                                {msg?.type === "ok" ? (
                                  <span className="text-xs font-extrabold text-green-700">{msg.text}</span>
                                ) : msg?.type === "err" ? (
                                  <span className="text-xs font-extrabold text-red-600">{msg.text}</span>
                                ) : null}

                                {!rowValid && (
                                  <div className="mt-1 text-xs font-semibold text-red-600">
                                    Revisa nombre, medidas y peso (deben ser &gt; 0).
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => saveBoxType(b)}
                                  disabled={!rowValid || saving}
                                  className="rounded-xl bg-ink-900 px-3 py-2 text-xs font-extrabold text-white shadow-soft transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {saving ? "Guardando…" : "Guardar"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="mt-3 text-xs text-ink-500">
                    Recomendación: usa medidas reales de caja (no del equipo) y un peso medio por tipo.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
