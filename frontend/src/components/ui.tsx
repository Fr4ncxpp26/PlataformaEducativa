import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

export function Field({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
    return (
        <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
            <input
                {...props}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
        </label>
    );
}

const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'border border-slate-300 text-slate-700 hover:bg-slate-100',
};

export function Button({
    variant = 'primary', loading, children, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants; loading?: boolean }) {
    return (
        <button
            {...props}
            disabled={loading || props.disabled}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]}`}
        >
            {loading ? 'Procesando…' : children}
        </button>
    );
}

export function Alert({ type, children }: { type: 'error' | 'success'; children: ReactNode }) {
    const c = type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200';
    return <div className={`rounded-lg border px-3 py-2 text-sm ${c}`}>{children}</div>;
}

export function Spinner() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
    );
}

export function Avatar({ nombre, url, size = 'h-10 w-10' }: { nombre: string; url?: string | null; size?: string }) {
    return url ? (
        <img src={url} alt={nombre} referrerPolicy="no-referrer" className={`${size} rounded-full object-cover`} />
    ) : (
        <div className={`${size} flex items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700`}>
            {nombre.charAt(0).toUpperCase()}
        </div>
    );
}