import React, { useState, useMemo } from "react";
import { useForm } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import {
    Btn, ActionBtn, Field, Input, Select, Modal, ConfirmDialog,
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
    const [search, setSearch]             = useState("");
    const [typeFilter, setTypeFilter]     = useState("");

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return providers.filter((p) => {
            const matchesSearch = !q || p.name.toLowerCase().includes(q);
            const matchesType   = !typeFilter || p.provider_type === typeFilter;
            return matchesSearch && matchesType;
        });
    }, [providers, search, typeFilter]);

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

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre…"
                    className="max-w-xs"
                />
                <div className="w-56">
                    <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                        <option value="">Todos los tipos</option>
                        <option value="new_supplier">Cajas nuevas</option>
                        <option value="reused_source">Cajas reutilizadas</option>
                    </Select>
                </div>
                {(search || typeFilter) && (
                    <Btn variant="secondary" size="sm" onClick={() => { setSearch(""); setTypeFilter(""); }}>
                        Limpiar filtros
                    </Btn>
                )}
                <span className="ml-auto self-center text-sm text-ink-500">
                    {filtered.length} proveedor{filtered.length !== 1 ? "es" : ""}
                </span>
            </div>

            <Table headers={["Nombre", "Tipo", "Acciones"]} empty="No hay proveedores que coincidan.">
                {filtered.map((p) => (
                    <Tr key={p.id}>
                        <Td className="font-semibold">{p.name}</Td>
                        <Td>
                            <Badge color={p.provider_type === "new_supplier" ? "blue" : "yellow"}>
                                {TYPE_LABELS[p.provider_type] ?? p.provider_type}
                            </Badge>
                        </Td>
                        <Td right>
                            <div className="flex justify-end gap-2">
                                <ActionBtn type="edit" onClick={() => openEdit(p)} />
                                <ActionBtn type="delete" onClick={() => setDeleteTarget(p)} />
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
