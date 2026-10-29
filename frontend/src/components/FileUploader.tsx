import React, { useState, useRef } from 'react';
import { uploadMediaFile, type UploadFolder, type UploadedFileResponse } from '../lib/api';

interface FileUploaderProps {
    label: string;
    folder: UploadFolder;
    value?: string;
    accept?: 'image' | 'pdf' | 'both';
    helperText?: string;
    onChange: (url: string, meta?: UploadedFileResponse) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
    label,
    folder,
    value = '',
    accept = 'image',
    helperText,
    onChange,
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const acceptAttr =
        accept === 'image'
            ? 'image/jpeg,image/png,image/webp,image/svg+xml'
            : accept === 'pdf'
                ? 'application/pdf'
                : 'image/jpeg,image/png,image/webp,image/svg+xml,application/pdf';

    const isPdfUrl = (url: string) =>
        url.toLowerCase().endsWith('.pdf') || url.includes('/courses/pdfs/');

    const handleFileProcess = async (file?: File) => {
        if (!file) return;
        setError(null);

        if (file.size > 15 * 1024 * 1024) {
            setError('El archivo supera el límite máximo de 15 MB.');
            return;
        }

        try {
            setIsUploading(true);
            const uploaded = await uploadMediaFile(file, folder);
            onChange(uploaded.url, uploaded);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'No se pudo subir el archivo.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileProcess(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-zinc-200">{label}</label>
                <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                >
                    {showUrlInput ? 'Subir desde mi equipo' : 'O pegar enlace directo'}
                </button>
            </div>

            {showUrlInput ? (
                <input
                    type="url"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="https://res.cloudinary.com/..."
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                />
            ) : (
                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    onClick={() => !isUploading && inputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 transition-all cursor-pointer ${dragActive
                            ? 'border-emerald-400 bg-emerald-950/30'
                            : 'border-zinc-700 bg-zinc-900/60 hover:border-emerald-500/60 hover:bg-zinc-900'
                        }`}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept={acceptAttr}
                        className="hidden"
                        onChange={(e) => handleFileProcess(e.target.files?.[0])}
                    />

                    {isUploading ? (
                        <div className="flex flex-col items-center py-4 space-y-2">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                            <span className="text-xs text-emerald-400 font-medium">
                                Subiendo y optimizando en Cloudinary...
                            </span>
                        </div>
                    ) : value ? (
                        <div className="w-full flex items-center justify-between gap-4 bg-zinc-800/80 p-3 rounded-lg border border-zinc-700">
                            {isPdfUrl(value) ? (
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-red-400 font-bold text-xs border border-red-500/30">
                                        PDF
                                    </div>
                                    <div className="truncate">
                                        <p className="text-sm font-medium text-zinc-100 truncate">
                                            Documento PDF cargado
                                        </p>
                                        <a
                                            href={value}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-xs text-emerald-400 hover:underline"
                                        >
                                            Abrir PDF en pestaña nueva ↗
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <img
                                        src={value}
                                        alt="Vista previa"
                                        className="h-14 w-20 shrink-0 rounded-md object-cover border border-zinc-600"
                                    />
                                    <div className="truncate">
                                        <p className="text-xs font-medium text-emerald-400">
                                            ✓ Imagen lista
                                        </p>
                                        <p className="text-xs text-zinc-400 truncate">
                                            Haz clic o arrastra otra para reemplazarla
                                        </p>
                                    </div>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange('');
                                }}
                                className="shrink-0 rounded-lg bg-zinc-700/80 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-950/60 hover:text-red-200"
                            >
                                Quitar
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-2">
                            <p className="text-sm font-medium text-zinc-200">
                                Arrastra tu archivo aquí o{' '}
                                <span className="text-emerald-400 underline">explora tu equipo</span>
                            </p>
                            <p className="mt-1 text-xs text-zinc-400">
                                {helperText ||
                                    (accept === 'pdf'
                                        ? 'Soporta archivos PDF (máx. 15 MB)'
                                        : accept === 'both'
                                            ? 'Soporta Imágenes (JPG, PNG, WEBP) y documentos PDF (máx. 15 MB)'
                                            : 'Soporta JPG, PNG, WEBP o SVG optimizados automáticamente')}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
        </div>
    );
};