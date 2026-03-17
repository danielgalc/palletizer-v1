import React, { useState } from "react";
import { useForm } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import {
    Btn, Field, Input, Select, Modal, ConfirmDialog,
    Table, Tr, Td, PageHeader, Badge,
} from "@/Components/Admin/Ui";

const EMPTY = { name: "", provider_type: "new_supplier" };

const TYPE_LABELS = {
    new_supplier:  "Proveedor de cajas nuevas",
    reused_source: "Fuente de cajas reutilizadas",
};

export default function BoxProviders({ providers }) {
    const [modalOpen, setModalOpen]       = useState(false);
    const [editing, setEditing]           = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm(EMPTY);

    const openCreate = () => { reset(); clearErrors(); setEditing(null); setModalOpen(true); };
    const openEdit   = (p) => {
        clearErrors();
        setData({ name: p.name, provider_type: p.provider_type });
        setEditing(p); setModalOpen(true);
    };
    const closeModal = () => { setModalOpen(false); reset(); clearErrors(); };

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: closeModal, preserveScroll: true };
        editing
            ? put(`/admin/box-providers/${editing.id}`, opts)
            : post("/admin/box-providers", opts);
    };

    return (
        <AdminLayout title="Proveedores de cajas">
            <PageHeader
                title="Proveedores de cajas"
                description="Empresas que suministran cajas nuevas o reutilizadas."
                action={<Btn onClick={openCreate}>+ Nuevo proveedor</Btn>}
            />

            <Table headers={["Nombre", "Tipo", "Acciones"]}>
                {providers.map((p) => (
                    <Tr key={p.id}>
                        <Td className="font-semibold">{p.name}</Td>
                        <Td>
                            <Badge color={p.provider_type === "new_supplier" ? "blue" : "yellow"}>
                                {TYPE_LABELS[p.provider_type] ?? p.provider_type}
                            </Badge>
                        </Td>
                        <Td right>
                            <div className="flex justify-end gap-2">
                                <Btn size="sm" variant="secondary" onClick={() => openEdit(p)}>Editar</Btn>
                                <Btn size="sm" variant="danger" onClick={() => setDeleteTarget(p)}>Eliminar</Btn>
                            </div>
                        </Td>
                    </Tr>
                ))}
            </Table>

            <Modal open={modalOpen} title={editing ? "Editar proveedor" : "Nuevo proveedor"} onClose={closeModal}>
                <form onSubmit={submit} className="space-y-4">
                    <Field label="Nombre" error={errors.name} required>
                        <Input
                            value={data.name}
                            onChange={(e) => setData("name", e.target.value)}
                            placeholder="Nombre del proveedor"
                        />
                    </Field>

                    <Field label="Tipo de proveedor" error={errors.provider_type} required>
                        <Select
                            value={data.provider_type}
                            onChange={(e) => setData("provider_type", e.target.value)}
                        >
                            <option value="new_supplier">Proveedor de cajas nuevas</option>
                            <option value="reused_source">Fuente de cajas reutilizadas</option>
                        </Select>
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
                title="¿Eliminar proveedor?"
                message={`Se eliminará "${deleteTarget?.name}". No se puede borrar si tiene variantes de caja asociadas.`}
                onConfirm={() => destroy(`/admin/box-providers/${deleteTarget.id}`, {
                    preserveScroll: true, onSuccess: () => setDeleteTarget(null),
                })}
                onCancel={() => setDeleteTarget(null)}
                loading={processing}
            />
        </AdminLayout>
    );
}
