// Navegación completa (no fetch): el backend redirige a Google y luego vuelve a /dashboard con cookies
export default function GoogleButton() {
    return (
        <a
            href="/api/auth/google"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
            <span className="text-base font-bold text-red-500">G</span> Continuar con Google
        </a>
    );
}