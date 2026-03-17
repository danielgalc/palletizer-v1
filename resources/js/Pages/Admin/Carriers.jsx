import React, { useState } from "react";
import { useForm } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import {
    Btn, Field, Input, Modal, ConfirmDialog,
    Table, Tr, Td, PageHeader, Badge,
} from "@/Components/Admin/Ui";

const EMPTY = { code: "", name: "", is_active: true };

export default function Carriers({ carriers }) {
    const [modalOpen, setModalOpen]     = useState(false);
    const [editing, setEditing]         = useState(null); // null = crear
    const [deleteTarget, setDeleteTarget] = useState(null);

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm(EMPTY);

    const openCreate = () => {
        reset(); clearErrors(); setEditing(null); setModalOpen(true);
    };

    const openEdit = (c) => {
        clearErrors();
        setData({ code: c.code, name: c.name, is_active: !!c.is_active });
        setEditing(c);
        setModalOpen(true);
    };

    const closeModal = () => { setModalOpen(false); reset(); clearErrors(); };

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: closeModal, preserveScroll: true };
        editing
            ? put(`/admin/carriers/${editing.id}`, opts)
            : post("/admin/carriers", opts);
    };

    const confirmDelete = () => {
        destroy(`/admin/carriers/${deleteTarget.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
        });
    };

    return (
        <AdminLayout title="Transportistas">
            <PageHeader
                title="Transportistas"
                description="Gestiona las empresas de transporte disponibles."
                action={<Btn onClick={openCreate}>+ Nuevo transportista</Btn>}
            />

            <Table headers={["Código", "Nombre", "Estado", "Acciones"]}>
                {carriers.map((c) => (
                    <Tr key={c.id}>
                        <Td><code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs">{c.code}</code></Td>
                        <Td className="font-semibold">{c.name}</Td>
                        <Td>
                            <Badge color={c.is_active ? "green" : "red"}>
                                {c.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                        </Td>
                        <Td right>
                            <div className="flex justify-end gap-2">
                                <Btn size="sm" variant="secondary" onClick={() => openEdit(c)}>Editar</Btn>
                                <Btn size="sm" variant="danger" onClick={() => setDeleteTarget(c)}>Eliminar</Btn>
                            </div>
                        </Td>
                    </Tr>
                ))}
            </Table>

            {/* Modal crear/editar */}
            <Modal open={modalOpen} title={editing ? "Editar transportista" : "Nuevo transportista"} onClose={closeModal}>
                <form onSubmit={submit} className="space-y-4">
                    <Field label="Código" error={errors.code} required hint="Identificador interno único. Ej: palletways">
                        <Input
                            value={data.code}
                            onChange={(e) => setData("code", e.target.value)}
                            placeholder="palletways"
                            disabled={!!editing}
                        />
                    </Field>

                    <Field label="Nombre" error={errors.name} required>
                        <Input
                            value={data.name}
                            onChange={(e) => setData("name", e.target.value)}
                            placeholder="Palletways Iberia"
                        />
                    </Field>

                    <Field label="Estado">
                        <label className="flex items-center gap-2 text-sm text-ink-800">
                            <input
                                type="checkbox"
                                checked={data.is_active}
                                onChange={(e) => setData("is_active", e.target.checked)}
                                className="h-4 w-4 rounded border-ink-300 text-brand-500"
                            />
                            Activo
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
                title="¿Eliminar transportista?"
                message={`Se eliminará "${deleteTarget?.name}". Si tiene tarifas asociadas no se podrá borrar.`}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
                loading={processing}
            />
        </AdminLayout>
    );
}
