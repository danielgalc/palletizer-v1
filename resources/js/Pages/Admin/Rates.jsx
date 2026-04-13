import React, { useState, useMemo } from "react";
import { useForm, router } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import {
    Btn, ActionBtn, Field, Input, Select, Modal, ConfirmDialog,
    Table, Tr, Td, PageHeader, Pagination,
} from "@/Components/Admin/Ui";

const EMPTY = {
    carrier_id: "", zone_id: "", pallet_type_id: "",
    min_pallets: "1", max_pallets: "99",
    price_eur: "", carrier_rate_name: "",
};

export default function Rates({ rates, carriers, zones, palletTypes, filters }) {
    const [modalOpen, setModalOpen]       = useState(false);
    const [editing, setEditing]           = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [localCarrier, setLocalCarrier]         = useState(filters?.carrier_id ?? "");
    const [localZone, setLocalZone]               = useState(filters?.zone_id ?? "");
    const [localPalletType, setLocalPalletType]   = useState(filters?.pallet_type_id ?? "");

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm(EMPTY);

    // Zonas filtradas por el transportista seleccionado en el modal
    const zonesForModal = useMemo(() => {
        if (!data.carrier_id) return zones;
        return zones.filter((z) => String(z.carrier_id) === String(data.carrier_id));
    }, [zones, data.carrier_id]);

    // Zonas filtradas por el transportista seleccionado en la barra de filtros
    const zonesForFilter = useMemo(() => {
        if (!localCarrier) return zones;
        return zones.filter((z) => String(z.carrier_id) === String(localCarrier));
    }, [zones, localCarrier]);

    const applyFilters = (patch) => {
        const next = { carrier_id: localCarrier, zone_id: localZone, pallet_type_id: localPalletType, ...patch };
        router.get("/admin/rates", {
            carrier_id:     next.carrier_id     || undefined,
            zone_id:        next.zone_id        || undefined,
            pallet_type_id: next.pallet_type_id || undefined,
        }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const goToPage = (page) => {
        router.get("/admin/rates", {
            carrier_id:     localCarrier     || undefined,
            zone_id:        localZone        || undefined,
            pallet_type_id: localPalletType  || undefined,
            page,
        }, { preserveState: true, preserveScroll: true });
    };

    const openCreate = () => { reset(); clearErrors(); setEditing(null); setModalOpen(true); };
    const openEdit   = (r) => {
        clearErrors();
        setData({
            carrier_id: r.carrier_id, zone_id: r.zone_id, pallet_type_id: r.pallet_type_id,
            min_pallets: r.min_pallets, max_pallets: r.max_pallets,
            price_eur: r.price_eur, carrier_rate_name: r.carrier_rate_name ?? "",
        });
        setEditing(r); setModalOpen(true);
    };
    const closeModal = () => { setModalOpen(false); reset(); clearErrors(); };

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: closeModal, preserveScroll: true };
        editing
            ? put(`/admin/rates/${editing.id}`, opts)
            : post("/admin/rates", opts);
    };

    // Agrupar por transportista para cabeceras visuales
    const grouped = useMemo(() => {
        const groups = [];
        let lastCarrier = null;
        for (const r of rates.data) {
            if (r.carrier_name !== lastCarrier) {
                groups.push({ type: "header", name: r.carrier_name, key: `h-${r.carrier_id}-${r.carrier_name}` });
                lastCarrier = r.carrier_name;
            }
            groups.push({ type: "row", data: r, key: r.id });
        }
        return groups;
    }, [rates.data]);

    return (
        <AdminLayout title="Tarifas">
            <PageHeader
                title="Tarifas"
                description="Precios por transportista, zona, tipo de pallet y tramo de pallets."
                action={<Btn onClick={openCreate}>+ Nueva tarifa</Btn>}
            />

            {/* Filtros */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="w-52">
                    <Select
                        value={localCarrier}
                        onChange={(e) => {
                            const carrier = e.target.value;
                            setLocalCarrier(carrier);
                            // Reset zone if it no longer belongs to this carrier
                            const zoneStillValid = !carrier || zones.some(
                                (z) => String(z.id) === String(localZone) && String(z.carrier_id) === carrier
                            );
                            const nextZone = zoneStillValid ? localZone : "";
                            if (!zoneStillValid) setLocalZone("");
                            applyFilters({ carrier_id: carrier, zone_id: nextZone });
                        }}
                    >
                        <option value="">Todos los transportistas</option>
                        {carriers.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </Select>
                </div>

                <div className="w-56">
                    <Select
                        value={localZone}
                        onChange={(e) => {
                            setLocalZone(e.target.value);
                            applyFilters({ zone_id: e.target.value });
                        }}
                    >
                        <option value="">Todas las zonas</option>
                        {zonesForFilter.map((z) => (
                            <option key={z.id} value={z.id}>{z.country_name} — {z.name}</option>
                        ))}
                    </Select>
                </div>

                <div className="w-48">
                    <Select
                        value={localPalletType}
                        onChange={(e) => {
                            setLocalPalletType(e.target.value);
                            applyFilters({ pallet_type_id: e.target.value });
                        }}
                    >
                        <option value="">Todos los tipos</option>
                        {palletTypes.map((pt) => (
                            <option key={pt.id} value={pt.id}>{pt.name}</option>
                        ))}
                    </Select>
                </div>

                {(localCarrier || localZone || localPalletType) && (
                    <Btn variant="secondary" size="sm" onClick={() => {
                        setLocalCarrier(""); setLocalZone(""); setLocalPalletType("");
                        applyFilters({ carrier_id: "", zone_id: "", pallet_type_id: "" });
                    }}>
                        Limpiar filtros
                    </Btn>
                )}

                <span className="ml-auto self-center text-sm text-ink-500">
                    {rates.total} tarifa{rates.total !== 1 ? "s" : ""}
                </span>
            </div>

            <Table headers={["Zona", "País", "Tipo pallet", "Pallets (tramo)", "Nombre tarifa", "€", "Acciones"]}>
                {grouped.map((item) => {
                    if (item.type === "header") {
                        return (
                            <Tr key={item.key} className="bg-ink-900">
                                <Td colSpan={7}>
                                    <span className="text-xs font-extrabold uppercase tracking-wide text-white">
                                        {item.name}
                                    </span>
                                </Td>
                            </Tr>
                        );
                    }
                    const r = item.data;
                    return (
                        <Tr key={item.key}>
                            <Td className="font-semibold">{r.zone_name}</Td>
                            <Td className="text-ink-500">{r.country_name}</Td>
                            <Td>{r.pallet_type_name}</Td>
                            <Td>
                                <span className="tabular-nums text-xs font-semibold text-ink-600 bg-ink-50 rounded-md px-2 py-0.5 ring-1 ring-ink-100">
                                    {r.min_pallets === r.max_pallets
                                        ? `${r.min_pallets} unidad${r.min_pallets !== 1 ? "es" : ""}`
                                        : `${r.min_pallets}–${r.max_pallets} uds.`}
                                </span>
                            </Td>
                            <Td className="text-ink-500 text-xs">{r.carrier_rate_name || <span className="text-ink-300">—</span>}</Td>
                            <Td className="font-extrabold tabular-nums">{Number(r.price_eur).toFixed(2)} €</Td>
                            <Td right>
                                <div className="flex justify-end gap-2">
                                    <ActionBtn type="edit" onClick={() => openEdit(r)} />
                                    <ActionBtn type="delete" onClick={() => setDeleteTarget(r)} />
                                </div>
                            </Td>
                        </Tr>
                    );
                })}
            </Table>

            <Pagination pagination={rates} onPageChange={goToPage} />

            <Modal open={modalOpen} title={editing ? "Editar tarifa" : "Nueva tarifa"} onClose={closeModal} size="lg">
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Transportista" error={errors.carrier_id} required>
                            <Select value={data.carrier_id} onChange={(e) => setData("carrier_id", e.target.value)}>
                                <option value="">Selecciona…</option>
                                {carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </Select>
                        </Field>
                        <Field label="Zona" error={errors.zone_id} required>
                            <Select value={data.zone_id} onChange={(e) => setData("zone_id", e.target.value)}>
                                <option value="">Selecciona…</option>
                                {zonesForModal.map((z) => <option key={z.id} value={z.id}>{z.country_name} — {z.name}</option>)}
                            </Select>
                        </Field>
                    </div>
                    <Field label="Tipo de pallet" error={errors.pallet_type_id} required>
                        <Select value={data.pallet_type_id} onChange={(e) => setData("pallet_type_id", e.target.value)}>
                            <option value="">Selecciona…</option>
                            {palletTypes.map((pt) => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                        </Select>
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Desde (pallets)" error={errors.min_pallets} required hint="Cantidad mínima del tramo">
                            <Input type="number" min="1" value={data.min_pallets} onChange={(e) => setData("min_pallets", e.target.value)} />
                        </Field>
                        <Field label="Hasta (pallets)" error={errors.max_pallets} required hint="Cantidad máxima del tramo">
                            <Input type="number" min="1" value={data.max_pallets} onChange={(e) => setData("max_pallets", e.target.value)} />
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Precio (€)" error={errors.price_eur} required>
                            <Input type="number" min="0" step="0.01" value={data.price_eur} onChange={(e) => setData("price_eur", e.target.value)} />
                        </Field>
                        <Field label="Nombre comercial de la tarifa" error={errors.carrier_rate_name} hint="Ej: Light Pallet, Extra Light…">
                            <Input value={data.carrier_rate_name} onChange={(e) => setData("carrier_rate_name", e.target.value)} placeholder="Opcional" />
                        </Field>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Btn type="button" variant="secondary" onClick={closeModal}>Cancelar</Btn>
                        <Btn type="submit" disabled={processing}>
                            {processing ? "Guardando…" : editing ? "Guardar cambios" : "Crear"}
                        </Btn>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                open={!!deleteTarget}
                title="¿Eliminar tarifa?"
                message={`Se eliminará la tarifa de ${deleteTarget?.carrier_name} para ${deleteTarget?.zone_name} (${deleteTarget?.pallet_type_name}, ${deleteTarget?.min_pallets}–${deleteTarget?.max_pallets} pallets).`}
                onConfirm={() => destroy(`/admin/rates/${deleteTarget.id}`, {
                    preserveScroll: true, onSuccess: () => setDeleteTarget(null),
                })}
                onCancel={() => setDeleteTarget(null)}
                loading={processing}
            />
        </AdminLayout>
    );
}