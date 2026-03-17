import React, { useState, useMemo } from "react";
import { useForm } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import {
    Btn, Field, Input, Select, Modal, ConfirmDialog,
    Table, Tr, Td, PageHeader,
} from "@/Components/Admin/Ui";

const EMPTY = { name: "", zone_id: "" };

export default function Provinces({ provinces, zones }) {
    const [modalOpen, setModalOpen]       = useState(false);
    const [editing, setEditing]           = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [search, setSearch]             = useState("");

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm(EMPTY);

    const openCreate = () => { reset(); clearErrors(); setEditing(null); setModalOpen(true); };
    const openEdit   = (p) => {
        clearErrors();
        setData({ name: p.name, zone_id: p.zone_id });
        setEditing(p); setModalOpen(true);
    };
    const closeModal = () => { setModalOpen(false); reset(); clearErrors(); };

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: closeModal, preserveScroll: true };
        editing
            ? put(`/admin/provinces/${editing.id}`, opts)
            : post("/admin/provinces", opts);
    };

    const confirmDelete = () => {
        destroy(`/admin/provinces/${deleteTarget.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return provinces;
        return provinces.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                p.zone_name?.toLowerCase().includes(q) ||
                p.country_name?.toLowerCase().includes(q)
        );
    }, [provinces, search]);

    return (
        <AdminLayout title="Provincias">
            <PageHeader
                title="Provincias"
                description="Gestiona las provincias y su zona de transporte asignada."
                action={<Btn onClick={openCreate}>+ Nueva provincia</Btn>}
            />

            {/* Buscador */}
            <div className="mb-4">
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre, zona o país…"
                    className="w-full max-w-sm rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2"
                />
            </div>

            <Table headers={["Provincia", "Zona", "País", "Acciones"]}
                   empty="No hay provincias que coincidan con la búsqueda.">
                {filtered.map((p) => (
                    <Tr key={p.id}>
                        <Td className="font-semibold">{p.name}</Td>
                        <Td>{p.zone_name}</Td>
                        <Td className="text-ink-500">{p.country_name}</Td>
                        <Td right>
                            <div className="flex justify-end gap-2">
                                <Btn size="sm" variant="secondary" onClick={() => openEdit(p)}>Editar</Btn>
                                <Btn size="sm" variant="danger" onClick={() => setDeleteTarget(p)}>Eliminar</Btn>
                            </div>
                        </Td>
                    </Tr>
                ))}
            </Table>

            <Modal open={modalOpen} title={editing ? "Editar provincia" : "Nueva provincia"} onClose={closeModal}>
                <form onSubmit={submit} className="space-y-4">
                    <Field label="Nombre" error={errors.name} required>
                        <Input
                            value={data.name}
                            onChange={(e) => setData("name", e.target.value)}
                            placeholder="Madrid"
                        />
                    </Field>

                    <Field label="Zona" error={errors.zone_id} required>
                        <Select
                            value={data.zone_id}
                            onChange={(e) => setData("zone_id", e.target.value)}
                        >
                            <option value="">Selecciona una zona…</option>
                            {zones.map((z) => (
                                <option key={z.id} value={z.id}>
                                    {z.country_name} — {z.name}
                                </option>
                            ))}
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
                title="¿Eliminar provincia?"
                message={`Se eliminará la provincia "${deleteTarget?.name}".`}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
                loading={processing}
            />
        </AdminLayout>
    );
}
