import React, { useState } from "react";
import { useForm, router } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import {
    Btn, ActionBtn, Field, Input, Select, Modal, ConfirmDialog,
    Table, Tr, Td, PageHeader, Badge, Pagination,
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

export default function BoxVariants({ variants, providers, filters }) {
    const [modalOpen, setModalOpen]       = useState(false);
    const [editing, setEditing]           = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [filterKind, setFilterKind]     = useState(filters?.kind ?? "");
    const [filterCond, setFilterCond]     = useState(filters?.condition ?? "");
    const [filterProv, setFilterProv]     = useState(filters?.provider_id ?? "");
    const [filterActive, setFilterActive] = useState(filters?.is_active ?? "");
    const [filterStock, setFilterStock]   = useState(filters?.stock ?? "");

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm(EMPTY);

    const applyFilters = (patch) => {
        const next = { kind: filterKind, condition: filterCond, provider_id: filterProv, is_active: filterActive, stock: filterStock, ...patch };
        router.get("/admin/box-variants", {
            kind:        next.kind        || undefined,
            condition:   next.condition   || undefined,
            provider_id: next.provider_id || undefined,
            is_active:   next.is_active   !== "" ? next.is_active : undefined,
            stock:       next.stock       || undefined,
        }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const goToPage = (page) => {
        router.get("/admin/box-variants", {
            kind:        filterKind        || undefined,
            condition:   filterCond        || undefined,
            provider_id: filterProv        || undefined,
            is_active:   filterActive !== "" ? filterActive : undefined,
            stock:       filterStock       || undefined,
            page,
        }, { preserveState: true, preserveScroll: true });
    };

    const hasFilters = filterKind || filterCond || filterProv || filterActive !== "" || filterStock;

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

    return (
        <AdminLayout title="Variantes de caja">
            <PageHeader
                title="Variantes de caja"
                description="Cada variante es una caja específica (proveedor + condición + dimensiones) disponible para un tipo de equipo."
                action={<Btn onClick={openCreate}>+ Nueva variante</Btn>}
            />

            {/* Filtros: pills para tipo + selects para el resto */}
            <div className="mb-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    {["", "laptop", "tower", "tower_sff", "mini_pc"].map((k) => (
                        <button
                            key={k}
                            type="button"
                            onClick={() => { setFilterKind(k); applyFilters({ kind: k }); }}
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

                <div className="flex flex-wrap items-center gap-3">
                    <div className="w-44">
                        <Select
                            value={filterCond}
                            onChange={(e) => { setFilterCond(e.target.value); applyFilters({ condition: e.target.value }); }}
                        >
                            <option value="">Todas las condiciones</option>
                            <option value="new">Nueva</option>
                            <option value="reused">Reutilizada</option>
                        </Select>
                    </div>
                    <div className="w-52">
                        <Select
                            value={filterProv}
                            onChange={(e) => { setFilterProv(e.target.value); applyFilters({ provider_id: e.target.value }); }}
                        >
                            <option value="">Todos los proveedores</option>
                            {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                    </div>
                    <div className="w-40">
                        <Select
                            value={filterActive}
                            onChange={(e) => { setFilterActive(e.target.value); applyFilters({ is_active: e.target.value }); }}
                        >
                            <option value="">Todos los estados</option>
                            <option value="1">Activas</option>
                            <option value="0">Inactivas</option>
                        </Select>
                    </div>
                    <div className="w-40">
                        <Select
                            value={filterStock}
                            onChange={(e) => { setFilterStock(e.target.value); applyFilters({ stock: e.target.value }); }}
                        >
                            <option value="">Todo el stock</option>
                            <option value="in">Con stock</option>
                            <option value="out">Sin stock</option>
                        </Select>
                    </div>
                    {hasFilters && (
                        <Btn variant="secondary" size="sm" onClick={() => {
                            setFilterKind(""); setFilterCond(""); setFilterProv(""); setFilterActive(""); setFilterStock("");
                            applyFilters({ kind: "", condition: "", provider_id: "", is_active: "", stock: "" });
                        }}>
                            Limpiar filtros
                        </Btn>
                    )}
                    <span className="ml-auto self-center text-sm text-ink-500">
                        {variants.total} variante{variants.total !== 1 ? "s" : ""}
                    </span>
                </div>
            </div>

            <Table headers={["Tipo", "Condición", "Proveedor", "Dimensiones (cm)", "€/caja", "Stock", "Activa", "Acciones"]}>
                {variants.data.map((v) => (
                    <Tr key={v.id}>
                        <Td><Badge color="gray">{KIND_LABELS[v.kind] ?? v.kind}</Badge></Td>
                        <Td><Badge color={v.condition === "new" ? "blue" : "yellow"}>{COND_LABELS[v.condition] ?? v.condition}</Badge></Td>
                        <Td>{v.provider_name}</Td>
                        <Td>{v.length_cm} × {v.width_cm} × {v.height_cm}</Td>
                        <Td>{Number(v.unit_cost_eur) > 0 ? `${Number(v.unit_cost_eur).toFixed(2)} €` : <span className="text-ink-400">—</span>}</Td>
                        <Td><Badge color={v.on_hand_qty > 0 ? "green" : "red"}>{v.on_hand_qty > 0 ? v.on_hand_qty : "Sin stock"}</Badge></Td>
                        <Td><Badge color={v.is_active ? "green" : "gray"}>{v.is_active ? "Sí" : "No"}</Badge></Td>
                        <Td right>
                            <div className="flex justify-end gap-2">
                                <ActionBtn type="edit" onClick={() => openEdit(v)} />
                                <ActionBtn type="delete" onClick={() => setDeleteTarget(v)} />
                            </div>
                        </Td>
                    </Tr>
                ))}
            </Table>

            <Pagination pagination={variants} onPageChange={goToPage} />

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
                            {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                            <input type="checkbox" checked={data.is_active} onChange={(e) => setData("is_active", e.target.checked)} className="h-4 w-4 rounded border-ink-300 text-brand-500" />
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
