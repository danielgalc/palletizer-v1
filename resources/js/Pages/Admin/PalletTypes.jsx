import React, { useState, useMemo } from "react";
import { useForm } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import {
    Btn, ActionBtn, Field, Input, Select, Modal, ConfirmDialog,
    Table, Tr, Td, PageHeader,
} from "@/Components/Admin/Ui";

const EMPTY = {
    code: "", name: "",
    base_length_cm: "", base_width_cm: "",
    max_height_cm: "", max_weight_kg: "",
};

export default function PalletTypes({ palletTypes }) {
    const [modalOpen, setModalOpen]       = useState(false);
    const [editing, setEditing]           = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [search, setSearch]   = useState("");
    const [sortBy, setSortBy]   = useState("name");
    const [sortDir, setSortDir] = useState("asc");

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const result = palletTypes.filter((pt) =>
            !q || pt.name.toLowerCase().includes(q) || pt.code.toLowerCase().includes(q)
        );
        return [...result].sort((a, b) => {
            let cmp = 0;
            if (sortBy === "name")   cmp = a.name.localeCompare(b.name);
            if (sortBy === "height") cmp = a.max_height_cm - b.max_height_cm;
            if (sortBy === "weight") cmp = a.max_weight_kg - b.max_weight_kg;
            if (sortBy === "base")   cmp = (a.base_length_cm * a.base_width_cm) - (b.base_length_cm * b.base_width_cm);
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [palletTypes, search, sortBy, sortDir]);

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm(EMPTY);

    const openCreate = () => { reset(); clearErrors(); setEditing(null); setModalOpen(true); };

    const openEdit = (pt) => {
        clearErrors();
        setData({
            code: pt.code, name: pt.name,
            base_length_cm: pt.base_length_cm, base_width_cm: pt.base_width_cm,
            max_height_cm: pt.max_height_cm, max_weight_kg: pt.max_weight_kg,
        });
        setEditing(pt);
        setModalOpen(true);
    };

    const closeModal = () => { setModalOpen(false); reset(); clearErrors(); };

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: closeModal, preserveScroll: true };
        editing
            ? put(`/admin/pallet-types/${editing.id}`, opts)
            : post("/admin/pallet-types", opts);
    };

    const confirmDelete = () => {
        destroy(`/admin/pallet-types/${deleteTarget.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
        });
    };

    return (
        <AdminLayout title="Tipos de pallet">
            <PageHeader
                title="Tipos de pallet"
                description="Define los formatos de pallet disponibles con sus dimensiones y límites."
                action={<Btn onClick={openCreate}>+ Nuevo tipo</Btn>}
            />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre o código…"
                    className="max-w-xs"
                />
                <div className="w-48">
                    <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="name">Ordenar: dimensiones</option>
                        <option value="base">Ordenar: base (m²)</option>
                        <option value="height">Ordenar: altura máx.</option>
                        <option value="weight">Ordenar: peso máx.</option>
                    </Select>
                </div>
                <div className="w-36">
                    <Select value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                        <option value="asc">↑ Ascendente</option>
                        <option value="desc">↓ Descendente</option>
                    </Select>
                </div>
                <span className="ml-auto self-center text-sm text-ink-500">
                    {filtered.length} tipo{filtered.length !== 1 ? "s" : ""}
                </span>
            </div>

            <Table headers={["Código", "Dimensiones", "Base (cm)", "Alt. máx.", "Peso máx.", "Acciones"]} empty="No hay tipos que coincidan.">
                {filtered.map((pt) => (
                    <Tr key={pt.id}>
                        <Td><code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs">{pt.code}</code></Td>
                        <Td className="font-semibold">{pt.name}</Td>
                        <Td>{pt.base_length_cm} × {pt.base_width_cm}</Td>
                        <Td>{pt.max_height_cm} cm</Td>
                        <Td>{pt.max_weight_kg} kg</Td>
                        <Td right>
                            <div className="flex justify-end gap-2">
                                <ActionBtn type="edit" onClick={() => openEdit(pt)} />
                                <ActionBtn type="delete" onClick={() => setDeleteTarget(pt)} />
                            </div>
                        </Td>
                    </Tr>
                ))}
            </Table>

            <Modal open={modalOpen} title={editing ? "Editar tipo de pallet" : "Nuevo tipo de pallet"} onClose={closeModal}>
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Código" error={errors.code} required hint="Ej: light, full, extra_light">
                            <Input value={data.code} onChange={(e) => setData("code", e.target.value)} placeholder="light" disabled={!!editing} />
                        </Field>
                        <Field label="Nombre" error={errors.name} required>
                            <Input value={data.name} onChange={(e) => setData("name", e.target.value)} placeholder="Light Pallet" />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Largo base (cm)" error={errors.base_length_cm} required>
                            <Input type="number" min="1" value={data.base_length_cm} onChange={(e) => setData("base_length_cm", e.target.value)} />
                        </Field>
                        <Field label="Ancho base (cm)" error={errors.base_width_cm} required>
                            <Input type="number" min="1" value={data.base_width_cm} onChange={(e) => setData("base_width_cm", e.target.value)} />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Altura máxima (cm)" error={errors.max_height_cm} required>
                            <Input type="number" min="1" value={data.max_height_cm} onChange={(e) => setData("max_height_cm", e.target.value)} />
                        </Field>
                        <Field label="Peso máximo (kg)" error={errors.max_weight_kg} required>
                            <Input type="number" min="1" value={data.max_weight_kg} onChange={(e) => setData("max_weight_kg", e.target.value)} />
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
                title="¿Eliminar tipo de pallet?"
                message={`Se eliminará "${deleteTarget?.name}". Si tiene tarifas asociadas no se podrá borrar.`}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
                loading={processing}
            />
        </AdminLayout>
    );
}