import React, { useState } from "react";

// ─── Botones ──────────────────────────────────────────────────────────────────

export function Btn({ children, variant = "primary", size = "md", className = "", ...props }) {
    const base = "inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary:   "bg-ink-900 text-white hover:bg-ink-700 focus:ring-ink-900 shadow-sm",
        secondary: "bg-white text-ink-700 border border-ink-200 hover:bg-ink-50 hover:border-ink-300 focus:ring-ink-300",
        danger:    "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-sm",
        warning:   "bg-brand-500 text-ink-900 hover:bg-brand-400 focus:ring-brand-500 shadow-sm",
        ghost:     "bg-transparent text-ink-500 hover:bg-ink-100 hover:text-ink-800 focus:ring-ink-200",
    };

    const sizes = {
        xs: "px-2 py-1 text-xs gap-1",
        sm: "px-2.5 py-1.5 text-xs gap-1.5",
        md: "px-3.5 py-2 text-sm gap-2",
        lg: "px-5 py-2.5 text-sm gap-2",
    };

    return (
        <button className={[base, variants[variant], sizes[size], className].join(" ")} {...props}>
            {children}
        </button>
    );
}

// Botones de acción con icono (Editar / Eliminar)
export function ActionBtn({ type = "edit", onClick, title }) {
    if (type === "edit") {
        return (
            <button
                type="button"
                onClick={onClick}
                title={title ?? "Editar"}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-400 transition hover:bg-ink-100 hover:text-ink-800"
            >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
            </button>
        );
    }
    if (type === "delete") {
        return (
            <button
                type="button"
                onClick={onClick}
                title={title ?? "Eliminar"}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-300 transition hover:bg-red-50 hover:text-red-500"
            >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
            </button>
        );
    }
    return null;
}

// ─── Campos de formulario ─────────────────────────────────────────────────────

export function Field({ label, error, hint, required, children }) {
    return (
        <div>
            {label && (
                <label className="block text-xs font-semibold uppercase tracking-wide text-ink-500 mb-1.5">
                    {label}
                    {required && <span className="ml-1 text-red-400">*</span>}
                </label>
            )}
            {children}
            {hint && !error && <p className="mt-1.5 text-xs text-ink-400">{hint}</p>}
            {error && <p className="mt-1.5 text-xs font-semibold text-red-500">{error}</p>}
        </div>
    );
}

