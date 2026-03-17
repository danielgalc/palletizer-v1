import React, { useState } from "react";

// ─── Botones ────────────────────────────────────────────────────────────────

export function Btn({ children, variant = "primary", size = "md", className = "", ...props }) {
    const base = "inline-flex items-center justify-center font-extrabold rounded-xl transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";

    const variants = {
        primary:   "bg-ink-900 text-white hover:bg-ink-700 focus:ring-ink-900",
        secondary: "bg-white text-ink-800 border border-ink-200 hover:bg-ink-50 focus:ring-ink-300",
        danger:    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-600",
        warning:   "bg-brand-500 text-ink-900 hover:bg-brand-600 focus:ring-brand-500",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs gap-1.5",
        md: "px-4 py-2 text-sm gap-2",
        lg: "px-5 py-2.5 text-sm gap-2",
    };

    return (
        <button
            className={[base, variants[variant], sizes[size], className].join(" ")}
            {...props}
        >
            {children}
        </button>
    );
}

// ─── Campo de formulario ─────────────────────────────────────────────────────

export function Field({ label, error, hint, required, children }) {
    return (
        <div>
            {label && (
                <label className="block text-sm font-semibold text-ink-700 mb-1">
                    {label}
                    {required && <span className="ml-1 text-red-500">*</span>}
                </label>
            )}
            {children}
            {hint && !error && (
                <p className="mt-1 text-xs text-ink-500">{hint}</p>
            )}
            {error && (
                <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>
            )}
        </div>
    );
}

export function Input({ className = "", ...props }) {
    return (
        <input
            className={[
                "w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800",
                "outline-none ring-brand-500 focus:ring-2",
                "disabled:bg-ink-50",
                className,
            ].join(" ")}
            {...props}
        />
    );
}

export function Select({ className = "", children, ...props }) {
    return (
        <select
            className={[
                "w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800",
                "outline-none ring-brand-500 focus:ring-2",
                "disabled:bg-ink-50",
                className,
            ].join(" ")}
            {...props}
        >
            {children}
        </select>
    );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

export function Modal({ open, title, onClose, children, size = "md" }) {
    if (!open) return null;

    const sizes = {
        sm: "max-w-md",
        md: "max-w-lg",
        lg: "max-w-2xl",
        xl: "max-w-4xl",
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4">
            <div className={["relative w-full overflow-hidden rounded-2xl bg-white shadow-soft", sizes[size]].join(" ")}>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
                    <h2 className="text-sm font-extrabold text-ink-900">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900 transition"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="max-h-[75vh] overflow-y-auto p-5">
                    {children}
                </div>
            </div>
        </div>
    );
}

// ─── Confirmación de borrado ──────────────────────────────────────────────────

export function ConfirmDialog({ open, title, message, onConfirm, onCancel, loading }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-soft">
                <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
                        <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-extrabold text-ink-900">{title ?? "¿Eliminar registro?"}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-ink-600">
                            {message ?? "Esta acción no se puede deshacer."}
                        </p>
                    </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                    <Btn variant="secondary" size="sm" onClick={onCancel} disabled={loading}>
                        Cancelar
                    </Btn>
                    <Btn variant="danger" size="sm" onClick={onConfirm} disabled={loading}>
                        {loading ? "Eliminando…" : "Eliminar"}
                    </Btn>
                </div>
            </div>
        </div>
    );
}

// ─── Badge de estado ─────────────────────────────────────────────────────────

export function Badge({ children, color = "gray" }) {
    const colors = {
        gray:   "bg-ink-100 text-ink-700",
        green:  "bg-green-100 text-green-700",
        red:    "bg-red-100 text-red-600",
        yellow: "bg-brand-100 text-brand-800",
        blue:   "bg-blue-100 text-blue-700",
    };

    return (
        <span className={["inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-extrabold", colors[color]].join(" ")}>
            {children}
        </span>
    );
}

// ─── Tabla base ───────────────────────────────────────────────────────────────

export function Table({ headers, children, empty = "No hay registros." }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
            <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-0">
                    <thead>
                        <tr>
                            {headers.map((h, i) => (
                                <th
                                    key={i}
                                    className={[
                                        "border-b border-ink-100 bg-ink-50 px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-ink-600",
                                        h === "Acciones" ? "text-right" : "",
                                    ].join(" ")}
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {React.Children.count(children) === 0 ? (
                            <tr>
                                <td
                                    colSpan={headers.length}
                                    className="px-4 py-8 text-center text-sm text-ink-500"
                                >
                                    {empty}
                                </td>
                            </tr>
                        ) : (
                            children
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function Tr({ children, className = "" }) {
    return (
        <tr className={["border-b border-ink-100 last:border-0 hover:bg-ink-50 transition", className].join(" ")}>
            {children}
        </tr>
    );
}

export function Td({ children, className = "", right = false }) {
    return (
        <td className={["px-4 py-3 text-sm text-ink-800", right ? "text-right" : "", className].join(" ")}>
            {children}
        </td>
    );
}

// ─── Cabecera de página ───────────────────────────────────────────────────────

export function PageHeader({ title, description, action }) {
    return (
        <div className="mb-6 flex items-start justify-between gap-4">
            <div>
                <h1 className="text-xl font-extrabold text-ink-900">{title}</h1>
                {description && (
                    <p className="mt-1 text-sm text-ink-500">{description}</p>
                )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

// ─── Paginación ───────────────────────────────────────────────────────────────
// Recibe el objeto `pagination` que devuelve Laravel (paginate(25))
// con: current_page, last_page, total, per_page

export function Pagination({ pagination, onPageChange }) {
    if (!pagination || pagination.last_page <= 1) return null;

    const { current_page, last_page, total, per_page } = pagination;

    const from = (current_page - 1) * per_page + 1;
    const to   = Math.min(current_page * per_page, total);

    // Genera el rango de páginas visible: siempre muestra 5 páginas centradas en la actual
    const pages = [];
    const delta = 2;
    const left  = Math.max(1, current_page - delta);
    const right = Math.min(last_page, current_page + delta);

    if (left > 1) {
        pages.push(1);
        if (left > 2) pages.push("...");
    }
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < last_page) {
        if (right < last_page - 1) pages.push("...");
        pages.push(last_page);
    }

    return (
        <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-xs text-ink-500">
                Mostrando <b>{from}–{to}</b> de <b>{total}</b> registros
            </p>

            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onPageChange(current_page - 1)}
                    disabled={current_page === 1}
                    className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                    ←
                </button>

                {pages.map((p, i) =>
                    p === "..." ? (
                        <span key={`dots-${i}`} className="px-1 text-xs text-ink-400">…</span>
                    ) : (
                        <button
                            key={p}
                            type="button"
                            onClick={() => onPageChange(p)}
                            className={[
                                "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                                p === current_page
                                    ? "border-ink-900 bg-ink-900 text-white"
                                    : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50",
                            ].join(" ")}
                        >
                            {p}
                        </button>
                    )
                )}

                <button
                    type="button"
                    onClick={() => onPageChange(current_page + 1)}
                    disabled={current_page === last_page}
                    className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                    →
                </button>
            </div>
        </div>
    );
}


// Útil para los modales que hacen fetch directamente.

export function useLocalForm(initial) {
    const [data, setData] = useState(initial);
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);

    const set = (field, value) => {
        setData((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: null }));
    };

    const reset = () => {
        setData(initial);
        setErrors({});
    };

    const fill = (obj) => {
        setData({ ...initial, ...obj });
        setErrors({});
    };

    return { data, setData, errors, setErrors, processing, setProcessing, set, reset, fill };
}