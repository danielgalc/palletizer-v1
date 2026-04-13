import React, { useState, useEffect } from "react";
import { Link, usePage, router } from "@inertiajs/react";

// ─── Iconos SVG inline ────────────────────────────────────────────────────────
const Icon = {
    globe: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
        </svg>
    ),
    map: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
    ),
    truck: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1v-1h1a1 1 0 00.894-.553l2-4A1 1 0 0015 9h-1V6a1 1 0 00-1-1H3zm11 3.5V9h-1.5l-1-2H14v.5z" />
        </svg>
    ),
    pallet: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h5a1 1 0 000-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM13 16a1 1 0 102 0v-5.586l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 101.414 1.414L13 10.414V16z" />
        </svg>
    ),
    tag: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
    ),
    box: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
        </svg>
    ),
    users: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
    ),
    logout: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
        </svg>
    ),
    back: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
    ),
    menu: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
    ),
};

const NAV = [
    {
        group: "General",
        items: [
            { href: "/admin", label: "General", icon: Icon.pallet, exact: true },
        ],
    },
    {
        group: "Geografía",
        items: [
            { href: "/admin/countries", label: "Geografía", icon: Icon.globe },
        ],
    },
    {
        group: "Transporte",
        items: [
            { href: "/admin/carriers",     label: "Transportistas",    icon: Icon.truck  },
            { href: "/admin/pallet-types", label: "Tipos de pallet",   icon: Icon.pallet },
            { href: "/admin/rates",        label: "Tarifas",           icon: Icon.tag    },
        ],
    },
    {
        group: "Cajas",
        items: [
            { href: "/admin/box-types",     label: "Tipos de caja", icon: Icon.box },
            { href: "/admin/box-providers", label: "Proveedores",   icon: Icon.box },
            { href: "/admin/box-variants",  label: "Variantes",     icon: Icon.box },
        ],
    },
    {
        group: "Equipos",
        items: [
            { href: "/admin/device-models", label: "Modelos de dispositivo", icon: Icon.users },
        ],
    },
];

function NavItem({ href, label, icon, exact = false }) {
    const { url } = usePage();
    const active = exact ? url === href : url.startsWith(href);

    return (
        <Link
            href={href}
            className={[
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                active
                    ? "bg-brand-500 text-ink-900"
                    : "text-ink-400 hover:bg-ink-800 hover:text-white",
            ].join(" ")}
        >
            <span className={active ? "text-ink-900" : "text-ink-500 group-hover:text-white transition-colors"}>
                {icon}
            </span>
            {label}
            {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-ink-900" />
            )}
        </Link>
    );
}

// ─── Toast de flash ───────────────────────────────────────────────────────────
function Toast() {
    const { flash } = usePage().props;
    const [visible, setVisible] = useState(false);
    const [msg, setMsg] = useState(null);
    const [type, setType] = useState("success");

    useEffect(() => {
        const message = flash?.success || flash?.error;
        const t       = flash?.error ? "error" : "success";
        if (message) {
            setMsg(message);
            setType(t);
            setVisible(true);
            const timer = setTimeout(() => setVisible(false), 3500);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    if (!visible || !msg) return null;

    return (
        <div
            className={[
                "fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-xl px-4 py-3 shadow-soft",
                "text-sm font-semibold",
                "animate-in fade-in slide-in-from-bottom-2 duration-200",
                type === "error"
                    ? "bg-red-600 text-white"
                    : "bg-ink-900 text-white border-l-4 border-brand-500",
            ].join(" ")}
        >
            {type === "success" ? (
                <svg className="h-4 w-4 shrink-0 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
            ) : (
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
            )}
            {msg}
            <button
                type="button"
                onClick={() => setVisible(false)}
                className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
            >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

// ─── Layout principal ─────────────────────────────────────────────────────────
export default function AdminLayout({ title, children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { auth } = usePage().props;
    const user = auth?.user;

    // Iniciales del usuario para el avatar
    const initials = user?.name
        ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
        : "?";

    return (
        <div className="flex min-h-screen bg-ink-50">

            {/* ── Sidebar ───────────────────────────────────────────────── */}
            <aside className={[
                "fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-ink-900 transition-transform duration-200 lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:z-auto",
                sidebarOpen ? "translate-x-0" : "-translate-x-full",
            ].join(" ")}>

                {/* Marca */}
                <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-ink-800 px-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white overflow-hidden">
                        <img src="/palletizer_icon_final.png" alt="Palletizer" className="h-7 w-7 object-contain" />
                    </div>
                    <div>
                        <div className="text-xs font-extrabold tracking-tight text-white leading-none">Palletizer</div>
                        <div className="text-[10px] text-ink-500 leading-none mt-0.5">Panel de admin</div>
                    </div>
                </div>

                {/* Nav — min-h-0 es clave: sin él, flex-1 ignora el límite del contenedor */}
                <nav className="flex-1 min-h-0 overflow-y-auto scrollbar-dark px-2 py-3 space-y-4">
                    {NAV.map((group) => (
                        <div key={group.group}>
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

                {/* Footer — siempre visible */}
                <div className="shrink-0 border-t border-ink-800 px-2 py-3 space-y-0.5">
                    <Link
                        href="/"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-ink-800 hover:text-white transition-all"
                    >
                        {Icon.back}
                        Volver a Palletizer
                    </Link>
                </div>
            </aside>

            {/* Overlay móvil */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/60 lg:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ── Contenido ─────────────────────────────────────────────── */}
            <div className="flex flex-1 flex-col min-w-0">

                {/* Topbar */}
                <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-ink-100 bg-white px-5">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            className="lg:hidden rounded-lg p-1.5 text-ink-500 hover:bg-ink-50 transition"
                            onClick={() => setSidebarOpen(true)}
                        >
                            {Icon.menu}
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-ink-300">/</span>
                            <h1 className="text-sm font-extrabold text-ink-900 truncate">
                                {title ?? "Admin"}
                            </h1>
                        </div>
                    </div>

                    {/* Usuario */}
                    {user && (
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <div className="text-xs font-semibold text-ink-800 leading-none">{user.name}</div>
                                <div className="text-[10px] text-ink-400 mt-0.5 leading-none">{user.email}</div>
                            </div>
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-extrabold text-ink-900 shrink-0">
                                {initials}
                            </div>
                            <Link
                                href="/logout"
                                method="post"
                                as="button"
                                className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:bg-red-100 active:border-red-300 transition"
                                title="Cerrar sesión"
                            >
                                {Icon.logout}
                                <span className="hidden sm:inline">Salir</span>
                            </Link>
                        </div>
                    )}
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-auto p-6">
                    {children}
                </main>
            </div>

            {/* Toast de feedback */}
            <Toast />
        </div>
    );
}