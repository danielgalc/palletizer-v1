import React, { useState, useMemo } from "react";
import { useForm, router } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import {
    Btn, Field, Input, Select, Modal, ConfirmDialog,
    Table, Tr, Td, PageHeader,
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

    // Filtros locales de la tabla (adicionales a los del servidor)
    const [localCarrier, setLocalCarrier] = useState(filters?.carrier_id ?? "");
    const [localZone, setLocalZone]       = useState(filters?.zone_id ?? "");

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm(EMPTY);

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

    // Filtrado en cliente (sobre los datos ya cargados)
    const filtered = useMemo(() => {
        return rates.filter((r) => {
            if (localCarrier && String(r.carrier_id) !== String(localCarrier)) return false;
            if (localZone    && String(r.zone_id)    !== String(localZone))    return false;
            return true;
        });
    }, [rates, localCarrier, localZone]);

    // Agrupar por transportista para mostrar cabeceras de grupo
    const grouped = useMemo(() => {
        const groups = [];
        let lastCarrier = null;
        for (const r of filtered) {
            if (r.carrier_name !== lastCarrier) {
                groups.push({ type: "header", name: r.carrier_name, key: `h-${r.carrier_id}` });
                lastCarrier = r.carrier_name;
            }
            groups.push({ type: "row", data: r, key: r.id });
        }
        return groups;
    }, [filtered]);

    return (
        <AdminLayout title="Tarifas">
            <PageHeader
                title="Tarifas"
                description="Precios por transportista, zona, tipo de pallet y tramo de pallets."
                action={<Btn onClick={openCreate}>+ Nueva tarifa</Btn>}
            />

            {/* Filtros */}
            <div className="mb-4 flex flex-wrap gap-3">
                <Select
                    className="w-auto min-w-[180px]"
                    value={localCarrier}
                    onChange={(e) => setLocalCarrier(e.target.value)}
                >
                    <option value="">Todos los transportistas</option>
                    {carriers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </Select>

                <Select
                    className="w-auto min-w-[200px]"
                    value={localZone}
                    onChange={(e) => setLocalZone(e.target.value)}
                >
                    <option value="">Todas las zonas</option>
                    {zones.map((z) => (
                        <option key={z.id} value={z.id}>{z.country_name} — {z.name}</option>
                    ))}
                </Select>

                {(localCarrier || localZone) && (
                    <Btn variant="secondary" size="sm" onClick={() => { setLocalCarrier(""); setLocalZone(""); }}>
                        Limpiar filtros
                    </Btn>
                )}

                <span className="ml-auto self-center text-sm text-ink-500">
                    {filtered.length} tarifa{filtered.length !== 1 ? "s" : ""}
                </span>
            </div>

            <Table headers={["Zona", "País", "Tipo pallet", "Tramo", "Nombre tarifa", "€", "Acciones"]}>
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
                                <span className="tabular-nums">{r.min_pallets}–{r.max_pallets}</span>
                            </Td>
                            <Td className="text-ink-500 text-xs">{r.carrier_rate_name || <span className="text-ink-300">—</span>}</Td>
                            <Td className="font-extrabold tabular-nums">{Number(r.price_eur).toFixed(2)} €</Td>
                            <Td right>
                                <div className="flex justify-end gap-2">
                                    <Btn size="sm" variant="secondary" onClick={() => openEdit(r)}>Editar</Btn>
                                    <Btn size="sm" variant="danger" onClick={() => setDeleteTarget(r)}>Eliminar</Btn>
                                </div>
                            </Td>
                        </Tr>
                    );
                })}
            </Table>

            <Modal open={modalOpen} title={editing ? "Editar tarifa" : "Nueva tarifa"} onClose={closeModal} size="lg">
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Transportista" error={errors.carrier_id} required>
                            <Select value={data.carrier_id} onChange={(e) => setData("carrier_id", e.target.value)}>
                                <option value="">Selecciona…</option>
                                {carriers.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Zona" error={errors.zone_id} required>
                            <Select value={data.zone_id} onChange={(e) => setData("zone_id", e.target.value)}>
                                <option value="">Selecciona…</option>
                                {zones.map((z) => (
                                    <option key={z.id} value={z.id}>{z.country_name} — {z.name}</option>
                                ))}
                            </Select>
                        </Field>
                    </div>

                    <Field label="Tipo de pallet" error={errors.pallet_type_id} required>
                        <Select value={data.pallet_type_id} onChange={(e) => setData("pallet_type_id", e.target.value)}>
                            <option value="">Selecciona…</option>
                            {palletTypes.map((pt) => (
                                <option key={pt.id} value={pt.id}>{pt.name}</option>
                            ))}
                        </Select>
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Pallets mínimo" error={errors.min_pallets} required>
                            <Input type="number" min="1" value={data.min_pallets} onChange={(e) => setData("min_pallets", e.target.value)} />
                        </Field>
                        <Field label="Pallets máximo" error={errors.max_pallets} required>
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
