import React, { useState, useMemo } from "react";
import { useForm } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import {
    Btn, Field, Input, Select, Modal, ConfirmDialog,
    Table, Tr, Td, PageHeader, Badge,
} from "@/Components/Admin/Ui";

const EMPTY = {
    brand: "", name: "", sku: "",
    box_type_id: "", weight_kg: "", is_active: true,
};

export default function DeviceModels({ models, boxTypes }) {
    const [modalOpen, setModalOpen]       = useState(false);
    const [editing, setEditing]           = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [search, setSearch]             = useState("");
    const [filterBox, setFilterBox]       = useState("");

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm(EMPTY);

    const openCreate = () => { reset(); clearErrors(); setEditing(null); setModalOpen(true); };
    const openEdit   = (m) => {
        clearErrors();
        setData({
            brand: m.brand ?? "", name: m.name, sku: m.sku ?? "",
            box_type_id: m.box_type_id, weight_kg: m.weight_kg ?? "",
            is_active: !!m.is_active,
        });
        setEditing(m); setModalOpen(true);
    };
    const closeModal = () => { setModalOpen(false); reset(); clearErrors(); };

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: closeModal, preserveScroll: true };
        editing
            ? put(`/admin/device-models/${editing.id}`, opts)
            : post("/admin/device-models", opts);
    };

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        return models.filter((m) => {
            if (filterBox && String(m.box_type_id) !== String(filterBox)) return false;
            if (!q) return true;
            return (
                m.name?.toLowerCase().includes(q) ||
                m.brand?.toLowerCase().includes(q) ||
                m.sku?.toLowerCase().includes(q)
            );
        });
    }, [models, search, filterBox]);

    // Marcas únicas para el select del modal
    const brands = useMemo(() => {
        const set = new Set(models.map((m) => m.brand).filter(Boolean));
        return Array.from(set).sort();
    }, [models]);

    return (
        <AdminLayout title="Modelos de dispositivo">
            <PageHeader
                title="Modelos de dispositivo"
                description="Catálogo de equipos con su tipo de caja y peso asignados."
                action={<Btn onClick={openCreate}>+ Nuevo modelo</Btn>}
            />

            {/* Búsqueda y filtros */}
            <div className="mb-4 flex flex-wrap gap-3">
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por marca, modelo o SKU…"
                    className="w-full max-w-xs rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
                />

                <Select
                    className="w-auto min-w-[160px]"
                    value={filterBox}
                    onChange={(e) => setFilterBox(e.target.value)}
                >
                    <option value="">Todos los tipos</option>
                    {boxTypes.map((bt) => (
                        <option key={bt.id} value={bt.id}>{bt.name}</option>
                    ))}
                </Select>

                {(search || filterBox) && (
                    <Btn variant="secondary" size="sm" onClick={() => { setSearch(""); setFilterBox(""); }}>
                        Limpiar
                    </Btn>
                )}

                <span className="ml-auto self-center text-sm text-ink-500">
                    {filtered.length} modelo{filtered.length !== 1 ? "s" : ""}
                </span>
            </div>

            <Table headers={["Marca", "Modelo", "SKU", "Tipo caja", "Peso (kg)", "Estado", "Acciones"]}>
                {filtered.map((m) => (
                    <Tr key={m.id}>
                        <Td className="font-semibold">{m.brand || <span className="text-ink-400">—</span>}</Td>
                        <Td>{m.name}</Td>
                        <Td>
                            {m.sku
                                ? <code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs">{m.sku}</code>
                                : <span className="text-ink-400">—</span>}
                        </Td>
                        <Td>
                            <Badge color="gray">{m.box_type_name}</Badge>
                        </Td>
                        <Td>{m.weight_kg ? `${m.weight_kg} kg` : <span className="text-ink-400">—</span>}</Td>
                        <Td>
                            <Badge color={m.is_active ? "green" : "red"}>
                                {m.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                        </Td>
                        <Td right>
                            <div className="flex justify-end gap-2">
                                <Btn size="sm" variant="secondary" onClick={() => openEdit(m)}>Editar</Btn>
                                <Btn size="sm" variant="danger" onClick={() => setDeleteTarget(m)}>Eliminar</Btn>
                            </div>
                        </Td>
                    </Tr>
                ))}
            </Table>

            <Modal open={modalOpen} title={editing ? "Editar modelo" : "Nuevo modelo"} onClose={closeModal} size="lg">
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Marca: datalist para sugerir marcas existentes pero permitir nueva */}
                        <Field label="Marca" error={errors.brand}>
                            <input
                                list="brands-list"
                                value={data.brand}
                                onChange={(e) => setData("brand", e.target.value)}
                                placeholder="HP, Lenovo, Dell…"
                                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
                            />
                            <datalist id="brands-list">
                                {brands.map((b) => <option key={b} value={b} />)}
                            </datalist>
                        </Field>
                        <Field label="Nombre del modelo" error={errors.name} required>
                            <Input
                                value={data.name}
                                onChange={(e) => setData("name", e.target.value)}
                                placeholder="EliteBook 840 G9"
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="SKU / Referencia" error={errors.sku} hint="Opcional, debe ser único">
                            <Input
                                value={data.sku}
                                onChange={(e) => setData("sku", e.target.value)}
                                placeholder="HP-840G9-001"
                            />
                        </Field>
                        <Field label="Tipo de caja" error={errors.box_type_id} required>
                            <Select value={data.box_type_id} onChange={(e) => setData("box_type_id", e.target.value)}>
                                <option value="">Selecciona…</option>
                                {boxTypes.map((bt) => (
                                    <option key={bt.id} value={bt.id}>{bt.name} ({bt.code})</option>
                                ))}
                            </Select>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Peso del equipo (kg)" error={errors.weight_kg} hint="Solo el equipo, sin caja. Opcional.">
                            <Input
                                type="number" min="0" step="0.01"
                                value={data.weight_kg}
                                onChange={(e) => setData("weight_kg", e.target.value)}
                                placeholder="2.50"
                            />
                        </Field>
                        <Field label="Estado">
                            <label className="flex items-center gap-2 text-sm text-ink-800 mt-2">
                                <input
                                    type="checkbox"
                                    checked={data.is_active}
                                    onChange={(e) => setData("is_active", e.target.checked)}
                                    className="h-4 w-4 rounded border-ink-300 text-brand-500"
                                />
                                Activo (visible en el Palletizer)
                            </label>
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
                title="¿Eliminar modelo?"
                message={`Se eliminará "${deleteTarget?.brand ? deleteTarget.brand + " " : ""}${deleteTarget?.name}".`}
                onConfirm={() => destroy(`/admin/device-models/${deleteTarget.id}`, {
                    preserveScroll: true, onSuccess: () => setDeleteTarget(null),
                })}
                onCancel={() => setDeleteTarget(null)}
                loading={processing}
            />
        </AdminLayout>
    );
}
