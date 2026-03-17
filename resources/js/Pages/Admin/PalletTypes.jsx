import React, { useState } from "react";
import { useForm } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import {
    Btn, Field, Input, Modal, ConfirmDialog,
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

            <Table headers={["Código", "Nombre", "Base (cm)", "Alt. máx.", "Peso máx.", "Acciones"]}>
                {palletTypes.map((pt) => (
                    <Tr key={pt.id}>
                        <Td><code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs">{pt.code}</code></Td>
                        <Td className="font-semibold">{pt.name}</Td>
                        <Td>{pt.base_length_cm} × {pt.base_width_cm}</Td>
                        <Td>{pt.max_height_cm} cm</Td>
                        <Td>{pt.max_weight_kg} kg</Td>
                        <Td right>
                            <div className="flex justify-end gap-2">
                                <Btn size="sm" variant="secondary" onClick={() => openEdit(pt)}>Editar</Btn>
                                <Btn size="sm" variant="danger" onClick={() => setDeleteTarget(pt)}>Eliminar</Btn>
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
