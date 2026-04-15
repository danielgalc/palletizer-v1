import React, { useState, useMemo } from "react";
import { useForm } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import {
    Btn, ActionBtn, Field, Input, Modal, ConfirmDialog,
    Table, Tr, Td, PageHeader,
} from "@/Components/Admin/Ui";

const EMPTY_COUNTRY = { code: "", name: "" };
const EMPTY_ZONE    = { country_id: "", name: "" };

export default function Countries({ countries, zones }) {
    // ── Country modal ──────────────────────────────────────────────────────
    const [countryModal, setCountryModal]         = useState(false);
    const [editingCountry, setEditingCountry]     = useState(null);
    const [deleteCountry, setDeleteCountry]       = useState(null);

    const countryForm = useForm(EMPTY_COUNTRY);

    const openCreateCountry = () => {
        countryForm.reset(); countryForm.clearErrors();
        setEditingCountry(null); setCountryModal(true);
    };
    const openEditCountry = (c) => {
        countryForm.clearErrors();
        countryForm.setData({ code: c.code, name: c.name });
        setEditingCountry(c); setCountryModal(true);
    };
    const closeCountryModal = () => { setCountryModal(false); countryForm.reset(); };

    const submitCountry = (e) => {
        e.preventDefault();
        const opts = { onSuccess: closeCountryModal, preserveScroll: true };
        editingCountry
            ? countryForm.put(`/admin/countries/${editingCountry.id}`, opts)
            : countryForm.post("/admin/countries", opts);
    };

    // ── Zone modal ─────────────────────────────────────────────────────────
    const [zoneModal, setZoneModal]         = useState(false);
    const [editingZone, setEditingZone]     = useState(null);
    const [deleteZone, setDeleteZone]       = useState(null);
    const [zoneForCountry, setZoneForCountry] = useState(null); // country al crear zona

    const zoneForm = useForm(EMPTY_ZONE);

    const openCreateZone = (country) => {
        zoneForm.reset(); zoneForm.clearErrors();
        zoneForm.setData({ country_id: country.id, name: "" });
        setZoneForCountry(country);
        setEditingZone(null); setZoneModal(true);
    };
    const openEditZone = (z) => {
        zoneForm.clearErrors();
        zoneForm.setData({ country_id: z.country_id, name: z.name });
        setEditingZone(z); setZoneModal(true);
    };
    const closeZoneModal = () => { setZoneModal(false); zoneForm.reset(); };

    const submitZone = (e) => {
        e.preventDefault();
        const opts = { onSuccess: closeZoneModal, preserveScroll: true };
        editingZone
            ? zoneForm.put(`/admin/zones/${editingZone.id}`, opts)
            : zoneForm.post(`/admin/countries/${zoneForm.data.country_id}/zones`, opts);
    };

    // ── Zonas agrupadas por país ───────────────────────────────────────────
    const zonesByCountry = useMemo(() => {
        const map = {};
        for (const z of zones) {
            if (!map[z.country_id]) map[z.country_id] = [];
            map[z.country_id].push(z);
        }
        return map;
    }, [zones]);

    // ── Expandir/colapsar ─────────────────────────────────────────────────
    const [expanded, setExpanded] = useState({});
    const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

    return (
        <AdminLayout title="Países y Zonas">
            <PageHeader
                title="Países y Zonas"
                description="Gestiona los países y sus zonas de transporte."
                action={<Btn onClick={openCreateCountry}>+ Nuevo país</Btn>}
            />

            <Table headers={["Código", "País", "Zonas", "Acciones"]}>
                {countries.map((c) => {
                    const countryZones = zonesByCountry[c.id] ?? [];
                    const isExpanded   = !!expanded[c.id];

                    return (
                        <React.Fragment key={c.id}>
                            <Tr>
                                <Td><code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs">{c.code}</code></Td>
                                <Td className="font-semibold">{c.name}</Td>
                                <Td>
                                    <button
                                        type="button"
                                        onClick={() => toggle(c.id)}
                                        className="text-sm font-semibold text-brand-700 hover:underline"
                                    >
                                        {countryZones.length} zona{countryZones.length !== 1 ? "s" : ""}
                                        {" "}{isExpanded ? "▲" : "▼"}
                                    </button>
                                </Td>
                                <Td right>
                                    <div className="flex justify-end gap-2">
                                        <Btn size="sm" variant="warning" onClick={() => openCreateZone(c)}>+ Zona</Btn>
                                        <ActionBtn type="edit" onClick={() => openEditCountry(c)} />
                                        <ActionBtn type="delete" onClick={() => setDeleteCountry(c)} />
                                    </div>
                                </Td>
                            </Tr>

                            {/* Filas de zonas (expandibles) */}
                            {isExpanded && countryZones.map((z) => (
                                <Tr key={`z-${z.id}`} className="bg-ink-50/60">
                                    <Td />
                                    <Td className="pl-8 text-ink-600">
                                        <span className="mr-2 text-ink-300">└</span>
                                        {z.name}
                                    </Td>
                                    <Td />
                                    <Td right>
                                        <div className="flex justify-end gap-2">
                                            <ActionBtn type="edit" onClick={() => openEditZone(z)} />
                                            <ActionBtn type="delete" onClick={() => setDeleteZone(z)} />
                                        </div>
                                    </Td>
                                </Tr>
                            ))}

                            {isExpanded && countryZones.length === 0 && (
                                <Tr key={`z-empty-${c.id}`} className="bg-ink-50/60">
                                    <Td />
                                    <Td colSpan={3} className="pl-8 text-xs text-ink-400">
                                        Sin zonas. Crea una con <b>+ Zona</b>.
                                    </Td>
                                </Tr>
                            )}
                        </React.Fragment>
                    );
                })}
            </Table>

            {/* Modal país */}
            <Modal open={countryModal} title={editingCountry ? "Editar país" : "Nuevo país"} onClose={closeCountryModal}>
                <form onSubmit={submitCountry} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Código ISO" error={countryForm.errors.code} required hint="2 letras. Ej: ES, PT, FR">
                            <Input
                                value={countryForm.data.code}
                                onChange={(e) => countryForm.setData("code", e.target.value.toUpperCase())}
                                placeholder="ES"
                                maxLength={2}
                                disabled={!!editingCountry}
                            />
                        </Field>
                        <Field label="Nombre" error={countryForm.errors.name} required>
                            <Input
                                value={countryForm.data.name}
                                onChange={(e) => countryForm.setData("name", e.target.value)}
                                placeholder="España"
                            />
                        </Field>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Btn type="button" variant="secondary" onClick={closeCountryModal}>Cancelar</Btn>
                        <Btn type="submit" disabled={countryForm.processing}>
                            {countryForm.processing ? "Guardando…" : editingCountry ? "Guardar cambios" : "Crear"}
                        </Btn>
                    </div>
                </form>
            </Modal>

            {/* Modal zona */}
            <Modal open={zoneModal} title={editingZone ? "Editar zona" : `Nueva zona — ${zoneForCountry?.name ?? ""}`} onClose={closeZoneModal}>
                <form onSubmit={submitZone} className="space-y-4">
                    <Field label="Nombre de la zona" error={zoneForm.errors.name} required hint="Ej: Zona 1, Zona Insular, Norte">
                        <Input
                            value={zoneForm.data.name}
                            onChange={(e) => zoneForm.setData("name", e.target.value)}
                            placeholder="Zona 1"
                        />
                    </Field>
                    <div className="flex justify-end gap-2 pt-2">
                        <Btn type="button" variant="secondary" onClick={closeZoneModal}>Cancelar</Btn>
                        <Btn type="submit" disabled={zoneForm.processing}>
                            {zoneForm.processing ? "Guardando…" : editingZone ? "Guardar cambios" : "Crear"}
                        </Btn>
                    </div>
                </form>
            </Modal>

            {/* Confirmar borrado país */}
            <ConfirmDialog
                open={!!deleteCountry}
                title="¿Eliminar país?"
                message={`Se eliminará "${deleteCountry?.name}". Solo es posible si no tiene zonas asociadas.`}
                onConfirm={() => countryForm.delete(`/admin/countries/${deleteCountry.id}`, {
                    preserveScroll: true, onSuccess: () => setDeleteCountry(null),
                })}
                onCancel={() => setDeleteCountry(null)}
                loading={countryForm.processing}
            />

            {/* Confirmar borrado zona */}
            <ConfirmDialog
                open={!!deleteZone}
                title="¿Eliminar zona?"
                message={`Se eliminará "${deleteZone?.name}". Solo es posible si no tiene destinos ni tarifas.`}
                onConfirm={() => zoneForm.delete(`/admin/zones/${deleteZone.id}`, {
                    preserveScroll: true, onSuccess: () => setDeleteZone(null),
                })}
                onCancel={() => setDeleteZone(null)}
                loading={zoneForm.processing}
            />
        </AdminLayout>
    );
}