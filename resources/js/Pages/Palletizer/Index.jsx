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
      laptop: Number(layer.counts.laptop ?? 0),
      mini_pc: Number(layer.counts.mini_pc ?? 0),
    };
  }

  // Nuevo: {type,count} + mixed:[{type,count}]
  const counts = { tower: 0, laptop: 0, mini_pc: 0 };

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

  return counts;
}

function computeLayerHeightKg(layer, perType) {
  // Si backend ya lo trae, úsalo
  const h = layer?.height_cm;
  const kg = layer?.weight_kg;
  if (h !== undefined || kg !== undefined) {
    return {
      height_cm: h !== undefined ? Number(h) : null,
      weight_kg: kg !== undefined ? Number(kg) : null,
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
    const w = perType?.[k]?.weight_kg;
    if (w !== undefined) {
      ok = true;
      weight_kg += Number(w) * Number(counts[k] ?? 0);
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

  const usedH = p?.height_cm;
  const usedKg = p?.weight_kg;

  if (Hmax !== undefined && usedH !== undefined) {
    const height_cm_left = Number(Hmax) - Number(usedH);
    const weight_kg_left =
      KgMax !== undefined && usedKg !== undefined ? Number(KgMax) - Number(usedKg) : null;

    return {
      height_cm_left: Number.isFinite(height_cm_left) ? Math.max(0, height_cm_left) : null,
      weight_kg_left: weight_kg_left !== null && Number.isFinite(weight_kg_left) ? Math.max(0, weight_kg_left) : null,
    };
  }

  return { height_cm_left: null, weight_kg_left: null };
}


export default function Index({ result }) {
  const { data, setData, post, processing, errors } = useForm({
    country_code: "",
    zone_id: null,
    province_id: null,

    mini_pc: 0,
    tower: 0,
    laptop: 0,

    allow_separators: true,

    // Pallet types (tarifas)
    pallet_mode: "auto",
    pallet_type_codes: [],

    // Carriers
    carrier_mode: "auto", // auto | manual
    carrier_ids: [],
  });

  const [provinces, setProvinces] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [provincesError, setProvincesError] = useState(null);

  const [palletTypes, setPalletTypes] = useState([]);
  const [loadingPalletTypes, setLoadingPalletTypes] = useState(true);
  const [palletTypesError, setPalletTypesError] = useState(null);

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
        setProvinces(list);
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
      const inProv = containerRef.current && containerRef.current.contains(e.target);
      const inZone = zoneRef.current && zoneRef.current.contains(e.target);

      if (!inProv) setIsOpen(false);
      if (!inZone) setZoneOpen(false);
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

  // Zonas
  const selectedZoneObj = useMemo(() => {
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

        pallet_mode: data.pallet_mode,
        pallet_type_codes: Array.isArray(data.pallet_type_codes) ? data.pallet_type_codes : [],

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
        pallet_mode: data.pallet_mode,
        pallet_type_codes: Array.isArray(data.pallet_type_codes) ? data.pallet_type_codes : [],
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

  const manualOk = data.pallet_mode !== "manual" || data.pallet_type_codes.length > 0;

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

  const canSubmit =
    !processing &&
    !loadingCountries &&
    !countriesError &&
    countrySelected &&
    manualOk &&
    destinationOk &&
    carrierOk;

  const best = result?.plan?.best || null;
  const alternatives = Array.isArray(result?.plan?.alternatives) ? result.plan.alternatives : [];
  const metrics = best?.metrics || null;
  const recommendations = Array.isArray(result?.plan?.recommendations) ? result.plan.recommendations : [];

  const palletMeta = metrics?.pallet || null;
  const perType = metrics?.per_type || metrics?.box_info || null;

  const warnings = Array.isArray(best?.warnings) ? best.warnings : [];

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
      return `province_id=${encodeURIComponent(String(data.province_id))}`;
    }

    if (!data.zone_id) return null;
    return `zone_id=${encodeURIComponent(String(data.zone_id))}`;
  }, [data.country_code, data.province_id, data.zone_id]);

  // Reset robusto cuando cambia el destino válido
  const prevDestinationQueryRef = useRef(null);
  useEffect(() => {
    const prev = prevDestinationQueryRef.current;

    if (prev && destinationQuery && prev !== destinationQuery) {
      setData("carrier_mode", "auto");
      setData("carrier_ids", []);
      setData("pallet_type_codes", []);
    }

    prevDestinationQueryRef.current = destinationQuery;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationQuery]);

  // Fetch de transportistas (para el modo Manual)
  useEffect(() => {
    let cancelled = false;

    if (!destinationQuery) {
      setCarriers([]);
      setLoadingCarriers(false);
      setCarriersError(null);
      if (Array.isArray(data.carrier_ids) && data.carrier_ids.length > 0) setData("carrier_ids", []);
      return;
    }

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

  // Pallet types (tarifas) dependientes de destino + carriers seleccionados
  useEffect(() => {
    let cancelled = false;

    if (!destinationQuery) {
      setPalletTypes([]);
      setLoadingPalletTypes(false);
      setPalletTypesError(null);
      return;
    }

    if (data.carrier_mode === "manual" && (!Array.isArray(data.carrier_ids) || data.carrier_ids.length === 0)) {
      setPalletTypes([]);
      setLoadingPalletTypes(false);
      setPalletTypesError(null);
      if (data.pallet_type_codes.length > 0) setData("pallet_type_codes", []);
      return;
    }

    setLoadingPalletTypes(true);
    setPalletTypesError(null);

    const params = new URLSearchParams(destinationQuery);

    if (data.carrier_mode === "manual") {
      params.set("carrier_ids", data.carrier_ids.join(","));
    }

    fetch(`/api/pallet-types?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error("No se pudieron cargar tipos de pallet");
        return r.json();
      })
      .then((list) => {
        if (cancelled) return;

        const next = Array.isArray(list) ? list : [];
        setPalletTypes(next);
        setLoadingPalletTypes(false);

        const validCodes = new Set(next.map((t) => t.code));

        const cur = Array.isArray(data.pallet_type_codes) ? data.pallet_type_codes : [];
        const filtered = cur.filter((c) => validCodes.has(c));

        if (data.pallet_mode !== "manual") {
          const nextCodes = filtered.length > 0 ? filtered : next.map((t) => t.code);
          if (JSON.stringify(nextCodes) !== JSON.stringify(cur)) setData("pallet_type_codes", nextCodes);
        } else {
          if (JSON.stringify(filtered) !== JSON.stringify(cur)) setData("pallet_type_codes", filtered);
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
  }, [destinationQuery, data.carrier_mode, JSON.stringify(data.carrier_ids)]);

  // Si el usuario cambia de "Manual" a "Auto" en tarifas, y no hay nada seleccionado, seleccionamos todo.
  useEffect(() => {
    if (data.pallet_mode !== "manual") {
      if (Array.isArray(palletTypes) && palletTypes.length > 0 && data.pallet_type_codes.length === 0) {
        setData("pallet_type_codes", palletTypes.map((t) => t.code));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.pallet_mode, palletTypes.length]);

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
                  setData("pallet_type_codes", []);

                  if (!cc) {
                    setData("province_id", null);
                    setData("zone_id", null);
                    setQuery("");
                    setIsOpen(false);
                    setHighlightIndex(0);
                    setZones([]);

                    setData("carrier_mode", "auto");
                    setData("carrier_ids", []);
                    setData("pallet_type_codes", []);
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

            {/* Provincia / Zona */}
            {data.country_code === "ES" ? (
              <Field
                label="Provincia destino"
                hint={
                  selectedProvinceObj?.zone_name
                    ? `Seleccionada: ${selectedProvinceObj.name} · ${selectedProvinceObj.zone_name}`
                    : destinationDisabled
                      ? "Selecciona primero un país."
                      : "Escribe para buscar (ej. Zara, Mad...)"
                }
                error={errors.province_id}
              >
                <div ref={containerRef} className="relative">
                  <input
                    value={query}
                    disabled={destinationDisabled || loadingProvinces || !!provincesError}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setIsOpen(true);
                      setHighlightIndex(0);

                      setData("province_id", null);

                      setData("carrier_ids", []);
                      setData("pallet_type_codes", []);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={onKeyDown}
                    placeholder={
                      destinationDisabled
                        ? "Selecciona país primero…"
                        : loadingProvinces
                          ? "Cargando..."
                          : "Buscar provincia..."
                    }
                    className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2 disabled:bg-ink-50"
                  />

                  {isOpen && !destinationDisabled && !loadingProvinces && !provincesError && (
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

                              setData("carrier_ids", []);
                              setData("pallet_type_codes", []);
                            }}
                            className={[
                              "flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm",
                              idx === highlightIndex ? "bg-ink-50" : "bg-white",
                            ].join(" ")}
                          >
                            <span className="text-ink-800">{p.name}</span>
                            <span className="whitespace-nowrap text-xs text-ink-500">{p.zone_name}</span>
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
            ) : (
              <Field
                label="Zona destino"
                hint={selectedZoneObj ? `Seleccionada: ${selectedZoneObj.name}` : "Escribe para buscar..."}
                error={errors.zone_id}
              >
                <div ref={zoneRef} className="relative">
                  <input
                    value={zoneQuery}
                    disabled={loadingZones || !!zonesError}
                    onChange={(e) => {
                      setZoneQuery(e.target.value);
                      setZoneOpen(true);
                      setZoneHighlightIndex(0);
                      setData("zone_id", null);

                      setData("carrier_ids", []);
                      setData("pallet_type_codes", []);
                    }}
                    onFocus={() => setZoneOpen(true)}
                    onKeyDown={onZoneKeyDown}
                    placeholder={loadingZones ? "Cargando..." : "Buscar zona..."}
                    className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2 disabled:bg-ink-50"
                  />

                  {zoneOpen && !loadingZones && !zonesError && (
                    <div className="absolute left-0 right-0 top-[42px] z-20 max-h-72 overflow-auto rounded-xl border border-ink-200 bg-white shadow-soft">
                      {filteredZones.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-ink-500">Sin resultados.</div>
                      ) : (
                        filteredZones.map((z, idx) => (
                          <div
                            key={z.id}
                            onMouseEnter={() => setZoneHighlightIndex(idx)}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectZone(z);

                              setData("carrier_ids", []);
                              setData("pallet_type_codes", []);
                            }}
                            className={[
                              "flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm",
                              idx === zoneHighlightIndex ? "bg-ink-50" : "bg-white",
                            ].join(" ")}
                          >
                            <span className="text-ink-800">{z.name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {zonesError && (
                  <div className="mt-2 text-xs font-semibold text-red-600">
                    {zonesError} (revisa GET /api/zones)
                  </div>
                )}
              </Field>
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
                      setData("pallet_type_codes", []);
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
                      setData("pallet_type_codes", []);
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
                            setData("pallet_type_codes", []);
                          }}
                          className="rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink-800 hover:bg-ink-50"
                        >
                          Seleccionar todos
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setData("carrier_ids", []);
                            setData("pallet_type_codes", []);
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
                                setData("pallet_type_codes", []);
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

            {/* Tipos de pallet (tarifas) */}
            <div className="rounded-2xl border border-ink-100 bg-ink-50 p-4">
              <div className="text-sm font-extrabold text-ink-900">Tarifas (tipo de pallet)</div>

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
              ) : data.carrier_mode === "manual" && (!Array.isArray(data.carrier_ids) || data.carrier_ids.length === 0) ? (
                <div className="mt-3 text-sm text-ink-500">
                  Selecciona primero al menos un transportista para ver tarifas aplicables.
                </div>
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
                      Selecciona al menos una tarifa o usa modo Auto.
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 text-sm text-ink-500">
                  Se evaluarán automáticamente todas las tarifas disponibles (según destino y transportistas).
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

            {/* Tipos de caja */}
            <details className="rounded-2xl border border-ink-100 bg-ink-50 p-4">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-extrabold text-ink-900">
                <span>Datos de cajas (actual)</span>
                <span className="text-xs font-semibold text-ink-500">{boxTypes.length > 0 ? `${boxTypes.length} tipos` : ""}</span>
              </summary>

              <div className="mt-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-ink-500">Valores usados para el cálculo</div>

                  <button
                    type="button"
                    onClick={openBoxTypesModal}
                    className="inline-flex w-auto items-center justify-center rounded-lg border border-ink-200 bg-yellow-400 p-1.5 text-xs font-extrabold text-ink-800 hover:bg-yellow-500"
                  >
                    Configurar cajas
                  </button>
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
                          {b.length_cm}×{b.width_cm}×{b.height_cm} cm · {Number(b.weight_kg).toFixed(2)} kg/caja
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-2 text-xs text-ink-500">Estos valores se usan para calcular capas, altura y peso.</div>
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

              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Pallets" value={fmtNum(best.pallet_count ?? best.pallets_count)} />
                <Stat label="€/pallet" value={fmtEUR(pricePerPallet(best))} />
                <Stat label="Total" value={fmtEUR(best.total_price)} />
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
                    <b>Tarifa:</b> <i>{best.pallet_type_name}</i>
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

              {/* ✅ DISTRIBUCIÓN POR PALLET (con altura/peso libre + “Ver capas” completo) */}
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
                                    Peso libre: <b>{fmtNum(wLeft)}</b> kg
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
                                  const kg = derived?.weight_kg;

                                  // En formato nuevo, layer.count es “cajas del base”, en viejo se calcula con counts
                                  const baseCount =
                                    layer?.count !== undefined && layer?.type
                                      ? Number(layer.count)
                                      : Number(counts?.[base] ?? 0);

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
                                        {kg !== null && kg !== undefined ? (
                                          <>
                                            {" "}
                                            · peso <b>{fmtNum(kg)}</b> kg
                                          </>
                                        ) : null}
                                        {needsSep ? " · separador" : ""}
                                        {slotsEmpty > 0 ? ` · huecos ${slotsEmpty}` : ""}
                                      </div>

                                      <div className="mt-1 text-sm text-ink-800">
                                        Torres: <b>{fmtNum(counts.tower)}</b> · Portátiles: <b>{fmtNum(counts.laptop)}</b> · Minis:{" "}
                                        <b>{fmtNum(counts.mini_pc)}</b>
                                      </div>
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
                  </div>
                </details>
              )}

              {/* ✅ ALTERNATIVAS cross-carrier */}
              {alternatives.length > 0 && (
                <details className="rounded-2xl border border-ink-100 bg-white p-4">
                  <summary className="cursor-pointer text-sm font-extrabold text-ink-900">Alternativas</summary>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-[760px] w-full border-separate border-spacing-0">
                      <thead>
                        <tr className="text-left text-xs text-ink-500">
                          <th className="py-2 pr-3">Transportista</th>
                          <th className="py-2 pr-3">Tipo</th>
                          <th className="py-2 pr-3">Pallets</th>
                          <th className="py-2 pr-3">€/pallet</th>
                          <th className="py-2 pr-3">Total</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-ink-800">
                        {alternatives.map((a, idx) => {
                          const altCarrierId = a?.carrier_id ?? null;
                          const isOtherCarrier =
                            bestCarrierId !== null &&
                            altCarrierId !== null &&
                            Number(altCarrierId) !== Number(bestCarrierId);

                          return (
                            <tr key={idx} className="border-t border-ink-100">
                              <td className="py-2 pr-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{a?.carrier_name ?? "—"}</span>
                                  {isOtherCarrier ? (
                                    <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-0.5 text-[11px] font-extrabold text-ink-700 ring-1 ring-ink-100">
                                      Otro transportista
                                    </span>
                                  ) : null}
                                </div>
                                {a?.carrier_code ? (
                                  <div className="mt-0.5 text-[11px] font-semibold text-ink-500">{a.carrier_code}</div>
                                ) : null}
                              </td>

                              <td className="py-2 pr-3 font-semibold">{a.pallet_type_name}</td>
                              <td className="py-2 pr-3">{fmtNum(a.pallet_count ?? a.pallets_count)}</td>
                              <td className="py-2 pr-3">{fmtEUR(pricePerPallet(a))}</td>
                              <td className="py-2 pr-3">{fmtEUR(a.total_price)}</td>
                            </tr>
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

      {boxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onMouseDown={closeBoxTypesModal} />

          <div className="relative z-10 w-[min(980px,92vw)] rounded-2xl bg-white shadow-soft ring-1 ring-ink-100">
            <div className="flex items-start justify-between gap-4 border-b border-ink-100 p-5">
              <div>
                <div className="text-lg font-extrabold text-ink-900">Configuración de cajas</div>
                <div className="mt-1 text-sm text-ink-500">Cambia dimensiones y peso por tipo. Afecta a la simulación.</div>
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
                          b.name &&
                          b.name.trim().length > 0 &&
                          Number.isFinite(L) &&
                          L > 0 &&
                          Number.isFinite(W) &&
                          W > 0 &&
                          Number.isFinite(H) &&
                          H > 0 &&
                          Number.isFinite(KG) &&
                          KG > 0;

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
