import React from "react";
import { Link, usePage } from "@inertiajs/react";

export default function AppLayout({ title, children }) {
    const { auth } = usePage().props;
    const user = auth?.user;
    const isAdmin = user?.role === 'admin';

    return (
        <div className="min-h-screen bg-ink-50 text-ink-800">
            {/* Topbar */}
            <header className="border-b border-ink-100 bg-white">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
                    {user ? (
                        <span className="text-xs text-ink-400">{user.name}</span>
                    ) : (
                        <span className="text-xs text-ink-400">Modo invitado</span>
                    )}
                    <div className="flex items-center gap-3">
                        {user ? (
                            <>
                                {isAdmin && (
                                    <Link
                                        href="/admin/countries"
                                        className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-1.5 text-xs font-extrabold text-ink-700 hover:bg-ink-100 transition"
                                    >
                                        Panel admin
                                    </Link>
                                )}
                                <Link
                                    href="/logout"
                                    method="post"
                                    as="button"
                                    className="text-xs text-ink-400 hover:text-ink-700 transition"
                                >
                                    Cerrar sesión
                                </Link>
                            </>
                        ) : (
                            <Link
                                href="/login"
                                className="text-xs text-ink-400 hover:text-ink-700 transition"
                            >
                                Iniciar sesión
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {/* Page */}
            <main className="mx-auto max-w-6xl px-4 py-6">
                {children}
            </main>

            <footer className="mx-auto max-w-6xl px-4 pb-8 pt-2 text-xs text-ink-400">
                © {new Date().getFullYear()} Palletizer
            </footer>
        </div>
    );
}