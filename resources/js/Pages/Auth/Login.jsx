import { Head, useForm, router } from '@inertiajs/react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    const enterAsGuest = () => {
        router.post(route('guest.access'));
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
            <Head title="Acceder" />

            <div className="w-full max-w-sm rounded-2xl bg-white shadow-soft ring-1 ring-ink-100 px-8 pt-4 pb-8">
                {/* Logo */}
                <div className="mb-3 flex flex-col items-center">
                    <img src="/palletizer.png" alt="Palletizer" className="h-28 w-auto object-contain" />

                </div>

                {status && (
                    <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                        {status}
                    </div>
                )}

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-ink-700 mb-1">
                            Correo electrónico
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={data.email}
                            autoComplete="username"
                            autoFocus
                            onChange={(e) => setData('email', e.target.value)}
                            className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2 disabled:bg-ink-50"
                            placeholder="admin@ejemplo.com"
                        />
                        {errors.email && (
                            <p className="mt-1 text-xs font-semibold text-red-600">{errors.email}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-semibold text-ink-700 mb-1">
                            Contraseña
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={data.password}
                            autoComplete="current-password"
                            onChange={(e) => setData('password', e.target.value)}
                            className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2 disabled:bg-ink-50"
                            placeholder="••••••••"
                        />
                        {errors.password && (
                            <p className="mt-1 text-xs font-semibold text-red-600">{errors.password}</p>
                        )}
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-ink-600 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={data.remember}
                                onChange={(e) => setData('remember', e.target.checked)}
                                className="rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                            />
                            Recordarme
                        </label>
                        {canResetPassword && (
                            <a
                                href={route('password.request')}
                                className="text-xs text-brand-600 hover:underline"
                            >
                                ¿Olvidaste tu contraseña?
                            </a>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
                    >
                        {processing ? 'Entrando…' : 'Iniciar sesión'}
                    </button>
                </form>

                <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-ink-100" />
                    <span className="text-xs text-ink-400">o</span>
                    <div className="h-px flex-1 bg-ink-100" />
                </div>

                <button
                    type="button"
                    onClick={enterAsGuest}
                    className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 transition-colors"
                >
                    Usar como invitado
                </button>
            </div>
        </div>
    );
}
