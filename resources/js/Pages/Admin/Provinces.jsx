import React, { useState, useCallback } from "react";
import { useForm, router } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import {
    Btn, Field, Input, Select, Modal, ConfirmDialog,
    Table, Tr, Td, PageHeader, Pagination,
} from "@/Components/Admin/Ui";

const EMPTY = { name: "", zone_id: "" };

function useDebounce(fn, delay = 400) {
    const timer = React.useRef(null);
    return useCallback((...args) => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => fn(...args), delay);
    }, [fn]);
}

export default function Provinces({ provinces, zones, filters }) {
    const [modalOpen, setModalOpen]       = useState(false);
    const [editing, setEditing]           = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [search, setSearch]             = useState(filters?.search ?? "");

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm(EMPTY);

    const doSearch = useDebounce((value) => {
        router.get("/admin/provinces", { search: value || undefined }, {
            preserveState: true, preserveScroll: true, replace: true,
        });
    });

    const handleSearch = (e) => {
        setSearch(e.target.value);
        doSearch(e.target.value);
    };

    const goToPage = (page) => {
        router.get("/admin/provinces", { ...filters, page }, {
            preserveState: true, preserveScroll: true,
        });
    };

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

    return (
        <AdminLayout title="Provincias">
            <PageHeader
                title="Provincias"
                description="Gestiona las provincias y su zona de transporte asignada."
                action={<Btn onClick={openCreate}>+ Nueva provincia</Btn>}
            />

            <div className="mb-4">
                <Input
                    value={search}
                    onChange={handleSearch}
                    placeholder="Buscar por nombre, zona o país…"
                    className="max-w-sm"
                />
            </div>

            <Table headers={["Provincia", "Zona", "País", "Acciones"]}
                   empty="No hay provincias que coincidan con la búsqueda.">
                {provinces.data.map((p) => (
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

            <Pagination pagination={provinces} onPageChange={goToPage} />

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
                        <Select value={data.zone_id} onChange={(e) => setData("zone_id", e.target.value)}>
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
                onConfirm={() => destroy(`/admin/provinces/${deleteTarget.id}`, {
                    preserveScroll: true, onSuccess: () => setDeleteTarget(null),
                })}
                onCancel={() => setDeleteTarget(null)}
                loading={processing}
            />
        </AdminLayout>
    );
}