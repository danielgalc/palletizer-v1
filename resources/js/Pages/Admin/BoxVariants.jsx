import React, { useState, useMemo } from "react";
import { useForm } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import {
    Btn, Field, Input, Select, Modal, ConfirmDialog,
    Table, Tr, Td, PageHeader, Badge,
} from "@/Components/Admin/Ui";

const EMPTY = {
    kind: "laptop", condition: "new", provider_id: "",
    length_cm: "", width_cm: "", height_cm: "",
    unit_cost_eur: "0", on_hand_qty: "0", is_active: true,
};

const KIND_LABELS = {
    laptop: "Portátil", tower: "Torre MT", tower_sff: "Torre SFF", mini_pc: "Mini PC",
};
const COND_LABELS = { new: "Nueva", reused: "Reutilizada" };

export default function BoxVariants({ variants, providers }) {
    const [modalOpen, setModalOpen]       = useState(false);
    const [editing, setEditing]           = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [filterKind, setFilterKind]     = useState("");

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm(EMPTY);

    const openCreate = () => { reset(); clearErrors(); setEditing(null); setModalOpen(true); };
    const openEdit   = (v) => {
        clearErrors();
        setData({
            kind: v.kind, condition: v.condition, provider_id: v.provider_id,
            length_cm: v.length_cm, width_cm: v.width_cm, height_cm: v.height_cm,
            unit_cost_eur: v.unit_cost_eur, on_hand_qty: v.on_hand_qty,
            is_active: !!v.is_active,
        });
        setEditing(v); setModalOpen(true);
    };
    const closeModal = () => { setModalOpen(false); reset(); clearErrors(); };

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: closeModal, preserveScroll: true };
        editing
            ? put(`/admin/box-variants/${editing.id}`, opts)
            : post("/admin/box-variants", opts);
    };

    const filtered = useMemo(() =>
        filterKind ? variants.filter((v) => v.kind === filterKind) : variants,
        [variants, filterKind]
    );

    return (
        <AdminLayout title="Variantes de caja">
            <PageHeader
                title="Variantes de caja"
                description="Cada variante es una caja específica (proveedor + condición + dimensiones) disponible para un tipo de equipo."
                action={<Btn onClick={openCreate}>+ Nueva variante</Btn>}
            />

            {/* Filtro por tipo */}
            <div className="mb-4 flex flex-wrap gap-2">
                {["", "laptop", "tower", "tower_sff", "mini_pc"].map((k) => (
                    <button
                        key={k}
                        type="button"
                        onClick={() => setFilterKind(k)}
                        className={[
                            "rounded-xl px-3 py-1.5 text-xs font-extrabold transition",
                            filterKind === k
                                ? "bg-ink-900 text-white"
                                : "bg-white border border-ink-200 text-ink-700 hover:bg-ink-50",
                        ].join(" ")}
                    >
                        {k ? KIND_LABELS[k] : "Todos"}
                    </button>
                ))}
            </div>

            <Table headers={["Tipo", "Condición", "Proveedor", "Dimensiones (cm)", "€/caja", "Stock", "Activa", "Acciones"]}>
                {filtered.map((v) => (
                    <Tr key={v.id}>
                        <Td><Badge color="gray">{KIND_LABELS[v.kind] ?? v.kind}</Badge></Td>
                        <Td>
                            <Badge color={v.condition === "new" ? "blue" : "yellow"}>
                                {COND_LABELS[v.condition] ?? v.condition}
                            </Badge>
                        </Td>
                        <Td>{v.provider_name}</Td>
                        <Td>{v.length_cm} × {v.width_cm} × {v.height_cm}</Td>
                        <Td>{Number(v.unit_cost_eur) > 0 ? `${Number(v.unit_cost_eur).toFixed(2)} €` : <span className="text-ink-400">—</span>}</Td>
                        <Td>
                            <Badge color={v.on_hand_qty > 0 ? "green" : "red"}>
                                {v.on_hand_qty > 0 ? v.on_hand_qty : "Sin stock"}
                            </Badge>
                        </Td>
                        <Td>
                            <Badge color={v.is_active ? "green" : "gray"}>
                                {v.is_active ? "Sí" : "No"}
                            </Badge>
                        </Td>
                        <Td right>
                            <div className="flex justify-end gap-2">
                                <Btn size="sm" variant="secondary" onClick={() => openEdit(v)}>Editar</Btn>
                                <Btn size="sm" variant="danger" onClick={() => setDeleteTarget(v)}>Eliminar</Btn>
                            </div>
                        </Td>
                    </Tr>
                ))}
            </Table>

            <Modal open={modalOpen} title={editing ? "Editar variante" : "Nueva variante"} onClose={closeModal} size="lg">
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Tipo de equipo" error={errors.kind} required>
                            <Select value={data.kind} onChange={(e) => setData("kind", e.target.value)} disabled={!!editing}>
                                <option value="laptop">Portátil</option>
                                <option value="tower">Torre MT</option>
                                <option value="tower_sff">Torre SFF</option>
                                <option value="mini_pc">Mini PC</option>
                            </Select>
                        </Field>
                        <Field label="Condición" error={errors.condition} required>
                            <Select value={data.condition} onChange={(e) => setData("condition", e.target.value)} disabled={!!editing}>
                                <option value="new">Nueva</option>
                                <option value="reused">Reutilizada</option>
                            </Select>
                        </Field>
                    </div>

                    <Field label="Proveedor" error={errors.provider_id} required>
                        <Select value={data.provider_id} onChange={(e) => setData("provider_id", e.target.value)} disabled={!!editing}>
                            <option value="">Selecciona proveedor…</option>
                            {providers.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </Select>
                    </Field>

                    <div className="grid grid-cols-3 gap-4">
                        <Field label="Largo (cm)" error={errors.length_cm} required>
                            <Input type="number" min="1" value={data.length_cm} onChange={(e) => setData("length_cm", e.target.value)} />
                        </Field>
                        <Field label="Ancho (cm)" error={errors.width_cm} required>
                            <Input type="number" min="1" value={data.width_cm} onChange={(e) => setData("width_cm", e.target.value)} />
                        </Field>
                        <Field label="Alto (cm)" error={errors.height_cm} required>
                            <Input type="number" min="1" value={data.height_cm} onChange={(e) => setData("height_cm", e.target.value)} />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Coste unitario (€)" error={errors.unit_cost_eur} required>
                            <Input type="number" min="0" step="0.0001" value={data.unit_cost_eur} onChange={(e) => setData("unit_cost_eur", e.target.value)} />
                        </Field>
                        <Field label="Stock en mano" error={errors.on_hand_qty} required hint="0 = sin stock disponible">
                            <Input type="number" min="0" value={data.on_hand_qty} onChange={(e) => setData("on_hand_qty", e.target.value)} />
                        </Field>
                    </div>

                    <Field label="Estado">
                        <label className="flex items-center gap-2 text-sm text-ink-800">
                            <input
                                type="checkbox"
                                checked={data.is_active}
                                onChange={(e) => setData("is_active", e.target.checked)}
                                className="h-4 w-4 rounded border-ink-300 text-brand-500"
                            />
                            Activa (visible en el Palletizer)
                        </label>
                    </Field>

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
                title="¿Eliminar variante?"
                message={`Se eliminará la variante de ${KIND_LABELS[deleteTarget?.kind] ?? deleteTarget?.kind} (${COND_LABELS[deleteTarget?.condition]}) de "${deleteTarget?.provider_name}".`}
                onConfirm={() => destroy(`/admin/box-variants/${deleteTarget.id}`, {
                    preserveScroll: true, onSuccess: () => setDeleteTarget(null),
                })}
                onCancel={() => setDeleteTarget(null)}
                loading={processing}
            />
        </AdminLayout>
    );
}