export function Input({ className = "", ...props }) {
    return (
        <input
            className={[
                "w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800",
                "placeholder:text-ink-300",
                "outline-none transition focus:border-ink-400 focus:ring-2 focus:ring-ink-900/10",
                "disabled:bg-ink-50 disabled:text-ink-400",
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
                "w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800",
                "outline-none transition focus:border-ink-400 focus:ring-2 focus:ring-ink-900/10",
                "disabled:bg-ink-50 disabled:text-ink-400",
                className,
            ].join(" ")}
            {...props}
        >
            {children}
        </select>
    );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function Modal({ open, title, onClose, children, size = "md" }) {
    if (!open) return null;

    const sizes = {
        sm: "max-w-md",
        md: "max-w-lg",
        lg: "max-w-2xl",
        xl: "max-w-4xl",
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/60 backdrop-blur-sm">
            <div className={["relative w-full rounded-xl bg-white shadow-soft overflow-hidden", sizes[size]].join(" ")}>
                {/* Header con borde amarillo izquierdo */}
                <div className="flex items-center justify-between bg-ink-50 border-b border-ink-100 px-5 py-3.5">
                    <div className="flex items-center gap-3">
                        <div className="h-4 w-0.5 rounded-full bg-brand-500" />
                        <h2 className="text-sm font-extrabold text-ink-900">{title}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1 text-ink-400 hover:bg-ink-200 hover:text-ink-800 transition"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/60 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-xl bg-white shadow-soft overflow-hidden">
                <div className="p-5">
                    <div className="flex items-start gap-3.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 border border-red-100">
                            <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-extrabold text-ink-900">{title ?? "¿Eliminar registro?"}</h3>
                            <p className="mt-1 text-xs leading-relaxed text-ink-500">
                                {message ?? "Esta acción no se puede deshacer."}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-ink-100 bg-ink-50 px-5 py-3">
                    <Btn variant="secondary" size="sm" onClick={onCancel} disabled={loading}>
                        Cancelar
                    </Btn>
                    <Btn variant="danger" size="sm" onClick={onConfirm} disabled={loading}>
                        {loading ? "Eliminando…" : "Sí, eliminar"}
                    </Btn>
                </div>
            </div>
        </div>
    );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

export function Badge({ children, color = "gray" }) {
    const colors = {
        gray:   "bg-ink-100 text-ink-600",
        green:  "bg-green-50 text-green-700 ring-1 ring-green-200",
        red:    "bg-red-50 text-red-600 ring-1 ring-red-200",
        yellow: "bg-brand-50 text-brand-800 ring-1 ring-brand-200",
        blue:   "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    };

    return (
        <span className={["inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold", colors[color]].join(" ")}>
            {children}
        </span>
    );
}

// ─── Tabla ────────────────────────────────────────────────────────────────────

export function Table({ headers, children, empty = "No hay registros." }) {
    const isEmpty = React.Children.count(children) === 0;

    return (
        <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
            <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-0 text-left">
                    <thead>
                        <tr className="bg-ink-50">
                            {headers.map((h, i) => (
                                <th
                                    key={i}
                                    className={[
                                        "border-b border-ink-100 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-widest text-ink-400",
                                        h === "Acciones" ? "text-right" : "",
                                    ].join(" ")}
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isEmpty ? (
                            <tr>
                                <td colSpan={headers.length}>
                                    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50 text-ink-300">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-6 w-6">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                            </svg>
                                        </div>
                                        <p className="text-sm font-semibold text-ink-400">{empty}</p>
                                    </div>
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
        <tr className={["border-b border-ink-50 last:border-0 transition-colors", className].join(" ")}>
            {children}
        </tr>
    );
}

export function Td({ children, className = "", right = false, colSpan }) {
    return (
        <td
            colSpan={colSpan}
            className={["px-4 py-2.5 text-sm text-ink-700", right ? "text-right" : "", className].join(" ")}
        >
            {children}
        </td>
    );
}

// ─── Cabecera de página ───────────────────────────────────────────────────────

export function PageHeader({ title, description, action }) {
    return (
        <div className="mb-6 flex items-start justify-between gap-4">
            <div>
                <h1 className="text-lg font-extrabold text-ink-900">{title}</h1>
                {description && (
                    <p className="mt-0.5 text-sm text-ink-400">{description}</p>
                )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

// ─── Paginación ───────────────────────────────────────────────────────────────

export function Pagination({ pagination, onPageChange }) {
    if (!pagination || pagination.last_page <= 1) return null;

    const { current_page, last_page, total, per_page } = pagination;
    const from = (current_page - 1) * per_page + 1;
    const to   = Math.min(current_page * per_page, total);

    const pages = [];
    const delta = 2;
    const left  = Math.max(1, current_page - delta);
    const right = Math.min(last_page, current_page + delta);

    if (left > 1) { pages.push(1); if (left > 2) pages.push("..."); }
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < last_page) { if (right < last_page - 1) pages.push("..."); pages.push(last_page); }

    return (
        <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-xs text-ink-400">
                <span className="font-semibold text-ink-600">{from}–{to}</span> de <span className="font-semibold text-ink-600">{total}</span> registros
            </p>

            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onPageChange(current_page - 1)}
                    disabled={current_page === 1}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-ink-200 bg-white text-xs text-ink-500 transition hover:bg-ink-50 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    ‹
                </button>

                {pages.map((p, i) =>
                    p === "..." ? (
                        <span key={`d-${i}`} className="px-1 text-xs text-ink-300">·</span>
                    ) : (
                        <button
                            key={p}
                            type="button"
                            onClick={() => onPageChange(p)}
                            className={[
                                "flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold transition",
                                p === current_page
                                    ? "bg-ink-900 text-white"
                                    : "border border-ink-200 bg-white text-ink-600 hover:bg-ink-50",
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
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-ink-200 bg-white text-xs text-ink-500 transition hover:bg-ink-50 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    ›
                </button>
            </div>
        </div>
    );
}

// ─── Hook formulario local ────────────────────────────────────────────────────

export function useLocalForm(initial) {
    const [data, setData]           = useState(initial);
    const [errors, setErrors]       = useState({});
    const [processing, setProcessing] = useState(false);

    const set  = (field, value) => { setData(p => ({ ...p, [field]: value })); setErrors(p => ({ ...p, [field]: null })); };
    const reset = () => { setData(initial); setErrors({}); };
    const fill  = (obj) => { setData({ ...initial, ...obj }); setErrors({}); };

    return { data, setData, errors, setErrors, processing, setProcessing, set, reset, fill };
}