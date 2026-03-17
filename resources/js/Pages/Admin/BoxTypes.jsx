import React, { useState } from "react";
import { useForm } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import {
    Btn, Field, Input, Modal, ConfirmDialog,
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

            <Table headers={["Código", "Nombre", "Dimensiones (cm)", "Peso (kg)", "Sep. seguridad", "Acciones"]}>
                {boxTypes.map((b) => (
                    <Tr key={b.id}>
                        <Td><code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs">{b.code}</code></Td>
                        <Td className="font-semibold">{b.name}</Td>
                        <Td>{b.length_cm} × {b.width_cm} × {b.height_cm}</Td>
                        <Td>{b.weight_kg}</Td>
                        <Td>
                            {b.security_separator_every_n_layers
                                ? `Cada ${b.security_separator_every_n_layers} capas`
                                : <span className="text-ink-400">—</span>}
                        </Td>
                        <Td right>
                            <div className="flex justify-end gap-2">
                                <Btn size="sm" variant="secondary" onClick={() => openEdit(b)}>Editar</Btn>
                                <Btn size="sm" variant="danger" onClick={() => setDeleteTarget(b)}>Eliminar</Btn>
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
