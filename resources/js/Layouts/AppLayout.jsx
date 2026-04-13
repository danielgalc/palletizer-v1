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
                                        href="/admin"
                                        className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-1.5 text-xs font-extrabold text-ink-700 hover:bg-ink-100 transition"
                                    >
                                        Panel admin
                                    </Link>
                                )}
                                <Link
                                    href="/logout"
                                    method="post"
                                    as="button"
                                    title="Cerrar sesión"
                                    className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:bg-red-100 active:border-red-300 transition"
                                >
                                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
                                        <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                                    </svg>
                                    <span className="hidden sm:inline">Salir</span>
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