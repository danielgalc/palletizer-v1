import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

  // Si viene un €/pallet directo, úsalo
  if (plan.price_per_pallet !== null && plan.price_per_pallet !== undefined) {
    const v = Number(plan.price_per_pallet);
    return Number.isFinite(v) ? v : null;
  }

  // Si no, usa media: total / pallets
  const total = Number(plan.total_price);
  const count = Number(plan.pallet_count ?? plan.pallets_count);

  if (!Number.isFinite(total) || !Number.isFinite(count) || count <= 0) return null;

  return total / count;
}

function splitTypeLabel(typeName) {
  const s = String(typeName ?? "").trim();
  if (!s) return { short: "—", detail: "" };

  // Caso típico: "120×100 cm (220cm altura, 750kg)"
  const idx = s.indexOf("(");
  if (idx > 0) {
    return {
      short: s.slice(0, idx).trim(),
      detail: s.slice(idx).trim(),
    };
  }

  // Caso mixto: "6× 120×100 (...) + 1× 120×100 (...)"
  // Si es muy largo, lo dejamos todo en detail y sacamos un short resumido.
  if (s.length > 52) {
    return { short: s.slice(0, 52).trim() + "…", detail: s };
  }

  return { short: s, detail: "" };
}

function compactCarrierBadge(isOtherCarrier) {
  return isOtherCarrier
    ? "inline-flex items-center rounded-full bg-yellow-50 px-2 py-0.5 text-[10px] font-extrabold text-ink-700 ring-1 ring-ink-100"
    : "inline-flex items-center rounded-full bg-ink-50 px-2 py-0.5 text-[10px] font-extrabold text-ink-700 ring-1 ring-ink-100";
}

/**
 * Formatea el tipo de pallet con un formato limpio y no redundante.
 *
 * PLANES MONO-TIPO:
 * - Con nombre comercial: "Light Pallet — 120×100 cm (220cm altura, 750kg)"
 * - Sin nombre comercial: "120×100 cm (220cm altura, 750kg)"
 *
 * PLANES MIXTOS (compacto):
 * - "7× Extra Light + 1× Light Pallet"
 * - "5× 120×100 (220cm, 750kg) + 1× 120×100 (220cm, 1200kg)" (si no hay nombres)
 */
function formatPalletType(plan) {
  if (!plan) return "—";

  // CASO 1: Plan mixto (tiene objeto mix)
  if (plan.mix && typeof plan.mix === "object") {
    const parts = [];

    // Procesar tipo A
    if (plan.mix.a) {
      const a = plan.mix.a;
      const countA = a.pallet_count || 0;
      const nameA = a.carrier_rate_name || a.pallet_type_name || "—";

      parts.push(`${countA}× ${nameA}`);
    }

    // Procesar tipo B
    if (plan.mix.b) {
      const b = plan.mix.b;
      const countB = b.pallet_count || 0;
      const nameB = b.carrier_rate_name || b.pallet_type_name || "—";

      parts.push(`${countB}× ${nameB}`);
    }

    return parts.join(" + ");
  }

  // CASO 2: Plan mono-tipo
  const technical = plan.pallet_type_name || "—";
  const commercial = plan.carrier_rate_name;

  // Extraer dimensiones del formato técnico: "120×100 (220cm, 750kg)"
  // Para convertirlo a: "120×100 cm (220cm altura, 750kg)"
  const enhancedTech = technical.replace(
    /(\d+×\d+)\s*\((\d+)cm,\s*(\d+)kg\)/,
    "$1 cm ($2cm altura, $3kg)"
  );

  if (commercial) {
    return `${commercial} — ${enhancedTech}`;
  }

  return enhancedTech;
}

function getPalletCounts(p) {
  // Formato nuevo: p.boxes = {tower,laptop,mini_pc}
  if (p && typeof p === "object" && p.boxes && typeof p.boxes === "object") {
    return {
      tower: Number(p.boxes.tower ?? 0),
      laptop: Number(p.boxes.laptop ?? 0),
      mini_pc: Number(p.boxes.mini_pc ?? 0),
    };
  }

  // Formato viejo: p.tower, p.laptop, p.mini_pc
  return {
    tower: Number(p?.tower ?? 0),
    laptop: Number(p?.laptop ?? 0),
    mini_pc: Number(p?.mini_pc ?? 0),
  };
}

function getLayerBaseType(layer) {
  // Viejo: base_type
  if (layer?.base_type) return String(layer.base_type);

  // Nuevo: type
  if (layer?.type) return String(layer.type);

  return "—";
}

function getLayerCounts(layer) {
  // Viejo: counts ya viene montado
  if (layer?.counts && typeof layer.counts === "object") {
    return {
      tower: Number(layer.counts.tower ?? 0),
      tower_sff: Number(layer.counts.tower_sff ?? 0),
      laptop: Number(layer.counts.laptop ?? 0),
      mini_pc: Number(layer.counts.mini_pc ?? 0),
    };
  }

  // Nuevo: {type,count} + mixed:[{type,count}] + vertical:[{type,count}]
  const counts = { tower: 0, tower_sff: 0, laptop: 0, mini_pc: 0 };

  const t = layer?.type;
  const c = Number(layer?.count ?? 0);
  if (t && t in counts) counts[t] += c;

  if (Array.isArray(layer?.mixed)) {
    for (const m of layer.mixed) {
      const mt = m?.type;
      const mc = Number(m?.count ?? 0);
      if (mt && mt in counts) counts[mt] += mc;
    }
  }

  // Cajas verticales — se suman al total por tipo
  if (Array.isArray(layer?.vertical)) {
    for (const v of layer.vertical) {
      const vt = v?.type;
      const vc = Number(v?.count ?? 0);
      if (vt && vt in counts) counts[vt] += vc;
    }
  }

  return counts;
}

function computeLayerHeightKg(layer, perType) {
  // Si backend ya lo trae, úsalo (priorizando weight_g)
  const h = layer?.height_cm;

  const g = layer?.weight_g;
  const kg = layer?.weight_kg;

  if (h !== undefined || g !== undefined || kg !== undefined) {
    const weightFromG =
      g !== undefined && g !== null && Number.isFinite(Number(g))
        ? Number(g) / 1000
        : null;

    return {
      height_cm: h !== undefined ? Number(h) : null,
      // Si existe weight_g, manda; si no, usa weight_kg
      weight_kg: weightFromG !== null ? weightFromG : (kg !== undefined ? Number(kg) : null),
    };
  }

  // Si no, intenta derivarlo desde perType
  if (!perType) return { height_cm: null, weight_kg: null };

  const counts = getLayerCounts(layer);
  const base = getLayerBaseType(layer);

  const baseH = perType?.[base]?.height_cm;
  const height_cm = baseH !== undefined ? Number(baseH) : null;

  let weight_kg = 0;
  let ok = false;
  for (const k of ["tower", "laptop", "mini_pc"]) {
    const wg = perType?.[k]?.weight_g;
    const wk = perType?.[k]?.weight_kg;

    if (wg !== undefined && wg !== null) {
      ok = true;
      weight_kg += (Number(wg) / 1000) * Number(counts[k] ?? 0);
      continue;
    }

    if (wk !== undefined && wk !== null) {
      ok = true;
      weight_kg += Number(wk) * Number(counts[k] ?? 0);
    }
  }

  if (!ok) weight_kg = null;

  return { height_cm, weight_kg };
}

function computeRemainingCapacity(p, palletMeta) {
  // 1) Si backend ya lo trae
  const rc = p?.remaining_capacity;
  if (rc && typeof rc === "object") {
    const h = rc.height_cm_left ?? rc.height_left_cm ?? rc.h_left_cm;
    const w = rc.weight_kg_left ?? rc.weight_left_kg ?? rc.w_left_kg;
    if (h !== undefined || w !== undefined) {
      return {
        height_cm_left: h !== undefined ? Number(h) : null,
        weight_kg_left: w !== undefined ? Number(w) : null,
      };
    }
  }

  // 2) Si no lo trae, intenta derivarlo con palletMeta + p.height_cm/p.weight_kg
  const Hmax = palletMeta?.H_cm ?? palletMeta?.H ?? palletMeta?.max_height_cm;

  const KgMax = palletMeta?.max_kg ?? palletMeta?.kg ?? palletMeta?.max_weight_kg;
  // NUEVO (exacto): gramos
  const Gmax = palletMeta?.max_weight_g ?? palletMeta?.maxWeightG ?? null;

  const usedH = p?.height_cm;
  const usedKg = p?.weight_kg;
  // NUEVO (exacto): gramos usados del pallet
  const usedG = p?.weight_g ?? p?.weightG ?? null;


  if (Hmax !== undefined && usedH !== undefined) {
    const height_cm_left = Number(Hmax) - Number(usedH);
    let weight_g_left = null;
    let weight_kg_left = null;

    // 1) Si tenemos gramos, usar eso (exacto)
    if (Gmax !== null && usedG !== null && Gmax !== undefined && usedG !== undefined) {
      const gLeft = Number(Gmax) - Number(usedG);
      if (Number.isFinite(gLeft)) {
        weight_g_left = Math.max(0, Math.round(gLeft)); // entero
        weight_kg_left = weight_g_left / 1000;
      }
    } else if (KgMax !== undefined && usedKg !== undefined) {
      // 2) Fallback legacy (float)
      const wLeft = Number(KgMax) - Number(usedKg);
      weight_kg_left = Number.isFinite(wLeft) ? Math.max(0, wLeft) : null;
    }

    return {
      height_cm_left: Number.isFinite(Number(Hmax) - Number(usedH)) ? Math.max(0, Number(Hmax) - Number(usedH)) : null,
      weight_g_left,
      weight_kg_left,
    };
  }

  return { height_cm_left: null, weight_kg_left: null };
}

