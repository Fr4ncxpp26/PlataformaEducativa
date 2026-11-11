import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

export function Field({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
    return (
        <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
            <input
                {...props}
                className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100 ${props.className ?? ''}`}
            />
        </label>
    );
}

const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-300',
    ghost: 'border border-slate-300 text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-300',
};

export function Button({
    variant = 'primary',
    loading = false,
    children,
    type = 'button',
    className = '',
    disabled,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants; loading?: boolean }) {
    return (
        <button
            {...props}
            type={type}
            disabled={loading || disabled}
            aria-busy={loading || undefined}
            className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
        >
            {loading ? 'Procesando…' : children}
        </button>
    );
}

export function Alert({ type, children }: { type: 'error' | 'success'; children: ReactNode }) {
    const styles = type === 'error'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-green-200 bg-green-50 text-green-700';

    return (
        <div role={type === 'error' ? 'alert' : 'status'} aria-live={type === 'error' ? 'assertive' : 'polite'} className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>
            {children}
        </div>
    );
}

// El spinner ocupa solo el espacio de su contenido, no una pantalla completa dentro de cada panel.
export function Spinner() {
    return (
        <div className="flex min-h-48 items-center justify-center" role="status" aria-label="Cargando">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
    );
}

export function Avatar({ nombre, url, size = 'h-10 w-10' }: { nombre: string; url?: string | null; size?: string }) {
    return url ? (
        <img src={url} alt={`Foto de ${nombre}`} loading="lazy" referrerPolicy="no-referrer" className={`${size} rounded-full object-cover`} />
    ) : (
        <div aria-label={`Inicial de ${nombre}`} className={`${size} flex items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700`}>
            {nombre.charAt(0).toUpperCase()}
        </div>
    );
}
