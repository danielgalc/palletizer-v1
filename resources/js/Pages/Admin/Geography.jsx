import React, { useState, useMemo } from "react";
import { useForm } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import {
    Btn, ActionBtn, Field, Input, Select, Modal, ConfirmDialog, PageHeader,
} from "@/Components/Admin/Ui";

function Chevron({ open }) {
    return (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 transition-transform duration-150" style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
    );
}

const EMPTY_COUNTRY  = { code: "", name: "" };
const EMPTY_ZONE     = { country_id: "", carrier_id: "", name: "" };
const EMPTY_PROVINCE = { name: "", zone_id: "", old_zone_id: "" };

export default function Geography({ countries, carriers, zones, provinces, provinceZones }) {

    // ── Expansión ─────────────────────────────────────────────────────────
    const [expCountry,  setExpCountry]  = useState({});
    const [expCarrier,  setExpCarrier]  = useState({});  // key: `${countryId}-${carrierId}`
    const [expZone,     setExpZone]     = useState({});

    const toggleCountry = (id)              => setExpCountry((p) => ({ ...p, [id]: !p[id] }));
    const toggleCarrier = (cId, caId)       => { const k = `${cId}-${caId}`; setExpCarrier((p) => ({ ...p, [k]: !p[k] })); };
    const toggleZone    = (id)              => setExpZone((p) => ({ ...p, [id]: !p[id] }));

    // ── Agrupaciones ──────────────────────────────────────────────────────
    // { [countryId]: { [carrierId]: Zone[] } }
    const zonesByCountryCarrier = useMemo(() => {
        const m = {};
        for (const z of zones) {
            if (!m[z.country_id]) m[z.country_id] = {};
            if (!m[z.country_id][z.carrier_id]) m[z.country_id][z.carrier_id] = [];
            m[z.country_id][z.carrier_id].push(z);
        }
        return m;
    }, [zones]);

    // { [zoneId]: Province[] }
    const provincesByZone = useMemo(() => {
        const provById = Object.fromEntries(provinces.map((p) => [p.id, p]));
        const m = {};
        for (const pz of provinceZones) {
            if (!m[pz.zone_id]) m[pz.zone_id] = [];
            const prov = provById[pz.province_id];
            if (prov) m[pz.zone_id].push(prov);
        }
        return m;
    }, [provinces, provinceZones]);

    const carriersById = useMemo(() => Object.fromEntries(carriers.map((c) => [c.id, c])), [carriers]);

    // ── Modal País ────────────────────────────────────────────────────────
    const [countryModal, setCountryModal]     = useState(false);
    const [editingCountry, setEditingCountry] = useState(null);
    const [deleteCountry, setDeleteCountry]   = useState(null);
    const countryForm = useForm(EMPTY_COUNTRY);

    const openCreateCountry = () => { countryForm.reset(); countryForm.clearErrors(); setEditingCountry(null); setCountryModal(true); };
    const openEditCountry   = (c) => { countryForm.clearErrors(); countryForm.setData({ code: c.code, name: c.name }); setEditingCountry(c); setCountryModal(true); };
    const closeCountryModal = () => { setCountryModal(false); countryForm.reset(); };
    const submitCountry = (e) => {
        e.preventDefault();
        const opts = { onSuccess: closeCountryModal, preserveScroll: true };
        editingCountry ? countryForm.put(`/admin/countries/${editingCountry.id}`, opts) : countryForm.post("/admin/countries", opts);
    };

    // ── Modal Zona ────────────────────────────────────────────────────────
    const [zoneModal, setZoneModal]               = useState(false);
    const [editingZone, setEditingZone]           = useState(null);
    const [deleteZone, setDeleteZone]             = useState(null);
    const [zoneContext, setZoneContext]           = useState(null); // { country, carrier? }
    const zoneForm = useForm(EMPTY_ZONE);

    const openCreateZone = (country, carrier = null) => {
        zoneForm.reset(); zoneForm.clearErrors();
        zoneForm.setData({ country_id: country.id, carrier_id: carrier?.id ?? "", name: "" });
        setZoneContext({ country, carrier });
        setEditingZone(null); setZoneModal(true);
    };
    const openEditZone = (z) => {
        zoneForm.clearErrors();
        zoneForm.setData({ country_id: z.country_id, carrier_id: z.carrier_id, name: z.name });
        setZoneContext(null);
        setEditingZone(z); setZoneModal(true);
    };
    const closeZoneModal = () => { setZoneModal(false); zoneForm.reset(); };
    const submitZone = (e) => {
        e.preventDefault();
        const opts = { onSuccess: closeZoneModal, preserveScroll: true };
        editingZone ? zoneForm.put(`/admin/zones/${editingZone.id}`, opts) : zoneForm.post(`/admin/countries/${zoneForm.data.country_id}/zones`, opts);
    };

    // ── Modal Provincia ───────────────────────────────────────────────────
    const [provModal, setProvModal]     = useState(false);
    const [editingProv, setEditingProv] = useState(null);
    const [deleteProv, setDeleteProv]   = useState(null);
    const [provZoneCtx, setProvZoneCtx] = useState(null); // zona desde la que se abre
    const provForm = useForm(EMPTY_PROVINCE);

    // Zonas del mismo carrier que la zona de contexto (para reasignar)
    const zonesForProvEdit = useMemo(() => {
        if (!provZoneCtx) return [];
        return zones.filter((z) => z.carrier_id === provZoneCtx.carrier_id && z.country_id === provZoneCtx.country_id);
    }, [zones, provZoneCtx]);

    const openCreateProv = (zone) => {
        provForm.reset(); provForm.clearErrors();
        provForm.setData({ name: "", zone_id: zone.id, old_zone_id: zone.id });
        setProvZoneCtx(zone);
        setEditingProv(null); setProvModal(true);
    };
    const openEditProv = (p, zone) => {
        provForm.clearErrors();
        provForm.setData({ name: p.name, zone_id: zone.id, old_zone_id: zone.id });
        setProvZoneCtx(zone);
        setEditingProv(p); setProvModal(true);
    };
    const closeProvModal = () => { setProvModal(false); provForm.reset(); };
    const submitProv = (e) => {
        e.preventDefault();
        const opts = { onSuccess: closeProvModal, preserveScroll: true };
        editingProv ? provForm.put(`/admin/provinces/${editingProv.id}`, opts) : provForm.post("/admin/provinces", opts);
    };

    return (
        <AdminLayout title="Geografía">
            <PageHeader
                title="Geografía"
                description="Gestiona países, zonas de envío y destinos desde un solo lugar."
                action={<Btn onClick={openCreateCountry}>+ Nuevo país</Btn>}
            />

            <div className="space-y-2">
                {countries.map((country) => {
                    const carrierMap = zonesByCountryCarrier[country.id] ?? {};
                    const carrierIds = Object.keys(carrierMap).map(Number);
                    const isExpC     = !!expCountry[country.id];
                    const totalZones = carrierIds.reduce((s, cId) => s + (carrierMap[cId]?.length ?? 0), 0);

                    return (
                        <div key={country.id} className="rounded-xl border border-ink-100 bg-white overflow-hidden shadow-sm">

                            {/* ── Fila País ── */}
                            <div className="flex items-center gap-3 px-4 py-3">
                                <button type="button" onClick={() => toggleCountry(country.id)}
                                    className="w-4 shrink-0 text-xs text-ink-400 hover:text-ink-700 transition-colors">
                                    <Chevron open={isExpC} />
                                </button>
                                <span className="flex-1 font-semibold text-ink-900">{country.name}</span>
                                <span className="text-xs text-ink-400">{totalZones} zona{totalZones !== 1 ? "s" : ""}</span>
                                <div className="flex items-center gap-2 ml-2">
                                    <Btn size="sm" variant="warning" onClick={() => openCreateZone(country)}>+ Zona</Btn>
                                    <ActionBtn type="edit" onClick={() => openEditCountry(country)} />
                                    <ActionBtn type="delete" onClick={() => setDeleteCountry(country)} />
                                </div>
                            </div>

                            {/* ── Transportistas (nivel 2) ── */}
                            {isExpC && (
                                <div className="border-t border-ink-100 bg-ink-50/30">
                                    {carrierIds.length === 0 ? (
                                        <p className="px-10 py-3 text-xs text-ink-400">Sin zonas. Crea una con <b>+ Zona</b>.</p>
                                    ) : carrierIds.map((carrierId) => {
                                        const carrier  = carriersById[carrierId];
                                        const cZones   = carrierMap[carrierId] ?? [];
                                        const expKey   = `${country.id}-${carrierId}`;
                                        const isExpCa  = !!expCarrier[expKey];

                                        return (
                                            <div key={carrierId} className="border-b border-ink-100 last:border-b-0">

                                                {/* Fila Transportista */}
                                                <div className="flex items-center gap-3 px-4 py-2.5 pl-10">
                                                    <button type="button" onClick={() => toggleCarrier(country.id, carrierId)}
                                                        className="w-4 shrink-0 text-xs text-ink-300 hover:text-ink-600 transition-colors">
                                                        <Chevron open={isExpCa} />
                                                    </button>
                                                    <span className="text-ink-300 text-xs">└</span>
                                                    <span className="flex-1 text-sm font-semibold text-ink-700">
                                                        {carrier?.name ?? `Transportista #${carrierId}`}
                                                    </span>
                                                    <span className="text-xs text-ink-400">{cZones.length} zona{cZones.length !== 1 ? "s" : ""}</span>
                                                    <div className="flex items-center gap-2 ml-2">
                                                        <Btn size="sm" variant="warning" onClick={() => openCreateZone(country, carrier)}>+ Zona</Btn>
                                                    </div>
                                                </div>

                                                {/* ── Zonas (nivel 3) ── */}
                                                {isExpCa && (
                                                    <div className="border-t border-ink-50 bg-ink-50/20">
                                                        {cZones.map((zone) => {
                                                            const zProvs = provincesByZone[zone.id] ?? [];
                                                            const isExpZ = !!expZone[zone.id];

                                                            return (
                                                                <div key={zone.id} className="border-b border-ink-50 last:border-b-0">

                                                                    {/* Fila Zona */}
                                                                    <div className="flex items-center gap-3 px-4 py-2 pl-16">
                                                                        <button type="button" onClick={() => toggleZone(zone.id)}
                                                                            className="w-4 shrink-0 text-xs text-ink-300 hover:text-ink-600 transition-colors">
                                                                            <Chevron open={isExpZ} />
                                                                        </button>
                                                                        <span className="text-ink-200 text-xs">└</span>
                                                                        <span className="flex-1 text-sm text-ink-600">{zone.name}</span>
                                                                        <span className="text-xs text-ink-400">{zProvs.length} dest.</span>
                                                                        <div className="flex items-center gap-2 ml-2">
                                                                            <Btn size="sm" variant="warning" onClick={() => openCreateProv(zone)}>+ Destino</Btn>
                                                                            <ActionBtn type="edit" onClick={() => openEditZone(zone)} />
                                                                            <ActionBtn type="delete" onClick={() => setDeleteZone(zone)} />
                                                                        </div>
                                                                    </div>

                                                                    {/* ── Provincias (nivel 4) ── */}
                                                                    {isExpZ && (
                                                                        <div className="border-t border-ink-50 bg-white">
                                                                            {zProvs.length === 0 ? (
                                                                                <p className="px-24 py-2 text-xs text-ink-400">Sin destinos asignados.</p>
                                                                            ) : (
                                                                                <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 py-3 pl-20 pr-4 sm:grid-cols-3 lg:grid-cols-4">
                                                                                    {zProvs.map((p) => (
                                                                                        <div key={p.id} className="flex items-center justify-between gap-1 py-1 text-sm text-ink-600">
                                                                                            <span className="truncate">{p.name}</span>
                                                                                            <div className="flex shrink-0 gap-1">
                                                                                                <ActionBtn type="edit" onClick={() => openEditProv(p, zone)} />
                                                                                                <ActionBtn type="delete" onClick={() => setDeleteProv({ ...p, zone })} />
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Modal País ──────────────────────────────────────────────────── */}
            <Modal open={countryModal} title={editingCountry ? "Editar país" : "Nuevo país"} onClose={closeCountryModal}>
                <form onSubmit={submitCountry} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Código ISO" error={countryForm.errors.code} required hint="2 letras. Ej: ES, PT, FR">
                            <Input value={countryForm.data.code} onChange={(e) => countryForm.setData("code", e.target.value.toUpperCase())} placeholder="ES" maxLength={2} disabled={!!editingCountry} />
                        </Field>
                        <Field label="Nombre" error={countryForm.errors.name} required>
                            <Input value={countryForm.data.name} onChange={(e) => countryForm.setData("name", e.target.value)} placeholder="España" />
                        </Field>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Btn type="button" variant="secondary" onClick={closeCountryModal}>Cancelar</Btn>
                        <Btn type="submit" disabled={countryForm.processing}>{countryForm.processing ? "Guardando…" : editingCountry ? "Guardar cambios" : "Crear"}</Btn>
                    </div>
                </form>
            </Modal>

            {/* ── Modal Zona ──────────────────────────────────────────────────── */}
            <Modal
                open={zoneModal}
                title={editingZone
                    ? "Editar zona"
                    : `Nueva zona${zoneContext?.country ? ` — ${zoneContext.country.name}` : ""}`}
                onClose={closeZoneModal}
            >
                <form onSubmit={submitZone} className="space-y-4">
                    <Field label="Transportista" error={zoneForm.errors.carrier_id} required>
                        <Select
                            value={zoneForm.data.carrier_id}
                            onChange={(e) => zoneForm.setData("carrier_id", e.target.value)}
                            disabled={!!zoneContext?.carrier}
                        >
                            <option value="">Selecciona…</option>
                            {carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </Select>
                    </Field>
                    <Field label="Nombre de la zona" error={zoneForm.errors.name} required hint="Ej: Zona 1, Zona Insular, Norte">
                        <Input value={zoneForm.data.name} onChange={(e) => zoneForm.setData("name", e.target.value)} placeholder="Zona 1" />
                    </Field>
                    <div className="flex justify-end gap-2 pt-2">
                        <Btn type="button" variant="secondary" onClick={closeZoneModal}>Cancelar</Btn>
                        <Btn type="submit" disabled={zoneForm.processing}>{zoneForm.processing ? "Guardando…" : editingZone ? "Guardar cambios" : "Crear"}</Btn>
                    </div>
                </form>
            </Modal>

            {/* ── Modal Provincia ─────────────────────────────────────────────── */}
            <Modal
                open={provModal}
                title={editingProv ? "Editar destino" : `Nuevo destino — ${provZoneCtx?.name ?? ""}`}
                onClose={closeProvModal}
            >
                <form onSubmit={submitProv} className="space-y-4">
                    <Field label="Nombre" error={provForm.errors.name} required>
                        <Input value={provForm.data.name} onChange={(e) => provForm.setData("name", e.target.value)} placeholder="Madrid" />
                    </Field>
                    {editingProv && zonesForProvEdit.length > 1 && (
                        <Field label="Reasignar zona" error={provForm.errors.zone_id}>
                            <Select value={provForm.data.zone_id} onChange={(e) => provForm.setData("zone_id", e.target.value)}>
                                {zonesForProvEdit.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                            </Select>
                        </Field>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                        <Btn type="button" variant="secondary" onClick={closeProvModal}>Cancelar</Btn>
                        <Btn type="submit" disabled={provForm.processing}>{provForm.processing ? "Guardando…" : editingProv ? "Guardar cambios" : "Crear"}</Btn>
                    </div>
                </form>
            </Modal>

            {/* ── Confirms ────────────────────────────────────────────────────── */}
            <ConfirmDialog
                open={!!deleteCountry}
                title="¿Eliminar país?"
                message={`Se eliminará "${deleteCountry?.name}". Solo es posible si no tiene zonas asociadas.`}
                onConfirm={() => countryForm.delete(`/admin/countries/${deleteCountry.id}`, { preserveScroll: true, onSuccess: () => setDeleteCountry(null) })}
                onCancel={() => setDeleteCountry(null)}
                loading={countryForm.processing}
            />
            <ConfirmDialog
                open={!!deleteZone}
                title="¿Eliminar zona?"
                message={`Se eliminará "${deleteZone?.name}". Solo es posible si no tiene destinos ni tarifas.`}
                onConfirm={() => zoneForm.delete(`/admin/zones/${deleteZone.id}`, { preserveScroll: true, onSuccess: () => setDeleteZone(null) })}
                onCancel={() => setDeleteZone(null)}
                loading={zoneForm.processing}
            />
            <ConfirmDialog
                open={!!deleteProv}
                title="¿Eliminar destino?"
                message={`Se quitará el destino "${deleteProv?.name}" de la zona "${deleteProv?.zone?.name}".`}
                onConfirm={() => provForm.delete(`/admin/provinces/${deleteProv.id}`, {
                    data: { zone_id: deleteProv.zone?.id },
                    preserveScroll: true,
                    onSuccess: () => setDeleteProv(null),
                })}
                onCancel={() => setDeleteProv(null)}
                loading={provForm.processing}
            />
        </AdminLayout>
    );
}
