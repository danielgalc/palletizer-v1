import React, { useState, useMemo } from "react";
import { useForm } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import {
    Btn, ActionBtn, Field, Input, Select, Modal, ConfirmDialog,
    Table, Tr, Td, PageHeader,
} from "@/Components/Admin/Ui";

const EMPTY = {
    code: "", name: "",
    length_cm: "", width_cm: "", height_cm: "",
    weight_kg: "",
    security_separator_every_n_layers: "",
};

export default function BoxTypes({ boxTypes }) {
    const [modalOpen, setModalOpen]       = useState(false);
    const [editing, setEditing]           = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [search, setSearch]             = useState("");
    const [sortBy, setSortBy]             = useState("name");
    const [sortDir, setSortDir]           = useState("asc");

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const result = boxTypes.filter((b) =>
            !q || b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)
        );
        return [...result].sort((a, b) => {
            let cmp = 0;
            if (sortBy === "name")   cmp = a.name.localeCompare(b.name);
            if (sortBy === "volume") cmp = (a.length_cm * a.width_cm * a.height_cm) - (b.length_cm * b.width_cm * b.height_cm);
            if (sortBy === "weight") cmp = a.weight_kg - b.weight_kg;
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [boxTypes, search, sortBy, sortDir]);

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm(EMPTY);

    const openCreate = () => { reset(); clearErrors(); setEditing(null); setModalOpen(true); };
    const openEdit   = (b) => {
        clearErrors();
        setData({
            code: b.code, name: b.name,
            length_cm: b.length_cm, width_cm: b.width_cm, height_cm: b.height_cm,
            weight_kg: b.weight_kg,
            security_separator_every_n_layers: b.security_separator_every_n_layers ?? "",
        });
        setEditing(b); setModalOpen(true);
    };
    const closeModal = () => { setModalOpen(false); reset(); clearErrors(); };

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: closeModal, preserveScroll: true };
        editing
            ? put(`/admin/box-types/${editing.id}`, opts)
            : post("/admin/box-types", opts);
    };

    return (
        <AdminLayout title="Tipos de caja">
            <PageHeader
                title="Tipos de caja"
                description="Define los tipos de caja lógicos y sus dimensiones de fallback."
                action={<Btn onClick={openCreate}>+ Nuevo tipo</Btn>}
            />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre o código…"
                    className="max-w-xs"
                />
                <div className="w-52">
                    <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="name">Ordenar: nombre</option>
                        <option value="volume">Ordenar: volumen</option>
                        <option value="weight">Ordenar: peso</option>
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

            <Table headers={["Código", "Nombre", "Dimensiones (cm)", "Peso (kg)", "Sep. seguridad", "Acciones"]} empty="No hay tipos que coincidan.">
                {filtered.map((b) => (
                    <Tr key={b.id}>
                        <Td><code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs">{b.code}</code></Td>
                        <Td className="font-semibold">{b.name}</Td>
                        <Td>{b.length_cm} × {b.width_cm} × {b.height_cm}</Td>
                        <Td>{b.weight_kg} kg</Td>
                        <Td>
                            {b.security_separator_every_n_layers
                                ? `Cada ${b.security_separator_every_n_layers} capas`
                                : <span className="text-ink-400">—</span>}
                        </Td>
                        <Td right>
                            <div className="flex justify-end gap-2">
                                <ActionBtn type="edit" onClick={() => openEdit(b)} />
                                <ActionBtn type="delete" onClick={() => setDeleteTarget(b)} />
                            </div>
                        </Td>
                    </Tr>
                ))}
            </Table>

            <Modal open={modalOpen} title={editing ? "Editar tipo de caja" : "Nuevo tipo de caja"} onClose={closeModal}>
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Código" error={errors.code} required hint="Ej: laptop, tower, mini_pc">
                            <Input
                                value={data.code}
                                onChange={(e) => setData("code", e.target.value)}
                                placeholder="laptop"
                                disabled={!!editing}
                            />
                        </Field>
                        <Field label="Nombre" error={errors.name} required>
                            <Input
                                value={data.name}
                                onChange={(e) => setData("name", e.target.value)}
                                placeholder="Portátil"
                            />
                        </Field>
                    </div>

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
                        <Field label="Peso fallback (kg)" error={errors.weight_kg} required hint="Peso estimado equipo + caja sin datos de modelo">
                            <Input type="number" min="0" step="0.01" value={data.weight_kg} onChange={(e) => setData("weight_kg", e.target.value)} />
                        </Field>
                        <Field label="Separador cada N capas" error={errors.security_separator_every_n_layers} hint="Dejar vacío para no usar separador">
                            <Input type="number" min="1" value={data.security_separator_every_n_layers} onChange={(e) => setData("security_separator_every_n_layers", e.target.value)} placeholder="3" />
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
                title="¿Eliminar tipo de caja?"
                message={`Se eliminará "${deleteTarget?.name}". No se puede borrar si tiene modelos de dispositivo asignados.`}
                onConfirm={() => destroy(`/admin/box-types/${deleteTarget.id}`, {
                    preserveScroll: true, onSuccess: () => setDeleteTarget(null),
                })}
                onCancel={() => setDeleteTarget(null)}
                loading={processing}
            />
        </AdminLayout>
    );
}
