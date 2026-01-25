import React from "react";

export default function AppLayout({ children }) {
    return (
        <div className="min-h-screen bg-ink-50 text-ink-800">
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