export default function Index({ result }) {
  const { data, setData, post, processing, errors } = useForm({
    country_code: "",
    zone_id: null,
    province_id: null,

    // Líneas dinámicas por modelo/equipo
    lines: [{ device_model_id: null, qty: 0 }],

    // Se mantiene mientras espera equipos
    mini_pc: 0,
    tower: 0,
    tower_sff: 0,
    laptop: 0,

    allow_separators: true,

    // Selección de cajas por tipo lógico (box_variants)
    packaging: { tower: null, tower_sff: null, laptop: null, mini_pc: null },

    carrier_mode: "auto", // auto | manual
    carrier_ids: [],
  });


  const [provinces, setProvinces] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [provincesError, setProvincesError] = useState(null);

  // Device models
  const [deviceModels, setDeviceModels] = useState([]);
  const [loadingDeviceModels, setLoadingDeviceModels] = useState(false);
  const [deviceModelsError, setDeviceModelsError] = useState(null);

  const deviceModelsById = useMemo(() => {
    const m = new Map();
    for (const dm of deviceModels) {
      if (dm && dm.id != null) m.set(Number(dm.id), dm);
    }
    return m;
  }, [deviceModels]);

  const modelsSummaryRows = useMemo(() => {
    const lines = Array.isArray(data.lines) ? data.lines : [];

    // Agrupar por device_model_id y sumar qty (solo qty > 0)
    const acc = new Map();

    for (const l of lines) {
      const id = Number(l?.device_model_id ?? 0);
      const qty = Number(l?.qty ?? 0);
      if (!id || !Number.isFinite(qty) || qty <= 0) continue;

      const dm = deviceModelsById.get(id);
      const brand = (l?.brand || dm?.brand || "—").trim();
      const name = (dm?.name || "—").trim();

      const key = String(id);
      const prev = acc.get(key);
      if (prev) {
        prev.qty += qty;
      } else {
        acc.set(key, { id, brand, name, qty });
      }
    }

    // Orden: marca -> modelo
    return Array.from(acc.values()).sort((a, b) => {
      const c1 = a.brand.localeCompare(b.brand);
      if (c1 !== 0) return c1;
      return a.name.localeCompare(b.name);
    });
  }, [data.lines, deviceModelsById]);


  // Autocomplete zonas
  const [zoneQuery, setZoneQuery] = useState("");
  const [zoneOpen, setZoneOpen] = useState(false);
  const [zoneHighlightIndex, setZoneHighlightIndex] = useState(0);
  const zoneRef = useRef(null);

  // Autocomplete provincias
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

  // --- Packaging (box_variants + providers + stock) ---
  const [boxProviders, setBoxProviders] = useState([]);
  const [boxVariants, setBoxVariants] = useState([]);
  const [loadingPackaging, setLoadingPackaging] = useState(false);
  const [packagingError, setPackagingError] = useState(null);

  // Filtros por tipo (kind): condición + proveedor
  const [packFilters, setPackFilters] = useState({
    tower:     { condition: "", provider_id: null },
    tower_sff: { condition: "", provider_id: null },
    laptop:    { condition: "", provider_id: null },
    mini_pc:   { condition: "", provider_id: null },
  });

  // Estado de guardado/disponibilidad por variante
  const [savingStockByVariantId, setSavingStockByVariantId] = useState({});
  const [stockMsgByVariantId, setStockMsgByVariantId] = useState({});


  // --- Model modal ---
  const [openModelRowIdx, setOpenModelRowIdx] = useState(null);
  const modelRowRefs = useRef({});
  const modelDropdownRef = useRef(null);
  const modelsModalBodyRef = useRef(null);

  const [modelsModalOpen, setModelsModalOpen] = useState(false);

  // Dropdown (portal) del modelo: se pinta fuera del overflow del modal
  const [modelDropdown, setModelDropdown] = useState({
    idx: null,
    rect: null, // { left, top, width, height }
    items: [],
    open: false,
  });

  const openModelsModal = () => setModelsModalOpen(true);
  const closeModelsModal = () => {
    setModelsModalOpen(false);
    setOpenModelRowIdx(null);
    setModelDropdown((s) => ({ ...s, open: false, items: [], idx: null, rect: null }));
  };


  // Exportacion de docs
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  // Countries y zones
  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [countriesError, setCountriesError] = useState(null);

  const [zones, setZones] = useState([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [zonesError, setZonesError] = useState(null);

  const [boxTypesDirtyNotice, setBoxTypesDirtyNotice] = useState(false);

  // Carriers
  const [carriers, setCarriers] = useState([]);
  const [loadingCarriers, setLoadingCarriers] = useState(false);
  const [carriersError, setCarriersError] = useState(null);

  // Alternativas
  const [openAltRows, setOpenAltRows] = useState(() => ({}));

  const toggleAltRow = (key) => {
    setOpenAltRows((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchPackagingData = async () => {
    setLoadingPackaging(true);
    setPackagingError(null);

    try {
      const [rp, rv] = await Promise.all([
        fetch("/api/box-providers"),
        fetch("/api/box-variants?only_active=1"),
      ]);

      if (!rp.ok) throw new Error("No se pudieron cargar los proveedores de cajas");
      if (!rv.ok) throw new Error("No se pudieron cargar las cajas disponibles");

      const providers = await rp.json();
      const variants = await rv.json();

      const provList = Array.isArray(providers) ? providers : [];
      const varList = Array.isArray(variants) ? variants : [];

      setBoxProviders(provList);
      setBoxVariants(varList);

      // Ajusta condition y provider default por tipo
      setPackFilters((prev) => {
        const next = { ...prev };
        const kinds = ["tower", "laptop", "mini_pc"];
        for (const k of kinds) {
          const currentCondition = next?.[k]?.condition ?? "";
          const currentProvider = next?.[k]?.provider_id ?? null;

          // Si no hay condición seleccionada, tomar la primera disponible para este kind
          const conditionsForKind = [
            ...new Set(
              varList
                .filter((v) => v.kind === k)
                .map((v) => String(v.condition))
                .filter(Boolean)
            ),
          ];
          // Prioridad: new > reused
          const preferredOrder = ["new", "reused"];
          const firstCondition =
            conditionsForKind.find((c) => preferredOrder.includes(c)) ??
            conditionsForKind[0] ??
            "";

          const effectiveCondition =
            currentCondition && conditionsForKind.includes(currentCondition)
              ? currentCondition
              : firstCondition;

          // Calcular provider para esa condición
          const candidates = varList.filter(
            (v) => v.kind === k && (!effectiveCondition || v.condition === effectiveCondition)
          );
          const providerIds = [
            ...new Set(
              candidates
                .map((v) => Number(v.provider_id))
                .filter((n) => Number.isFinite(n))
            ),
          ];
          const first = providerIds.length > 0 ? providerIds[0] : null;

          next[k] = {
            condition: effectiveCondition,
            provider_id:
              currentProvider && providerIds.includes(Number(currentProvider))
                ? currentProvider
                : first,
          };
        }
        return next;
      });
    } catch (e) {
      setPackagingError(e.message || "Error cargando cajas");
    } finally {
      setLoadingPackaging(false);
    }
  };

  const setPackFilter = (kind, patch) => {
    setPackFilters((prev) => ({
      ...prev,
      [kind]: { ...(prev?.[kind] || {}), ...patch },
    }));
  };

  const selectPackagingVariant = (kind, variantId) => {
    const id = variantId ? Number(variantId) : null;
    setData("packaging", {
      ...(data.packaging || { tower: null, tower_sff: null, laptop: null, mini_pc: null }),
      [kind]: Number.isFinite(id) ? id : null,
    });
  };

  const toggleVariantAvailability = async (variantId) => {
    const id = Number(variantId);
    if (!Number.isFinite(id)) return;

    // Determinar estado actual desde boxVariants
    const current = boxVariants.find((v) => Number(v.id) === id);
    const currentQty = Number(current?.on_hand_qty ?? 0);
    // Si tiene stock → poner a 0 (no disponible). Si no tiene → poner a 1 (disponible).
    const nextQty = currentQty > 0 ? 0 : 1;

    setSavingStockByVariantId((p) => ({ ...p, [id]: true }));

    try {
      const res = await fetch(`/api/box-variants/${id}/stock`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on_hand_qty: nextQty }),
      });

      if (!res.ok) throw new Error("No se pudo actualizar la disponibilidad");
      const updated = await res.json();

      setBoxVariants((prev) =>
        prev.map((v) => (Number(v.id) === id ? { ...v, ...updated } : v))
      );
    } catch (e) {
      setStockMsgByVariantId((p) => ({ ...p, [id]: e.message || "Error" }));
      setTimeout(() => setStockMsgByVariantId((p) => ({ ...p, [id]: "" })), 2000);
    } finally {
      setSavingStockByVariantId((p) => ({ ...p, [id]: false }));
    }
  };

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

    // Cargar variantes/proveedores para selección real de cajas
    if (boxProviders.length === 0 || boxVariants.length === 0) {
      await fetchPackagingData();
    }

    // Mantener fallback (box_types) por si no se seleccionan cajas
    if (boxTypes.length === 0) {
      await fetchBoxTypes();
    }
  };


  const closeBoxTypesModal = () => {
    setBoxModalOpen(false);
  };

  const onBoxChange = (id, field, value) => {
    setBoxTypes((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
    setBoxTypesDirtyNotice(true);
  };

  const saveBoxType = async (id) => {
    const box = boxTypes.find((b) => b.id === id);
    if (!box) return;

    setSavingBoxById((p) => ({ ...p, [id]: true }));
    setBoxMsgById((p) => ({ ...p, [id]: "" }));

    try {
      const res = await fetch(`/api/box-types/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          length_cm: Number(box.length_cm),
          width_cm: Number(box.width_cm),
          height_cm: Number(box.height_cm),
          weight_kg: Number(box.weight_kg),
        }),
      });

      if (!res.ok) {
        let msg = "No se pudo guardar";
        try {
          const j = await res.json();
          msg = j?.message || msg;
        } catch (_) { }
        throw new Error(msg);
      }

      setBoxMsgById((p) => ({ ...p, [id]: "Guardado" }));
      setTimeout(() => setBoxMsgById((p) => ({ ...p, [id]: "" })), 1400);
    } catch (e) {
      setBoxMsgById((p) => ({ ...p, [id]: e.message || "Error" }));
    } finally {
      setSavingBoxById((p) => ({ ...p, [id]: false }));
    }
  };

  // Provincias
  useEffect(() => {
    let cancelled = false;

    fetch("/api/provinces")
      .then((r) => {
        if (!r.ok) throw new Error("No se pudieron cargar provincias");
        return r.json();
      })
      .then((list) => {
        if (cancelled) return;
        setProvinces(Array.isArray(list) ? list : []);
        setLoadingProvinces(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadingProvinces(false);
        setProvincesError(e.message || "Error cargando provincias");
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

  const selectedProvinceObj = useMemo(() => {
    if (data.province_id === null) return null;
    return provinces.find((p) => p.id === data.province_id) || null;
  }, [provinces, data.province_id]);

  useEffect(() => {
    if (selectedProvinceObj && query !== selectedProvinceObj.name) {
      setQuery(selectedProvinceObj.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.province_id]);

  // Cerrar autocomplete al click fuera
  useEffect(() => {
    const onDocClick = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setHighlightIndex(0);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selectProvince = (p) => {
    setData("province_id", p.id);
    setQuery(p.name);
    setIsOpen(false);
    setHighlightIndex(0);
  };

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

  // Autocomplete zonas: click fuera
  useEffect(() => {
    const onDocClick = (e) => {
      if (!zoneRef.current) return;
      if (!zoneRef.current.contains(e.target)) {
        setZoneOpen(false);
        setZoneHighlightIndex(0);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selectedZoneObj = useMemo(() => {
    if (data.zone_id === null) return null;
    return zones.find((z) => z.id === data.zone_id) || null;
  }, [zones, data.zone_id]);

  useEffect(() => {
    if (selectedZoneObj && zoneQuery !== selectedZoneObj.name) {
      setZoneQuery(selectedZoneObj.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.zone_id]);

  const filteredZones = useMemo(() => {
    const q = normalize(zoneQuery);
    if (!q) return zones;

    const starts = [];
    const contains = [];

    for (const z of zones) {
      const nameN = normalize(z.name);
      if (nameN.startsWith(q)) starts.push(z);
      else if (nameN.includes(q)) contains.push(z);
    }

    return [...starts, ...contains].slice(0, 12);
  }, [zones, zoneQuery]);

  const selectZone = (z) => {
    setData("zone_id", z.id);
    setZoneQuery(z.name);
    setZoneOpen(false);
    setZoneHighlightIndex(0);
  };

  const onZoneKeyDown = (e) => {
    if (!zoneOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setZoneOpen(true);
      return;
    }
    if (!zoneOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setZoneHighlightIndex((i) => Math.min(i + 1, filteredZones.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setZoneHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (filteredZones[zoneHighlightIndex]) {
        e.preventDefault();
        selectZone(filteredZones[zoneHighlightIndex]);
      } else {
        setZoneOpen(false);
      }
    } else if (e.key === "Escape") {
      setZoneOpen(false);
    }
  };

  // Cerrar con click fuera el modal de modelos
  useEffect(() => {
    if (!modelsModalOpen) return;

    const onMouseDown = (e) => {
      if (openModelRowIdx === null) return;

      const el = modelRowRefs.current[openModelRowIdx];
      if (!el) {
        setOpenModelRowIdx(null);
        setModelDropdown((s) => ({ ...s, open: false }));
        return;
      }

      const ddEl = modelDropdownRef.current;

      const clickInsideRow = el.contains(e.target);
      const clickInsideDropdown = ddEl ? ddEl.contains(e.target) : false;

      // Si el click NO está dentro de la fila ni del dropdown (portal), cerramos
      if (!clickInsideRow && !clickInsideDropdown) {
        setOpenModelRowIdx(null);
        setModelDropdown((s) => ({ ...s, open: false }));
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [modelsModalOpen, openModelRowIdx]);

  // Cerrar dropdown de modelos con Escape
  useEffect(() => {
    if (!modelsModalOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpenModelRowIdx(null);
        setModelDropdown((s) => ({ ...s, open: false }));
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [modelsModalOpen]);

  // Derivar items del dropdown para la fila abierta y decidir si se abre
  const openLine =
    openModelRowIdx !== null && Array.isArray(data.lines) ? data.lines[openModelRowIdx] : null;

  const openBrand = openLine?.brand ? String(openLine.brand) : "";
  const openQuery = openLine?.model_query ? String(openLine.model_query) : "";
  const openModelId = openLine?.device_model_id ? Number(openLine.device_model_id) : null;

  const modelsForOpenBrand = useMemo(() => {
    if (!openBrand) return [];
    return deviceModels.filter((m) => String(m.brand || "") === openBrand);
  }, [deviceModels, openBrand]);

  const filteredModelsForOpenRow = useMemo(() => {
    if (!openBrand || openModelId) return [];
    const q = normalize(openQuery);
    if (!q) return modelsForOpenBrand.slice(0, 12);

    const starts = [];
    const contains = [];
    for (const m of modelsForOpenBrand) {
      const nameN = normalize(`${m.name ?? ""} ${m.sku ?? ""} ${m.box_type?.code ?? ""}`);
      if (nameN.startsWith(q)) starts.push(m);
      else if (nameN.includes(q)) contains.push(m);
    }
    return [...starts, ...contains].slice(0, 12);
  }, [openBrand, openModelId, openQuery, modelsForOpenBrand]);

  // Actualizar items y estado abierto/cerrado del portal
  useEffect(() => {
    if (!modelsModalOpen) return;

    // Si no hay fila abierta o no hay items, cerramos
    if (openModelRowIdx === null || !openBrand || openModelId || filteredModelsForOpenRow.length === 0) {
      setModelDropdown((s) => ({ ...s, open: false, items: [] }));
      return;
    }

    setModelDropdown((s) => ({
      ...s,
      idx: openModelRowIdx,
      items: filteredModelsForOpenRow,
      open: true,
    }));
  }, [modelsModalOpen, openModelRowIdx, openBrand, openModelId, filteredModelsForOpenRow]);

  // Posicionar el dropdown (portal) debajo del input del modelo
  useEffect(() => {
    if (!modelsModalOpen) return;

    const updatePos = () => {
      if (openModelRowIdx === null) {
        setModelDropdown((s) => ({ ...s, rect: null }));
        return;
      }

      const rowEl = modelRowRefs.current[openModelRowIdx];
      const inputEl = rowEl ? rowEl.querySelector("input") : null;
      if (!inputEl) {
        setModelDropdown((s) => ({ ...s, rect: null }));
        return;
      }

      const r = inputEl.getBoundingClientRect();
      setModelDropdown((s) => ({
        ...s,
        rect: { left: r.left, top: r.top, width: r.width, height: r.height },
      }));
    };

    updatePos();

    const bodyEl = modelsModalBodyRef.current;
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    if (bodyEl) bodyEl.addEventListener("scroll", updatePos, { passive: true });

    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
      if (bodyEl) bodyEl.removeEventListener("scroll", updatePos);
    };
  }, [modelsModalOpen, openModelRowIdx]);





  const addLine = () => {
    const next = Array.isArray(data.lines) ? [...data.lines] : [];
    next.push({ brand: "", device_model_id: null, model_query: "", qty: 0, box_condition: "new" });
    setData("lines", next);
  };

  const removeLine = (idx) => {
    const next = Array.isArray(data.lines) ? data.lines.filter((_, i) => i !== idx) : [];
    setData("lines", next.length > 0 ? next : [{ brand: "", device_model_id: null, model_query: "", qty: 0, box_condition: "new" }]);
  };

  const updateLine = (idx, patch) => {
    const next = Array.isArray(data.lines) ? [...data.lines] : [];
    const curr = next[idx] || { device_model_id: null, qty: 0 };
    next[idx] = { ...curr, ...patch };
    setData("lines", next);
  };


  const submit = (e) => {
    e.preventDefault();
    setBoxTypesDirtyNotice(false);
    setModelsModalOpen(false);

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
      if (!canSubmit) {
        throw new Error("Completa el formulario antes de exportar.");
      }

      const payload = {
        country_code: data.country_code,
        province_id: data.country_code === "ES" ? data.province_id : null,
        zone_id: data.country_code === "ES" ? null : data.zone_id,
        tower: Number(data.tower ?? 0),
        laptop: Number(data.laptop ?? 0),
        mini_pc: Number(data.mini_pc ?? 0),
        allow_separators: !!data.allow_separators,

        carrier_mode: data.carrier_mode,
        carrier_ids: Array.isArray(data.carrier_ids) ? data.carrier_ids : [],
      };

      const res = await fetch("/api/export/best-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = "No se pudo exportar.";
        try {
          const j = await res.json();
          if (j?.message) msg = j.message;
        } catch (_) { }
        throw new Error(msg);
      }

      const blob = await res.blob();

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

  const exportBestPlanPdf = async () => {
    if (!canSubmit || exporting) return;

    setExporting(true);

    try {
      const payload = {
        province_id: data.province_id,
        tower: Number(data.tower ?? 0),
        laptop: Number(data.laptop ?? 0),
        mini_pc: Number(data.mini_pc ?? 0),
        allow_separators: !!data.allow_separators,
      };

      const res = await fetch("/api/export/best-plan-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = "No se pudo exportar el PDF";
        try {
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const j = await res.json();
            msg = j?.message || msg;
          } else {
            const t = await res.text();
            if (t) msg = t;
          }
        } catch (_) { }
        throw new Error(msg);
      }

      const blob = await res.blob();

      const disposition = res.headers.get("content-disposition") || "";
      let filename = "best_plan.pdf";
      const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i);
      if (match) {
        filename = decodeURIComponent(match[1] || match[2] || filename);
      } else {
        const ts = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
        filename = `best_plan_${ts}.pdf`;
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
      console.error(e);
      alert(e?.message || "Error exportando PDF");
    } finally {
      setExporting(false);
    }
  };

  const carrierOk =
    data.carrier_mode !== "manual" ||
    (!loadingCarriers &&
      !carriersError &&
      Array.isArray(data.carrier_ids) &&
      data.carrier_ids.length > 0 &&
      carriers.some((c) => data.carrier_ids.includes(c.id)));

  const countrySelected = !!data.country_code;
  const isES = (data.country_code || "ES") === "ES";

  const countryName = useMemo(() => {
    const code = result?.country_code || data.country_code;
    if (!code) return null;
    return countries.find((c) => c.code === code)?.name || code;
  }, [countries, result?.country_code, data.country_code]);

  const destinationOk = !countrySelected
    ? false
    : isES
      ? !loadingProvinces &&
      !provincesError &&
      data.province_id !== null &&
      provinces.some((p) => p.id === data.province_id)
      : !loadingZones &&
      !zonesError &&
      data.zone_id !== null &&
      zones.some((z) => z.id === data.zone_id);

  const linesOk = useMemo(() => {
    const lines = Array.isArray(data.lines) ? data.lines : [];
    let any = false;

    for (const l of lines) {
      const qty = Number(l?.qty ?? 0);
      const id = l?.device_model_id;

      if (Number.isFinite(qty) && qty < 0) return false;     // no negativos
      if (qty > 0 && !id) return false;                       // si hay qty, debe haber modelo
      if (id && !Number.isFinite(qty)) return false;          // qty debe ser numérica
      if (id && qty > 0) any = true;
    }

    return any;
  }, [data.lines]);


  const canSubmit =
    !processing &&
    !loadingCountries &&
    !countriesError &&
    countrySelected &&
    destinationOk &&
    carrierOk &&
    linesOk;

  const best = result?.plan?.best || null;
  const bestTotalBoxCost = best ? Number(best.total_box_cost ?? 0) : 0;

  const boxBreakdown =
    best?.box_cost_breakdown && typeof best.box_cost_breakdown === "object"
      ? best.box_cost_breakdown
      : {};

  const totalBoxesForCost = Object.values(boxBreakdown).reduce((acc, row) => {
    const q = Number(row?.qty ?? 0);
    return acc + (Number.isFinite(q) ? q : 0);
  }, 0);

  const eurPerBox = totalBoxesForCost > 0 ? bestTotalBoxCost / totalBoxesForCost : null;

  const bestTotal =
    best && best.total_cost !== undefined && best.total_cost !== null
      ? Number(best.total_cost)
      : (best ? Number(best.total_price ?? 0) + bestTotalBoxCost : 0);

  const alternatives = Array.isArray(result?.plan?.alternatives) ? result.plan.alternatives : [];
  const metrics = best?.metrics || null;
  const recommendations = Array.isArray(result?.plan?.recommendations) ? result.plan.recommendations : [];

  const palletMeta = metrics?.pallet || null;
  const perType = metrics?.per_type || metrics?.box_info || null;

  const warnings = Array.isArray(best?.warnings) ? best.warnings : [];

  const showCarrierCol = alternatives.some((a) => a?.carrier_name || a?.carrier_code);

  // Fetch de países
  useEffect(() => {
    let cancelled = false;

    fetch("/api/countries")
      .then((r) => {
        if (!r.ok) throw new Error("No se pudieron cargar países");
        return r.json();
      })
      .then((list) => {
        if (cancelled) return;
        setCountries(Array.isArray(list) ? list : []);
        setLoadingCountries(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadingCountries(false);
        setCountriesError(e.message || "Error cargando países");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch de modelos/equipos — box_type viene como string JSON de json_build_object (PostgreSQL)
  useEffect(() => {
    let cancelled = false;

    setLoadingDeviceModels(true);
    setDeviceModelsError(null);

    fetch("/api/device-models?only_active=1")
      .then((r) => {
        if (!r.ok) throw new Error("No se pudieron cargar los modelos");
        return r.json();
      })
      .then((list) => {
        if (cancelled) return;
        const parsed = (Array.isArray(list) ? list : []).map((m) => ({
          ...m,
          box_type: typeof m.box_type === "string"
            ? (() => { try { return JSON.parse(m.box_type); } catch { return null; } })()
            : (m.box_type ?? null),
        }));
        setDeviceModels(parsed);
        setLoadingDeviceModels(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadingDeviceModels(false);
        setDeviceModelsError(e.message || "Error cargando modelos");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Totales por tipo derivados de lines + deviceModelsById (reactivo, sin delay de useEffect)
  const linesTotals = useMemo(() => {
    const totals = { mini_pc: 0, tower: 0, tower_sff: 0, laptop: 0 };
    const lines = Array.isArray(data.lines) ? data.lines : [];
    for (const line of lines) {
      const id = line?.device_model_id;
      const qty = Number(line?.qty ?? 0);
      if (!id || !Number.isFinite(qty) || qty <= 0) continue;
      const dm = deviceModelsById.get(Number(id));
      const code = dm?.box_type?.code;
      if (code && code in totals) totals[code] += qty;
    }
    return totals;
  }, [data.lines, deviceModelsById]);

  // Mantener legacy mini_pc/tower/tower_sff/laptop sincronizado (para backend submit y export)
  useEffect(() => {
    if (Number(data.mini_pc)   !== linesTotals.mini_pc)   setData("mini_pc",   linesTotals.mini_pc);
    if (Number(data.tower)     !== linesTotals.tower)     setData("tower",     linesTotals.tower);
    if (Number(data.tower_sff ?? 0) !== linesTotals.tower_sff) setData("tower_sff", linesTotals.tower_sff);
    if (Number(data.laptop)    !== linesTotals.laptop)    setData("laptop",    linesTotals.laptop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesTotals]);

  const linesSummary = useMemo(() => {
    const lines = Array.isArray(data.lines) ? data.lines : [];

    // solo líneas útiles (modelo seleccionado y qty > 0)
    const picked = lines
      .map((l, idx) => ({ ...l, __idx: idx }))
      .filter((l) => l?.device_model_id && Number(l?.qty ?? 0) > 0);

    const items = picked.map((l) => {
      const dm = deviceModelsById.get(Number(l.device_model_id));
      return {
        idx: l.__idx,
        brand: l.brand || dm?.brand || "—",
        name: dm?.name || "—",
        sku: dm?.sku || null,
        boxCode: dm?.box_type?.code || null,
        qty: Number(l.qty ?? 0),
        boxCondition: l.box_condition ?? "new", // new | reuse (solo UI)
      };
    });

    const totals = {
      lines: items.length,
      qty: items.reduce((s, it) => s + (Number(it.qty) || 0), 0),
    };

    return { items, totals };
  }, [data.lines, deviceModelsById]);


  const brands = useMemo(() => {
    const set = new Set();
    for (const m of deviceModels) {
      if (m?.brand) set.add(String(m.brand));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [deviceModels]);

  const modelLabel = (m) => {
    if (!m) return "";
    const labelParts = [];
    if (m.name) labelParts.push(m.name);
    const label = labelParts.join(" ");
    const extra = m.sku ? ` · ${m.sku}` : "";
    const bt = m?.box_type?.code ? ` · ${m.box_type.code}` : "";
    /* return `${label}${extra}${bt}`.trim(); */ // Añadiendo el SKU y tipo de caja al label del modelo
    return `${label}`.trim();
  };


  // Fetch de zonas si el país no es ES
  useEffect(() => {
    if (!data.country_code || data.country_code === "ES") {
      setZones([]);
      setData("zone_id", null);
      setZonesError(null);
      return;
    }

    let cancelled = false;
    setLoadingZones(true);
    setZonesError(null);

    fetch(`/api/zones?country_code=${encodeURIComponent(data.country_code)}`)
      .then((r) => {
        if (!r.ok) throw new Error("No se pudieron cargar zonas");
        return r.json();
      })
      .then((list) => {
        if (cancelled) return;
        setZones(Array.isArray(list) ? list : []);
        setLoadingZones(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadingZones(false);
        setZonesError(e.message || "Error cargando zonas");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.country_code]);

  const destinationDisabled = !countrySelected;

  // Query base para endpoints que dependen del destino (carriers / pallet-types).
  const destinationQuery = useMemo(() => {
    if (!data.country_code) return null;

    if ((data.country_code || "ES") === "ES") {
      if (!data.province_id) return null;
      return `country_code=ES&province_id=${encodeURIComponent(data.province_id)}`;
    }

    if (!data.zone_id) return null;
    return `country_code=${encodeURIComponent(data.country_code)}&zone_id=${encodeURIComponent(data.zone_id)}`;
  }, [data.country_code, data.province_id, data.zone_id]);

  // Fetch de carriers por destino (solo si manual o para validar lista)
  useEffect(() => {
    if (!destinationQuery) {
      setCarriers([]);
      setLoadingCarriers(false);
      setCarriersError(null);
      if (Array.isArray(data.carrier_ids) && data.carrier_ids.length > 0) setData("carrier_ids", []);
      return;
    }

    let cancelled = false;

    setLoadingCarriers(true);
    setCarriersError(null);

    fetch(`/api/carriers?${destinationQuery}`)
      .then((r) => {
        if (!r.ok) throw new Error("No se pudieron cargar transportistas");
        return r.json();
      })
      .then((list) => {
        if (cancelled) return;

        const next = Array.isArray(list) ? list : [];
        setCarriers(next);
        setLoadingCarriers(false);

        const valid = new Set(next.map((c) => c.id));
        const cur = Array.isArray(data.carrier_ids) ? data.carrier_ids : [];
        const filtered = cur.filter((id) => valid.has(id));
        if (filtered.length !== cur.length) setData("carrier_ids", filtered);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadingCarriers(false);
        setCarriersError(e.message || "Error cargando transportistas");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationQuery]);

  const bestCarrierId = best?.carrier_id ?? null;

  return (
    <AppLayout title="Palletizer">
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* Panel izquierdo */}
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-ink-900">Planificación de pedido</h1>
            </div>
            <div className="h-10 w-1 rounded-full bg-brand-500" />
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <Field label="País destino" error={errors.country_code}>
              <select
                value={data.country_code ?? ""}
                disabled={loadingCountries || !!countriesError}
                onChange={(e) => {
                  const cc = e.target.value;
                  setData("country_code", cc);

                  if (cc === "ES") {
                    setData("zone_id", null);
                  } else {
                    setData("province_id", null);
                    setQuery("");
                    setIsOpen(false);
                    setHighlightIndex(0);
                  }

                  setData("carrier_mode", "auto");
                  setData("carrier_ids", []);

                  if (!cc) {
                    setData("province_id", null);
                    setData("zone_id", null);
                    setQuery("");
                    setIsOpen(false);
                    setHighlightIndex(0);
                    setZones([]);

                    setData("carrier_mode", "auto");
                    setData("carrier_ids", []);
                  }
                }}
                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2 disabled:bg-ink-50"
              >
                <option value="" disabled>
                  Selecciona país…
                </option>

                {loadingCountries ? (
                  <option value="" disabled>
                    Cargando…
                  </option>
                ) : (
                  countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>

              {countriesError && (
                <div className="mt-2 text-xs font-semibold text-red-600">
                  {countriesError} (revisa GET /api/countries)
                </div>
              )}
            </Field>

            {/* Selector ES: provincia */}
            {isES ? (
              <div ref={containerRef} className="relative">
                <Field
                  label="Provincia"
                  error={errors.province_id}
                  hint={destinationDisabled ? "Selecciona primero un país." : "Escribe para buscar."}
                >
                  <input
                    value={query}
                    disabled={!data.country_code || data.country_code !== "ES" || loadingProvinces || !!provincesError}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setIsOpen(true);
                      setHighlightIndex(0);
                      setData("province_id", null);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={onKeyDown}
                    placeholder={loadingProvinces ? "Cargando…" : "Ej: Madrid"}
                    className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2 disabled:bg-ink-50"
                  />
                </Field>

                {provincesError && (
                  <div className="mt-2 text-xs font-semibold text-red-600">
                    {provincesError} (revisa GET /api/provinces)
                  </div>
                )}

                {isOpen && filtered.length > 0 && (
                  <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-ink-100 bg-white shadow-soft">
                    {filtered.map((p, i) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectProvince(p)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${i === highlightIndex ? "bg-brand-50 text-ink-900" : "hover:bg-ink-50"
                          }`}
                      >
                        <span className="font-semibold">{p.name}</span>
                        <span className="text-xs text-ink-500">{p.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Selector NO ES: zona */
              <div ref={zoneRef} className="relative">
                <Field
                  label="Zona"
                  error={errors.zone_id}
                  hint={destinationDisabled ? "Selecciona primero un país." : "Escribe para buscar."}
                >
                  <input
                    value={zoneQuery}
                    disabled={!data.country_code || data.country_code === "ES" || loadingZones || !!zonesError}
                    onChange={(e) => {
                      setZoneQuery(e.target.value);
                      setZoneOpen(true);
                      setZoneHighlightIndex(0);
                      setData("zone_id", null);
                    }}
                    onFocus={() => setZoneOpen(true)}
                    onKeyDown={onZoneKeyDown}
                    placeholder={loadingZones ? "Cargando…" : "Ej: Zone 1"}
                    className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2 disabled:bg-ink-50"
                  />
                </Field>

                {zonesError && (
                  <div className="mt-2 text-xs font-semibold text-red-600">
                    {zonesError} (revisa GET /api/zones)
                  </div>
                )}

                {zoneOpen && filteredZones.length > 0 && (
                  <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-ink-100 bg-white shadow-soft">
                    {filteredZones.map((z, i) => (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => selectZone(z)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${i === zoneHighlightIndex ? "bg-brand-50 text-ink-900" : "hover:bg-ink-50"
                          }`}
                      >
                        <span className="font-semibold">{z.name}</span>
                        <span className="text-xs text-ink-500">{z.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Transportistas */}
            <div className="rounded-2xl border border-ink-100 bg-ink-50 p-4">
              <div className="text-sm font-extrabold text-ink-900">Transportistas</div>

              <div className="mt-3 flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm text-ink-800">
                  <input
                    type="radio"
                    name="carrier_mode"
                    value="auto"
                    checked={data.carrier_mode === "auto"}
                    onChange={() => {
                      setData("carrier_mode", "auto");
                      setData("carrier_ids", []);
                    }}
                    className="h-4 w-4 accent-brand-500"
                  />
                  Auto (usar todos los disponibles)
                </label>

                <label className="flex items-center gap-2 text-sm text-ink-800">
                  <input
                    type="radio"
                    name="carrier_mode"
                    value="manual"
                    checked={data.carrier_mode === "manual"}
                    onChange={() => {
                      setData("carrier_mode", "manual");
                      setData("carrier_ids", []);
                    }}
                    className="h-4 w-4 accent-brand-500"
                  />
                  Sé qué transportista voy a utilizar (seleccionar)
                </label>
              </div>

              {data.carrier_mode === "manual" && (
                <div className="mt-3">
                  {!destinationQuery ? (
                    <div className="text-sm text-ink-500">Selecciona destino para ver transportistas.</div>
                  ) : loadingCarriers ? (
                    <div className="text-sm text-ink-500">Cargando transportistas…</div>
                  ) : carriersError ? (
                    <div className="text-sm font-semibold text-red-600">
                      {carriersError} (revisa GET /api/carriers)
                    </div>
                  ) : carriers.length === 0 ? (
                    <div className="text-sm text-ink-500">No hay transportistas con tarifas para este destino.</div>
                  ) : (
                    <div className="mt-2 grid gap-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setData("carrier_ids", carriers.map((c) => c.id));
                          }}
                          className="rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink-800 hover:bg-ink-50"
                        >
                          Seleccionar todos
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setData("carrier_ids", []);
                          }}
                          className="rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink-800 hover:bg-ink-50"
                        >
                          Quitar todos
                        </button>
                      </div>

                      {carriers.map((c) => {
                        const checked = Array.isArray(data.carrier_ids) && data.carrier_ids.includes(c.id);
                        return (
                          <label key={c.id} className="flex items-center gap-2 text-sm text-ink-800">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...data.carrier_ids, c.id]
                                  : data.carrier_ids.filter((id) => id !== c.id);

                                setData("carrier_ids", next);
                              }}
                              className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-500"
                            />
                            <span className="font-semibold">{c.name}</span>
                            <span className="text-xs text-ink-500">({c.code})</span>
                          </label>
                        );
                      })}

                      {!carrierOk && (
                        <div className="mt-1 text-xs font-semibold text-red-600">
                          Selecciona al menos un transportista (o usa modo Auto).
                        </div>
                      )}
                    </div>
                  )}
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
                  <div className="text-sm font-extrabold text-ink-900">Permitir separador para capas mixtas</div>
                  <div className="mt-1 text-xs text-ink-500">
                    Si está activado, se puede rellenar una capa con otros tipos aunque tengan distinta altura,
                    contabilizando separadores. Si está desactivado, solo se rellena con cajas de la misma altura.
                  </div>
                  {errors.allow_separators && (
                    <div className="mt-2 text-xs font-semibold text-red-600">{errors.allow_separators}</div>
                  )}
                </div>
              </label>
            </div>

            {/* Cajas configuradas */}
            <details className="rounded-2xl border border-ink-100 bg-ink-50 p-4">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-extrabold text-ink-900">
                <span>Cajas configuradas</span>
                <span className="text-xs font-semibold text-ink-500">
                  {(() => {
                    const pkg = data.packaging || {};
                    const count = [pkg.tower, pkg.laptop, pkg.mini_pc].filter((v) => v != null && Number(v) > 0).length;
                    return count > 0 ? `${count} seleccionadas` : "Sin selección";
                  })()}
                </span>
              </summary>

              <div className="mt-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-ink-500">Cajas en uso para el cálculo</div>
                  <button
                    type="button"
                    onClick={openBoxTypesModal}
                    className="inline-flex w-auto items-center justify-center rounded-lg border border-ink-200 bg-yellow-400 p-1.5 text-xs font-extrabold text-ink-800 hover:bg-yellow-500"
                  >
                    Configurar cajas
                  </button>
                </div>

                {(() => {
                  const kinds = [
                    { kind: "tower",     label: "Torres MT"  },
                    { kind: "tower_sff", label: "Torres SFF" },
                    { kind: "laptop",    label: "Portátiles" },
                    { kind: "mini_pc",   label: "Mini PCs"   },
                  ];

                  const selectedAny = kinds.some(({ kind }) => {
                    const id = data.packaging?.[kind];
                    return id != null && Number(id) > 0;
                  });

                  if (!selectedAny) {
                    return (
                      <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-ink-100 text-sm text-ink-500">
                        No hay cajas seleccionadas. Usa <b>Configurar cajas</b> para asignar una caja por tipo de equipo.
                      </div>
                    );
                  }

                  return (
                    <div className="mt-3 grid gap-2">
                      {kinds.map(({ kind, label }) => {
                        const variantId = data.packaging?.[kind];
                        const v = variantId ? boxVariants.find((bv) => Number(bv.id) === Number(variantId)) : null;

                        if (!v) {
                          return (
                            <div key={kind} className="rounded-xl bg-white p-3 ring-1 ring-ink-100">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-extrabold text-ink-900">{label}</span>
                                <span className="text-xs text-ink-400">Sin caja asignada</span>
                              </div>
                            </div>
                          );
                        }

                        const condLabel = v.condition === "new" ? "Nueva" : "Reutilizada";
                        const inStock = Number(v.on_hand_qty ?? 0) > 0;

                        return (
                          <div key={kind} className="rounded-xl bg-white p-3 ring-1 ring-ink-100">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-extrabold text-ink-900">{label}</span>
                                  <span className="inline-flex items-center rounded-full bg-ink-50 px-2 py-0.5 text-[10px] font-extrabold text-ink-600 ring-1 ring-ink-100">
                                    {condLabel}
                                  </span>
                                  {inStock ? (
                                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-extrabold text-green-700 ring-1 ring-green-200">
                                      Disponible
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-extrabold text-red-600 ring-1 ring-red-200">
                                      Sin stock
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 text-xs text-ink-500">
                                  {v.provider_name} · {v.length_cm}×{v.width_cm}×{v.height_cm} cm
                                  {Number(v.unit_cost_eur) > 0 ? ` · ${fmtEUR(v.unit_cost_eur)}/caja` : " · Sin coste"}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </details>

            {/* Modelos / Equipos (tabla dinámica) */}
            {/* Modelos / Equipos */}
            <div className="rounded-2xl border border-ink-100 p-4">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-extrabold text-ink-900">
                <span>Modelos / equipos (actual)</span>
                <span className="text-xs font-semibold text-ink-500">
                  {modelsSummaryRows.length > 0 ? `${modelsSummaryRows.length} modelos` : "Sin líneas"}
                </span>
              </summary>

              <div className="mt-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-ink-500">Líneas usadas para el cálculo</div>

                  <button
                    type="button"
                    onClick={openModelsModal}
                    className="inline-flex w-auto items-center justify-center rounded-lg border border-ink-200 bg-ink-900 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-ink-800"
                  >
                    Configurar modelos
                  </button>
                </div>

                {/* Chips compactos (opcional) */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-extrabold text-ink-700 ring-1 ring-ink-100">
                    Mini: {linesTotals.mini_pc}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-extrabold text-ink-700 ring-1 ring-ink-100">
                    SFF: {linesTotals.tower_sff}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-extrabold text-ink-700 ring-1 ring-ink-100">
                    Torres: {linesTotals.tower}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-extrabold text-ink-700 ring-1 ring-ink-100">
                    Portátiles: {linesTotals.laptop}
                  </span>
                </div>

                {/* Mini tabla resumen */}
                <div className="mt-3 overflow-hidden rounded-xl bg-white ring-1 ring-ink-100">
                  <div className="grid grid-cols-[120px_minmax(0,1fr)_70px] items-center gap-2 bg-ink-50 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-ink-600">
                    <div>Marca</div>
                    <div>Modelo</div>
                    <div className="text-right">Uds</div>
                  </div>

                  {modelsSummaryRows.length === 0 ? (
                    <div className="px-3 py-3 text-sm font-semibold text-ink-600">
                      No hay modelos añadidos todavía.
                    </div>
                  ) : (
                    <div className="divide-y divide-ink-100">
                      {modelsSummaryRows.slice(0, 6).map((r) => (
                        <div
                          key={r.id}
                          className="grid grid-cols-[120px_minmax(0,1fr)_70px] items-center gap-2 px-3 py-2 text-sm"
                        >
                          <div className="truncate font-semibold text-ink-800">{r.brand}</div>
                          <div className="truncate text-ink-800">{r.name}</div>
                          <div className="text-right font-extrabold text-ink-900">{r.qty}</div>
                        </div>
                      ))}

                      {modelsSummaryRows.length > 6 ? (
                        <div className="px-3 py-2 text-xs font-semibold text-ink-500">
                          + {modelsSummaryRows.length - 6} más…
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Errores */}
                {errors?.lines && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                    {errors.lines}
                  </div>
                )}
              </div>
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
              <img src="/palletizer.png" alt="Palletizer" className="h-30 mt-1 w-auto object-contain" />
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
                          <span className="text-amber-800"> (último pallet: {w.details.boxes} cajas)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-5">
                <Stat label="Pallets" value={fmtNum(best.pallet_count ?? best.pallets_count)} />
                <Stat label="€/pallet" value={fmtEUR(pricePerPallet(best))} />
                <Stat label="€/caja" value={eurPerBox !== null ? fmtEUR(eurPerBox) : "—"} />
                <Stat label="Total cajas" value={fmtEUR(bestTotalBoxCost)} />
                <Stat label="Total" value={fmtEUR(bestTotal)} />
              </div>

              <div className="rounded-xl border border-ink-100 p-4">
                <div className="flex gap-3">
                  <div className="text-md text-ink-900">
                    {best?.carrier_name && (
                      <span>
                        <b>Transportista:</b> <i>{best.carrier_name}</i>
                      </span>
                    )}
                  </div>
                  <div className="text-md text-ink-900">
                    <b>Tarifa:</b> <i>{formatPalletType(best)}</i>
                  </div>
                </div>

                <div className="mt-1 text-xs text-ink-500">
                  Destino: <b>{countryName ?? "—"}</b>
                  {result?.destination ? (
                    <>
                      {" "}
                      · <b>{result.destination}</b>
                    </>
                  ) : null}
                  {result?.country_code === "ES" && result?.zone_id ? (
                    <>
                      {" "}
                      · Zona <b>{result.zone_id}</b>
                    </>
                  ) : null}
                </div>
              </div>

              {recommendations.length > 0 && (
                <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                  <div className="text-sm font-extrabold text-ink-900">Recomendaciones</div>

                  <div className="mt-2 space-y-2">
                    {recommendations.map((r, idx) => (
                      <div key={idx} className="rounded-xl bg-white p-3 ring-1 ring-yellow-200">
                        <div className="text-sm font-semibold text-ink-800">{r.message}</div>

                        <div className="mt-1 text-xs text-ink-600">
                          Diferencia: <b>{Number(r.delta_pct).toFixed(2)}%</b> · Best: <b>{fmtEUR(r.best_total)}</b> · Alt:{" "}
                          <b>{fmtEUR(r.alt_total)}</b>
                          {r?.alt?.pallet_count !== undefined || r?.alt?.pallets_count !== undefined ? (
                            <>
                              {" "}
                              · Pallets alt: <b>{fmtNum(r.alt.pallet_count ?? r.alt.pallets_count)}</b>
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

              {/* DISTRIBUCIÓN POR PALLET (con altura/peso libre + “Ver capas” completo) */}
              {Array.isArray(best?.pallets) && best.pallets.length > 0 && (
                <details className="rounded-xl border border-ink-100 p-4">
                  <summary className="cursor-pointer text-sm font-extrabold text-ink-900">
                    Distribución por pallet
                  </summary>

                  <div className="mt-4 space-y-3">
                    {best.pallets.map((p, idx) => {
                      const c = getPalletCounts(p);
                      const sep = Number(p?.separators_used ?? 0);

                      const remaining = computeRemainingCapacity(p, palletMeta);
                      const hLeft = remaining?.height_cm_left;
                      const wLeft = remaining?.weight_kg_left;

                      return (
                        <div key={idx} className="rounded-xl border border-ink-100 bg-ink-50 p-4">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                            <div className="font-bold text-ink-900 text-decoration-line: underline">Pallet #{idx + 1}</div>

                            <div>
                              Torres: <b>{fmtNum(c.tower)}</b>
                            </div>
                            <div>
                              Portátiles: <b>{fmtNum(c.laptop)}</b>
                            </div>
                            <div>
                              Minis: <b>{fmtNum(c.mini_pc)}</b>
                            </div>

                            {"separators_used" in (p || {}) && (
                              <div className="text-ink-600">
                                Separadores: <b>{fmtNum(sep)}</b>
                              </div>
                            )}

                            {(hLeft !== null && hLeft !== undefined) || (wLeft !== null && wLeft !== undefined) ? (
                              <div className="text-ink-600">
                                {hLeft !== null && hLeft !== undefined ? (
                                  <>
                                    Altura libre: <b>{fmtNum(hLeft)}</b> cm
                                  </>
                                ) : null}
                                {wLeft !== null && wLeft !== undefined ? (
                                  <>
                                    {hLeft !== null && hLeft !== undefined ? " · " : ""}
                                    Peso libre:{" "}
                                    <b>
                                      {remaining?.weight_g_left !== null && remaining?.weight_g_left !== undefined
                                        ? (Number(remaining.weight_g_left) / 1000).toFixed(3).replace(/\.?0+$/, "")
                                        : fmtNum(wLeft)}
                                    </b>{" "}
                                    kg

                                  </>
                                ) : null}
                              </div>
                            ) : null}
                          </div>

                          {Array.isArray(p?.layers) && p.layers.length > 0 && (
                            <details className="mt-3">
                              <summary className="cursor-pointer text-sm font-semibold text-ink-800">Ver capas</summary>

                              <div className="mt-3 space-y-2">
                                {p.layers.map((layer, i) => {
                                  const base = getLayerBaseType(layer);
                                  const counts = getLayerCounts(layer);

                                  const cap = layer?.per_layer ?? layer?.capacity ?? layer?.perLayer ?? null;

                                  const needsSep = !!(layer?.needs_separator ?? layer?.separator);
                                  const slotsEmptyRaw = layer?.slots_empty ?? layer?.empty_slots ?? 0;
                                  const slotsEmpty = Number(slotsEmptyRaw ?? 0);

                                  const derived = computeLayerHeightKg(layer, perType);
                                  const h = derived?.height_cm;

                                  // Peso exacto si viene del backend en gramos
                                  const layerWeightG =
                                    layer?.weight_g !== undefined && layer?.weight_g !== null
                                      ? Number(layer.weight_g)
                                      : (layer?.weight_kg !== undefined && layer?.weight_kg !== null
                                        ? Math.round(Number(layer.weight_kg) * 1000)
                                        : null);

                                  // Fallback (si todavía no viene el peso desde backend)
                                  const kgFallback = derived?.weight_kg;
                                  const kgExact = layerWeightG !== null ? (layerWeightG / 1000) : kgFallback;


                                  // En formato nuevo, layer.count es “cajas del base”, en viejo se calcula con counts
                                  const baseCount =
                                    layer?.count !== undefined && layer?.type
                                      ? Number(layer.count)
                                      : Number(counts?.[base] ?? 0);

                                  // Separador de seguridad — renderizado propio, no como capa normal
                                  if (layer?.security_separator) {
                                    return (
                                      <div key={i} className="flex items-center gap-2 py-1">
                                        <div className="h-px flex-1 border-t-2 border-dashed border-amber-400" />
                                        <span className="whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-300">
                                          ═ separador de seguridad ═
                                        </span>
                                        <div className="h-px flex-1 border-t-2 border-dashed border-amber-400" />
                                      </div>
                                    );
                                  }

                                  return (
                                    <div key={i} className="rounded-lg bg-white p-3 ring-1 ring-ink-100">
                                      <div className="text-xs text-ink-500">
                                        Capa {i + 1}
                                        {cap !== null ? (
                                          <>
                                            {" "}
                                            · Cajas <b>{fmtNum(baseCount)}</b> / {fmtNum(cap)} por capa
                                          </>
                                        ) : null}
                                        {h !== null && h !== undefined ? (
                                          <>
                                            {" "}
                                            · altura <b>{fmtNum(h)}</b> cm
                                          </>
                                        ) : null}
                                        {kgExact !== null && kgExact !== undefined ? (
                                          <>
                                            {" "}
                                            · peso <b>{fmtNum(kgExact.toFixed(3))}</b> kg
                                          </>
                                        ) : null}

                                        {needsSep ? " · separador" : ""}
                                        {slotsEmpty > 0 ? ` · huecos ${slotsEmpty}` : ""}
                                      </div>

                                      <div className="mt-1 text-sm text-ink-800">
                                        Torres: <b>{fmtNum(counts.tower)}</b> · SFF: <b>{fmtNum(counts.tower_sff)}</b> · Portátiles: <b>{fmtNum(counts.laptop)}</b> · Minis:{" "}
                                        <b>{fmtNum(counts.mini_pc)}</b>
                                      </div>

                                      {/* Cajas verticales en el hueco lateral */}
                                      {Array.isArray(layer?.vertical) && layer.vertical.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                          <span className="text-xs font-semibold text-ink-400 self-center">↕ vertical:</span>
                                          {layer.vertical.map((v, vi) => {
                                            const typeLabels = { tower: "Torre MT", tower_sff: "Torre SFF", laptop: "Portátil", mini_pc: "Mini PC" };
                                            const label = typeLabels[v.type] ?? v.type;
                                            return (
                                              <span
                                                key={vi}
                                                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200"
                                              >
                                                ↕ {fmtNum(v.count)}× {label}
                                                {v.vert_height_cm ? (
                                                  <span className="font-normal text-blue-500">({v.vert_height_cm} cm alt.)</span>
                                                ) : null}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </details>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}



              {/* MÉTRICAS DE CÁLCULO */}
              {metrics && (
                <details className="rounded-2xl border border-ink-100 bg-white p-4">
                  <summary className="cursor-pointer text-sm font-extrabold text-ink-900">Métricas de cálculo</summary>

                  <div className="mt-4 space-y-4">
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

                    {!!metrics?.mixed && (
                      <div className="rounded-xl border border-ink-100 bg-ink-50 p-4">
                        <div className="text-sm font-extrabold text-ink-900">Plan mixto</div>

                        {metrics?.types && (
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
                                {Object.entries(metrics.types).map(([code, count]) => (
                                  <tr key={code} className="border-t border-ink-100">
                                    <td className="py-2 pr-3 font-semibold">{code}</td>
                                    <td className="py-2 pr-3">{count}</td>
                                    <td className="py-2 pr-3">{fmtEUR(metrics?.cost_breakdown?.[code])}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        <div className="mt-3 text-xs text-ink-600">
                          Nota: en planes mixtos el “€/pallet” mostrado es el promedio (total / nº pallets).
                        </div>
                      </div>
                    )}

                    {perType && (
                      <div className="rounded-xl border border-ink-100 bg-white p-4">
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

                                const label = code === "tower" ? "Torres" : code === "laptop" ? "Portátiles" : "Mini PCs";

                                return (
                                  <tr key={code} className="border-t border-ink-100">
                                    <td className="py-2 pr-3 font-semibold">{label}</td>
                                    <td className="py-2 pr-3">{fmtNum(t.per_layer)}</td>
                                    <td className="py-2 pr-3">{fmtNum(t.height_cm)}</td>
                                    <td className="py-2 pr-3">{fmtNum(t.weight_kg)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {metrics?.note ? (
                          <div className="mt-3 text-xs text-ink-600">
                            <b>Nota:</b> {metrics.note}
                          </div>
                        ) : null}
                      </div>
                    )}

                                  {/* EQUIPOS EN VERTICAL */}
                                  {metrics?.vertical_total > 0 && (() => {
                                    const typeLabels = { tower: "Torres MT", tower_sff: "Torres SFF", laptop: "Portátiles", mini_pc: "Mini PCs" };
                                    const vt = metrics.vertical_totals ?? {};
                                    const entries = Object.entries(vt).filter(([, n]) => Number(n) > 0);
                                    return (
                                      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-extrabold text-blue-900">↕ Equipos colocados en vertical</span>
                                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                                            {fmtNum(metrics.vertical_total)} en total
                                          </span>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-3">
                                          {entries.map(([code, count]) => (
                                            <div key={code} className="flex flex-col items-center rounded-lg bg-white px-4 py-2 ring-1 ring-blue-200">
                                              <span className="text-xs text-blue-500">{typeLabels[code] ?? code}</span>
                                              <span className="text-lg font-extrabold text-blue-800">{fmtNum(count)}</span>
                                            </div>
                                          ))}
                                        </div>
                                        <p className="mt-3 text-xs text-blue-600">
                                          Unidades aprovechadas en el hueco lateral del pallet colocándolas de canto (en vertical).
                                        </p>
                                      </div>
                                    );
                                  })()}
                  </div>
                </details>
              )}

              {/* ALTERNATIVAS (compactas + colapsables) */}
              {alternatives.length > 0 && (
                <details className="rounded-2xl border border-ink-100 bg-white p-4" open>
                  <summary className="cursor-pointer text-sm font-extrabold text-ink-900">
                    Alternativas
                    <span className="ml-2 text-xs font-semibold text-ink-500">
                      ({alternatives.length})
                    </span>
                  </summary>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-[860px] w-full border-separate border-spacing-0">
                      <thead>
                        <tr className="text-left text-xs text-ink-500">
                          <th className="py-2 pr-3">Transportista</th>
                          <th className="py-2 pr-3">Tipo</th>
                          <th className="py-2 text-center">Pallets</th>
                          <th className="py-2 text-center">€/pallet</th>
                          <th className="py-2 text-center">Total</th>
                        </tr>
                      </thead>

                      <tbody className="text-sm text-ink-800">
                        {alternatives.map((a, idx) => {
                          const key = `${a?.carrier_id ?? "c"}-${a?.pallet_type_code ?? a?.pallet_type_name ?? "t"}-${idx}`;

                          const altCarrierId = a?.carrier_id ?? null;
                          const isOtherCarrier =
                            bestCarrierId !== null &&
                            altCarrierId !== null &&
                            Number(altCarrierId) !== Number(bestCarrierId);

                          const carrierName = a?.carrier_name ?? "—";
                          const carrierCode = a?.carrier_code ?? "";

                          const { short: typeShort, detail: typeDetail } = splitTypeLabel(a?.pallet_type_name);

                          const palletsCount = a?.pallet_count ?? a?.pallets_count;
                          const pp = pricePerPallet(a);

                          const isOpen = !!openAltRows[key];

                          return (
                            <React.Fragment key={key}>
                              <tr className="border-t border-ink-100 align-top">
                                {/* Transportista */}
                                <td className="py-3 pr-3">
                                  <div className="flex items-start gap-2">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold">{carrierName}</span>
                                        <span className={compactCarrierBadge(isOtherCarrier)}>
                                          {isOtherCarrier ? "Otro" : "Mismo"}
                                        </span>
                                      </div>

                                      {/*{carrierCode ? (
                                        <div className="mt-0.5 text-[11px] font-semibold text-ink-500">
                                          {carrierCode}
                                        </div>
                                      ) : null}*/}
                                    </div>
                                  </div>
                                </td>

                                {/* Tipo (compactado + tooltip) */}
                                <td className="py-3 pr-3">
                                  <div className="min-w-0">
                                    <div
                                      className="max-w-[520px] truncate font-semibold px-2 py-1 rounded text-ink-500 ring-1 ring-ink-100 text-xs"
                                      title={String(a?.pallet_type_name ?? "")}
                                    >
                                      {typeShort} {typeDetail || "—"}
                                    </div>

                                    {/* Mini línea secundaria opcional (detalle corto) */}

                                  </div>
                                </td>

                                {/* Pallets */}
                                <td className="py-3 text-center font-semibold tabular-nums">
                                  {fmtNum(palletsCount)}
                                </td>

                                {/* €/pallet */}
                                <td className="py-3 text-center tabular-nums">
                                  {fmtEUR(pp)}
                                </td>

                                {/* Total */}
                                <td className="py-3 text-center font-extrabold tabular-nums">
                                  {fmtEUR(a?.total_price)}
                                </td>

                                {/* Botón detalles */}
                                {/*<td className="py-3 pr-0 text-right">
                                  <button
                                    type="button"
                                    onClick={() => toggleAltRow(key)}
                                    className="inline-flex items-center rounded-lg border border-ink-200 bg-white px-2.5 py-1 text-xs font-extrabold text-ink-800 hover:bg-ink-50"
                                  >
                                    {isOpen ? "Ocultar" : "Detalles"}
                                  </button>
                                </td>*/}
                              </tr>

                              {/* Fila colapsable con el texto completo sin romper tabla */}
                              {isOpen && (
                                <tr className="border-t border-ink-100">
                                  <td colSpan={5} className="py-3">
                                    <div className="rounded-xl bg-ink-50 p-3 ring-1 ring-ink-100">
                                      <div className="text-xs font-extrabold text-ink-700">Tipo completo</div>
                                      <div className="mt-1 text-xs text-ink-700">
                                        <span className="font-semibold">Transportista:</span>{" "}
                                        {carrierName}
                                        {carrierCode ? (
                                          <span className="text-ink-500"> ({carrierCode})</span>
                                        ) : null}
                                      </div>

                                      <div className="mt-2 rounded-lg bg-white p-3 text-xs text-ink-800 ring-1 ring-ink-100">
                                        {String(a?.pallet_type_name ?? "—")}
                                      </div>

                                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                        <span className="inline-flex items-center rounded-full bg-white px-2 py-1 font-extrabold text-ink-800 ring-1 ring-ink-100">
                                          Pallets: {fmtNum(palletsCount)}
                                        </span>
                                        <span className="inline-flex items-center rounded-full bg-white px-2 py-1 font-extrabold text-ink-800 ring-1 ring-ink-100">
                                          €/pallet: {fmtEUR(pp)}
                                        </span>
                                        <span className="inline-flex items-center rounded-full bg-white px-2 py-1 font-extrabold text-ink-800 ring-1 ring-ink-100">
                                          Total: {fmtEUR(a?.total_price)}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 text-xs text-ink-600">
                    Estas alternativas se eligen por cercanía al mejor global (aunque sean de otros transportistas).
                  </div>
                </details>
              )}

            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-500">Aún no has calculado nada. Envía el formulario.</p>
          )}

          {best && (
            <div className="mt-24 flex items-end justify-end gap-3">
              <button
                type="button"
                onClick={exportBestPlanPdf}
                disabled={!canSubmit || exporting}
                className={[
                  "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold shadow-soft transition",
                  "bg-red-700 text-white",
                  "hover:bg-red-800",
                  "focus:outline-none focus:ring-2 focus:ring-red-900 focus:ring-offset-2 focus:ring-offset-white",
                  "active:translate-y-[1px]",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                ].join(" ")}
              >
                {exporting ? "Exportando…" : "Exportar PDF"}
              </button>

              <button
                type="button"
                onClick={exportBestPlanExcel}
                disabled={!canSubmit || exporting}
                className={[
                  "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold shadow-soft transition",
                  "bg-green-700 text-white",
                  "hover:bg-green-800",
                  "focus:outline-none focus:ring-2 focus:ring-green-900 focus:ring-offset-2 focus:ring-offset-white",
                  "active:translate-y-[1px]",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                ].join(" ")}
              >
                {exporting ? "Exportando…" : "Exportar Excel"}
              </button>
            </div>
          )}
        </Card>
      </div>

      {/* Modal box types */}
      {boxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <div>
                <div className="text-sm font-extrabold text-ink-900">Configurar cajas</div>
                <div className="mt-1 text-xs text-ink-500">
                  Selecciona qué caja usar por tipo de equipo (nueva/reutilizada + proveedor) y marca si hay disponibilidad.
                </div>
              </div>

              <button
                type="button"
                onClick={closeBoxTypesModal}
                className="rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-xs font-extrabold text-ink-800 hover:bg-ink-50"
              >
                Cerrar
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto p-5">
              {loadingPackaging ? (
                <div className="text-sm text-ink-500">Cargando…</div>
              ) : packagingError ? (
                <div className="text-sm font-semibold text-red-600">{packagingError}</div>
              ) : boxVariants.length === 0 ? (
                <div className="text-sm text-ink-500">No hay cajas disponibles.</div>
              ) : (
                <div className="grid gap-4">
                  {[
                    { kind: "laptop",    title: "Portátiles" },
                    { kind: "mini_pc",   title: "Mini PCs"   },
                    { kind: "tower_sff", title: "Torres SFF" },
                    { kind: "tower",     title: "Torres MT"  },
                  ].map(({ kind, title }) => {
                    const selectedId = data?.packaging?.[kind] ? Number(data.packaging[kind]) : null;
                    const condition = packFilters?.[kind]?.condition ?? "reused";
                    const providerId = packFilters?.[kind]?.provider_id ? Number(packFilters[kind].provider_id) : null;

                    const pool = boxVariants.filter(
                      (v) => v.kind === kind && (!condition || v.condition === condition)
                    );

                    const providerIds = [
                      ...new Set(pool.map((v) => Number(v.provider_id)).filter((n) => Number.isFinite(n))),
                    ];

                    const providersForKind = boxProviders.filter((p) => providerIds.includes(Number(p.id)));

                    const effectiveProviderId =
                      providerId && providerIds.includes(providerId) ? providerId : (providerIds[0] ?? null);

                    const list = pool.filter((v) => {
                      if (!effectiveProviderId) return true;
                      return Number(v.provider_id) === Number(effectiveProviderId);
                    });

                    // Variante seleccionada (puede ser de cualquier condición)
                    const selectedVariant = selectedId ? boxVariants.find((v) => Number(v.id) === selectedId) : null;

                    return (
                      <div key={kind} className="rounded-2xl border border-ink-100 bg-ink-50 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold text-ink-900">{title}</div>
                            <div className="mt-1 text-xs text-ink-500">
                              {selectedVariant ? (
                                <>
                                  Seleccionada:{" "}
                                  <b>
                                    {selectedVariant.provider_name} ·{" "}
                                    {selectedVariant.condition === "new" ? "Nueva" : "Reutilizada"} ·{" "}
                                    {selectedVariant.length_cm}×{selectedVariant.width_cm}×{selectedVariant.height_cm} cm
                                  </b>
                                </>
                              ) : (
                                <>No hay caja seleccionada.</>
                              )}
                            </div>
                          </div>

                          <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto sm:flex-nowrap">
                            <div className="w-full sm:w-36">
                              <div className="mb-1 text-[10px] font-extrabold uppercase tracking-wide text-ink-500">
                                Tipo
                              </div>
                              <select
                                value={condition}
                                onChange={(e) => {
                                  const nextCond = e.target.value;
                                  setPackFilter(kind, { condition: nextCond, provider_id: null });
                                }}
                                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-800 outline-none ring-brand-500 focus:ring-2"
                              >
                                <option value="">Todas</option>
                                <option value="new">Nueva</option>
                                <option value="reused">Reutilizada</option>
                              </select>
                            </div>

                            <div className="w-full sm:w-64">
                              <div className="mb-1 text-[10px] font-extrabold uppercase tracking-wide text-ink-500">
                                Proveedor
                              </div>
                              <select
                                value={effectiveProviderId ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value ? Number(e.target.value) : null;
                                  setPackFilter(kind, { provider_id: v });
                                }}
                                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-800 outline-none ring-brand-500 focus:ring-2"
                              >
                                {providersForKind.length === 0 ? (
                                  <option value="">(sin proveedores)</option>
                                ) : (
                                  providersForKind.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  ))
                                )}
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-ink-100">
                          <div className="grid grid-cols-[1fr_140px_120px_120px] gap-0 bg-white px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-ink-600">
                            <div>Caja</div>
                            <div className="text-right">Dimensiones</div>
                            <div className="text-right">€/caja</div>
                            <div className="text-right">Acción</div>
                          </div>

                          {list.length === 0 ? (
                            <div className="bg-white px-3 py-3 text-sm font-semibold text-ink-600">
                              No hay cajas para estos filtros.
                            </div>
                          ) : (
                            <div className="divide-y divide-ink-100 bg-white">
                              {list.map((v) => {
                                const id = Number(v.id);
                                const isSelected = selectedId && id === selectedId;
                                const isSaving = !!savingStockByVariantId?.[id];
                                const isAvailable = Number(v.on_hand_qty ?? 0) > 0;
                                const cost = Number(v.unit_cost_eur ?? 0);

                                return (
                                  <div key={id} className="grid grid-cols-[1fr_140px_120px_120px] items-center gap-2 px-3 py-2">
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-semibold text-ink-900">
                                        {v.provider_name} · {v.condition === "new" ? "Nueva" : "Reutilizada"}
                                      </div>
                                      <div className="mt-1 flex items-center gap-2">
                                        {/* Badge disponibilidad */}
                                        <button
                                          type="button"
                                          onClick={() => toggleVariantAvailability(id)}
                                          disabled={isSaving}
                                          title={isAvailable ? "Marcar como no disponible" : "Marcar como disponible"}
                                          className={[
                                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold transition",
                                            "ring-1 disabled:opacity-60 cursor-pointer",
                                            isAvailable
                                              ? "bg-green-50 text-green-700 ring-green-200 hover:bg-green-100"
                                              : "bg-red-50 text-red-600 ring-red-200 hover:bg-red-100",
                                          ].join(" ")}
                                        >
                                          {isSaving ? "…" : isAvailable ? "✓ Disponible" : "✗ No disponible"}
                                        </button>
                                        {isSelected && (
                                          <span className="text-[10px] font-extrabold text-ink-400">en uso</span>
                                        )}
                                        {stockMsgByVariantId?.[id] ? (
                                          <span className="text-[10px] font-extrabold text-red-600">
                                            {stockMsgByVariantId[id]}
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>

                                    <div className="text-right text-sm font-semibold text-ink-800">
                                      {fmtNum(v.length_cm)}×{fmtNum(v.width_cm)}×{fmtNum(v.height_cm)}
                                    </div>

                                    <div className="text-right text-sm font-semibold text-ink-800">
                                      {cost > 0 ? fmtEUR(cost) : <span className="text-ink-400">—</span>}
                                    </div>

                                    <div className="flex items-center justify-end">
                                      <button
                                        type="button"
                                        onClick={() => selectPackagingVariant(kind, id)}
                                        className={`rounded-xl px-3 py-2 text-xs font-extrabold ${isSelected
                                          ? "bg-ink-900 text-white"
                                          : "border border-ink-200 bg-white text-ink-800 hover:bg-ink-50"
                                          }`}
                                      >
                                        {isSelected ? "En uso" : "Usar"}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mantengo tus box_types como fallback, sin tocar nada fuera del modal */}
              <details className="mt-4 rounded-2xl border border-ink-100 bg-ink-50 p-4">
                <summary className="cursor-pointer text-sm font-extrabold text-ink-900">
                  Editar dimensiones base (fallback)
                </summary>

                <div className="mt-3">
                  {loadingBoxTypes ? (
                    <div className="text-sm text-ink-500">Cargando…</div>
                  ) : boxTypesError ? (
                    <div className="text-sm font-semibold text-red-600">{boxTypesError}</div>
                  ) : boxTypes.length === 0 ? (
                    <div className="text-sm text-ink-500">No hay tipos de caja.</div>
                  ) : (
                    <div className="grid gap-3">
                      {boxTypes.map((b) => (
                        <div key={b.id} className="rounded-2xl border border-ink-100 bg-white p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="text-sm font-extrabold text-ink-900">{b.name}</div>
                              <div className="mt-1 text-xs text-ink-500">{b.code}</div>
                            </div>

                            <div className="flex items-center gap-2">
                              {boxMsgById[b.id] && (
                                <div className="text-xs font-extrabold text-ink-700">{boxMsgById[b.id]}</div>
                              )}
                              <button
                                type="button"
                                onClick={() => saveBoxType(b.id)}
                                disabled={!!savingBoxById[b.id]}
                                className="rounded-xl bg-ink-900 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-ink-800 disabled:opacity-60"
                              >
                                {savingBoxById[b.id] ? "Guardando…" : "Guardar"}
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-4 gap-3">
                            <Field label="Largo (cm)">
                              <input
                                type="number"
                                value={b.length_cm}
                                onChange={(e) => onBoxChange(b.id, "length_cm", Number(e.target.value))}
                                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
                              />
                            </Field>

                            <Field label="Ancho (cm)">
                              <input
                                type="number"
                                value={b.width_cm}
                                onChange={(e) => onBoxChange(b.id, "width_cm", Number(e.target.value))}
                                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
                              />
                            </Field>

                            <Field label="Alto (cm)">
                              <input
                                type="number"
                                value={b.height_cm}
                                onChange={(e) => onBoxChange(b.id, "height_cm", Number(e.target.value))}
                                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
                              />
                            </Field>

                            <Field label="Peso (kg)">
                              <input
                                type="number"
                                value={b.weight_kg}
                                onChange={(e) => onBoxChange(b.id, "weight_kg", Number(e.target.value))}
                                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
                              />
                            </Field>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </details>

              <div className="mt-4 rounded-xl border border-ink-100 bg-white p-4 text-xs text-ink-600">
                <b>Nota:</b> Marca como <b>Disponible</b> las cajas que tengas en stock. Solo las cajas marcadas disponibles y seleccionadas con <b>Usar</b> se tendrán en cuenta al calcular.
              </div>
            </div>

            <div className="border-t border-ink-100 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-ink-500">
                  Los cambios de disponibilidad se guardan inmediatamente.
                </div>

                <button
                  type="button"
                  onClick={fetchPackagingData}
                  className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-extrabold text-ink-800 hover:bg-ink-50"
                >
                  Recargar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Modal device models */}
      {modelsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-soft">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <div>
                <div className="text-sm font-extrabold text-ink-900">Modelos / Equipos</div>
                <div className="mt-1 text-xs text-ink-500">
                  Añade una línea por modelo y su cantidad.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addLine}
                  className="rounded-xl bg-ink-900 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-ink-800"
                >
                  Añadir línea
                </button>

                <button
                  type="button"
                  onClick={closeModelsModal}
                  className="rounded-xl border border-ink-200 bg-WHITE px-3 py-1.5 text-xs font-extrabold text-ink-800 hover:bg-ink-50"
                >
                  Cerrar
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[70vh] overflow-auto p-5">
              {loadingDeviceModels ? (
                <div className="text-sm text-ink-500">Cargando modelos…</div>
              ) : deviceModelsError ? (
                <div className="text-xs font-semibold text-red-600">{deviceModelsError}</div>
              ) : deviceModels.length === 0 ? (
                <div className="text-sm text-ink-500">No hay modelos disponibles. Crea alguno antes de calcular.</div>
              ) : (
                <div className="my-2 rounded-2xl ring-1 ring-ink-100 bg-white">
                  <div className="overflow-hidden rounded-2xl">
                    {/* Cabecera */}
                    <div className="grid grid-cols-[180px_minmax(320px,1fr)_120px_52px] items-center gap-2 bg-ink-50 px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-ink-600">
                      <div>Marca</div>
                      <div>Modelo</div>
                      <div className="text-right">Cantidad</div>
                      <div />
                    </div>
                  </div>

                  <div className="overflow-visible">
                    <div className="divide-y divide-ink-100">
                      {(Array.isArray(data.lines) ? data.lines : []).map((line, idx) => {
                        const brand = line?.brand ?? "";
                        const qty = line?.qty ?? 0;
                        const currentId = line?.device_model_id ? Number(line.device_model_id) : null;
                        const query = line?.model_query ?? "";

                        const errBrand = errors?.[`lines.${idx}.brand`];
                        const errModel = errors?.[`lines.${idx}.device_model_id`];
                        const errQty = errors?.[`lines.${idx}.qty`];

                        const modelsForBrand = deviceModels.filter((m) => {
                          if (!brand) return false;
                          return String(m.brand || "") === String(brand);
                        });

                        const filteredModels = (() => {
                          const q = normalize(query);
                          if (!q) return modelsForBrand.slice(0, 12);

                          const starts = [];
                          const contains = [];

                          for (const m of modelsForBrand) {
                            const nameN = normalize(`${m.name ?? ""} ${m.sku ?? ""} ${m.box_type?.code ?? ""}`);
                            if (nameN.startsWith(q)) starts.push(m);
                            else if (nameN.includes(q)) contains.push(m);
                          }

                          return [...starts, ...contains].slice(0, 12);
                        })();

                        const selectedModel = currentId ? deviceModelsById.get(currentId) : null;
                        const boxCode = selectedModel?.box_type?.code;

                        return (
                          <div key={idx} className="px-4 py-3">
                            <div className="grid grid-cols-[180px_minmax(320px,1fr)_120px_52px] items-start gap-2">
                              {/* Marca */}
                              <div>
                                <select
                                  value={brand}
                                  onChange={(e) => {
                                    const nextBrand = e.target.value;
                                    updateLine(idx, { brand: nextBrand, device_model_id: null, model_query: "" });
                                  }}
                                  className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-[13px] font-semibold text-ink-800 outline-none ring-brand-500 focus:ring-2"
                                >
                                  <option value="">Marca…</option>
                                  {brands.map((b) => (
                                    <option key={b} value={b}>
                                      {b}
                                    </option>
                                  ))}
                                </select>
                                {errBrand ? (
                                  <div className="mt-1 text-[10px] font-extrabold text-red-600">{errBrand}</div>
                                ) : null}
                              </div>

                              {/* Modelo autocomplete */}
                              <div
                                className="relative"
                                ref={(el) => {
                                  if (el) modelRowRefs.current[idx] = el;
                                  else delete modelRowRefs.current[idx];
                                }}
                              >
                                <input
                                  value={currentId ? modelLabel(selectedModel) : query}
                                  onChange={(e) => {
                                    updateLine(idx, { device_model_id: null, model_query: e.target.value });
                                    setOpenModelRowIdx(idx); // mantener abierto mientras escribe
                                  }}
                                  onFocus={() => {
                                    if (brand) setOpenModelRowIdx(idx);
                                  }}
                                  placeholder={brand ? "Escribe para buscar modelo…" : "Selecciona marca primero…"}
                                  disabled={!brand}
                                  className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-[13px] font-semibold text-ink-800 outline-none ring-brand-500 focus:ring-2 disabled:bg-ink-50"
                                />

                                {/* hint */}
                                {/*<div className="mt-1 flex items-center justify-between gap-2">
                                  {boxCode ? (
                                    <span className="inline-flex items-center rounded-full bg-ink-50 px-2 py-0.5 text-[10px] font-extrabold text-ink-700 ring-1 ring-ink-100">
                                      Caja: {boxCode}
                                    </span>
                                  ) : <span />}

                                  {errModel ? (
                                    <span className="text-[10px] font-extrabold text-red-600">{errModel}</span>
                                  ) : null}
                                </div>*/}

                                {/* Dropdown filtrado (portal) */}
                              </div>


                              {/* Cantidad */}
                              <div className="text-right">
                                <input
                                  type="number"
                                  min="0"
                                  value={qty}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    updateLine(idx, { qty: v === "" ? "" : Number(v) });
                                  }}
                                  className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-[13px] font-semibold text-ink-800 outline-none ring-brand-500 focus:ring-2 text-right"
                                />
                                {errQty ? (
                                  <div className="mt-1 text-[10px] font-extrabold text-red-600">{errQty}</div>
                                ) : null}
                              </div>

                              {/* Eliminar */}
                              <div className="flex items-center justify-end">
                                <button
                                  type="button"
                                  onClick={() => removeLine(idx)}
                                  className="inline-flex h-10 w-12 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
                                  title="Eliminar línea"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-ink-100 px-5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-ink-500">
                  Total de equipos reconocidos por tipo de caja.
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-ink-50 px-3 py-1 text-xs font-extrabold text-ink-700 ring-1 ring-ink-100">
                    Mini: {linesTotals.mini_pc}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-ink-50 px-3 py-1 text-xs font-extrabold text-ink-700 ring-1 ring-ink-100">
                    SFF: {linesTotals.tower_sff}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-ink-50 px-3 py-1 text-xs font-extrabold text-ink-700 ring-1 ring-ink-100">
                    Torres: {linesTotals.tower}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-ink-50 px-3 py-1 text-xs font-extrabold text-ink-700 ring-1 ring-ink-100">
                    Portátiles: {linesTotals.laptop}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )} {/* Dropdown de modelos (portal) */}
      {modelDropdown.open &&
        modelDropdown.rect &&
        Array.isArray(modelDropdown.items) &&
        modelDropdown.items.length > 0
        ? createPortal(
          <div
            ref={modelDropdownRef}
            style={{
              position: "fixed",
              left: modelDropdown.rect.left,
              top: modelDropdown.rect.top + modelDropdown.rect.height + 8,
              width: modelDropdown.rect.width,
              zIndex: 9999,
            }}
            className="max-h-64 overflow-auto rounded-xl border border-ink-100 bg-white shadow-soft"
          >
            {modelDropdown.items.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  updateLine(modelDropdown.idx, { device_model_id: Number(m.id), model_query: "" });
                  setOpenModelRowIdx(null);
                  setModelDropdown((s) => ({ ...s, open: false }));
                }}
                className="block w-full px-3 py-2 text-left text-[13px] font-semibold text-ink-800 hover:bg-brand-50"
                title={modelLabel(m)}
              >
                <div className="truncate">{modelLabel(m)}</div>
              </button>
            ))}
          </div>,
          document.body
        )
        : null}
    </AppLayout>
  );
}