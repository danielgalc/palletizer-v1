import React, { useState } from "react";
import { Link, usePage } from "@inertiajs/react";

const NAV = [
    {
        group: "Geografía",
        items: [
            { href: "/admin/countries",  label: "Países y Zonas" },
            { href: "/admin/provinces",  label: "Provincias" },
        ],
    },
    {
        group: "Transporte",
        items: [
            { href: "/admin/carriers",     label: "Transportistas" },
            { href: "/admin/pallet-types", label: "Tipos de pallet" },
            { href: "/admin/rates",        label: "Tarifas" },
        ],
    },
    {
        group: "Cajas",
        items: [
            { href: "/admin/box-types",     label: "Tipos de caja" },
            { href: "/admin/box-providers", label: "Proveedores" },
            { href: "/admin/box-variants",  label: "Variantes" },
        ],
    },
    {
        group: "Equipos",
        items: [
            { href: "/admin/device-models", label: "Modelos de dispositivo" },
        ],
    },
];

function NavItem({ href, label }) {
    const { url } = usePage();
    const active = url.startsWith(href);

    return (
        <Link
            href={href}
            className={[
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
                active
                    ? "bg-brand-500 text-ink-900"
                    : "text-ink-300 hover:bg-ink-700 hover:text-white",
            ].join(" ")}
        >
            {label}
        </Link>
    );
}

export default function AdminLayout({ title, children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-ink-50">
            {/* Sidebar */}
            <aside
                className={[
                    "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-ink-900 transition-transform lg:translate-x-0 lg:static lg:z-auto",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full",
                ].join(" ")}
            >
                {/* Logo */}
                <div className="flex h-16 shrink-0 items-center gap-3 border-b border-ink-700 px-5">
                    <div className="h-7 w-7 rounded-lg bg-brand-500" />
                    <span className="text-sm font-extrabold tracking-tight text-white">
                        Admin Panel
                    </span>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto px-3 py-4">
                    {NAV.map((group) => (
                        <div key={group.group} className="mb-5">
                            <div className="mb-1 px-3 text-[10px] font-extrabold uppercase tracking-widest text-ink-500">
                                {group.group}
                            </div>
                            <div className="space-y-0.5">
                                {group.items.map((item) => (
                                    <NavItem key={item.href} {...item} />
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Footer links */}
                <div className="shrink-0 border-t border-ink-700 px-3 py-4 space-y-0.5">
                    <Link
                        href="/palletizer"
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-ink-400 hover:bg-ink-700 hover:text-white transition"
                    >
                        ← Volver a Palletizer
                    </Link>
                </div>
            </aside>

            {/* Overlay móvil */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-ink-900/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Contenido principal */}
            <div className="flex flex-1 flex-col min-w-0">
                {/* Topbar */}
                <header className="flex h-16 shrink-0 items-center gap-4 border-b border-ink-200 bg-white px-6">
                    {/* Botón hamburguesa móvil */}
                    <button
                        type="button"
                        className="lg:hidden rounded-lg border border-ink-200 p-2 text-ink-600 hover:bg-ink-50"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    <h1 className="text-base font-extrabold text-ink-900 truncate">
                        {title ?? "Admin"}
                    </h1>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
