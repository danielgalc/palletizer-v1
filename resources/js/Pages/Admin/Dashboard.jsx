import AdminLayout from "@/Layouts/AdminLayout";
import { Link } from "@inertiajs/react";

const sections = [
    {
        group: "Geografía",
        items: [
            { href: "/admin/countries", label: "Geografía", description: "Gestiona países, zonas de envío y destinos desde un solo lugar." },
        ],
    },
    {
        group: "Transporte",
        items: [
            { href: "/admin/carriers",     label: "Transportistas",  description: "Empresas de transporte disponibles." },
            { href: "/admin/pallet-types", label: "Tipos de pallet", description: "Dimensiones y capacidades de cada tipo de pallet." },
            { href: "/admin/rates",        label: "Tarifas",         description: "Precios por transportista, zona y tipo de pallet." },
        ],
    },
    {
        group: "Cajas",
        items: [
            { href: "/admin/box-types",     label: "Tipos de caja", description: "Categorías de caja por tipo de equipo." },
            { href: "/admin/box-providers", label: "Proveedores",    description: "Proveedores de material de embalaje." },
            { href: "/admin/box-variants",  label: "Variantes",      description: "Variantes de caja con dimensiones, stock y coste." },
        ],
    },
    {
        group: "Equipos",
        items: [
            { href: "/admin/device-models", label: "Modelos de dispositivo", description: "Catálogo de dispositivos con tipo de caja y peso." },
        ],
    },
];

export default function Dashboard() {
    return (
        <AdminLayout title="General">
            <div className="space-y-8">
                <div>
                    <h2 className="text-xl font-extrabold text-ink-900">Panel de administración</h2>
                    <p className="mt-1 text-sm text-ink-400">Selecciona un apartado para gestionar los datos.</p>
                </div>

                {sections.map((section) => (
                    <div key={section.group}>
                        <div className="mb-3 text-xs font-extrabold uppercase tracking-widest text-ink-400">
                            {section.group}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {section.items.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft hover:border-brand-400 hover:shadow-md transition-all group"
                                >
                                    <div className="text-sm font-extrabold text-ink-900 group-hover:text-brand-700 transition-colors">
                                        {item.label}
                                    </div>
                                    <div className="mt-1 text-xs text-ink-400">{item.description}</div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </AdminLayout>
    );
}
