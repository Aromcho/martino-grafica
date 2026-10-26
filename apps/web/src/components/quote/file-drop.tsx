'use client';

import { FileText, Paperclip, UploadCloud, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { fileSize } from '@/lib/format';

export const ACCEPT = ['.pdf', '.ai', '.eps', '.svg', '.cdr', '.psd', '.png', '.jpg', '.jpeg', '.webp', '.heic', '.tif', '.tiff', '.zip', '.rar', '.dxf', '.plt'];
export const MAX_FILES = 5;
export const MAX_MB = 25;

const ext = (name: string) => (name.match(/\.[^.]+$/)?.[0] ?? '').toLowerCase();

/** Zona para soltar o elegir los archivos del diseño (hasta 5, 25 MB cada uno) */
export function FileDrop({ files, onChange, error }: { files: File[]; onChange: (f: File[]) => void; error?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [problem, setProblem] = useState('');
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const f of files) if (/^image\/(png|jpe?g|webp|svg\+xml)$/.test(f.type)) next[f.name + f.size] = URL.createObjectURL(f);
    setThumbs(next);
    return () => Object.values(next).forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const add = (list: FileList | File[]) => {
    const incoming = Array.from(list);
    const bad = incoming.find((f) => !ACCEPT.includes(ext(f.name)));
    const big = incoming.find((f) => f.size > MAX_MB * 1024 * 1024);
    const merged = [...files, ...incoming.filter((f) => ACCEPT.includes(ext(f.name)) && f.size <= MAX_MB * 1024 * 1024 && !files.some((x) => x.name === f.name && x.size === f.size))];
    setProblem(
      bad
        ? `"${bad.name}" no es un formato de diseño. Subí PDF, AI, CDR, PSD, SVG, PNG o JPG.`
        : big
          ? `"${big.name}" pesa más de ${MAX_MB} MB. Mandalo por WhatsApp o comprimilo.`
          : merged.length > MAX_FILES
            ? `Podés subir hasta ${MAX_FILES} archivos.`
            : '',
    );
    onChange(merged.slice(0, MAX_FILES));
  };

  const msg = error || problem;
  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          add(e.dataTransfer.files);
        }}
        className={cn(
          'relative flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-5 py-8 text-center transition-colors',
          over ? 'border-cut bg-cut/5' : 'border-black/20 hover:border-black/40',
        )}
      >
        <UploadCloud className="size-7 text-ink/60" aria-hidden="true" />
        <p className="font-bold text-ink">
          <button type="button" onClick={() => input.current?.click()} className="underline underline-offset-4">
            Elegí los archivos
          </button>{' '}
          <span className="hidden font-normal text-slate sm:inline">o arrastralos acá</span>
        </p>
        <p className="text-sm text-slate">PDF, AI, CDR, PSD, SVG, PNG o JPG. Hasta {MAX_FILES} archivos de {MAX_MB} MB.</p>
        <input
          ref={input}
          type="file"
          multiple
          accept={ACCEPT.join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-label="Archivos del diseño"
          onChange={(e) => {
            if (e.target.files) add(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {msg && (
        <p className="mt-2 text-sm font-semibold text-danger" role="alert">
          {msg}
        </p>
      )}
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f, i) => {
            const t = thumbs[f.name + f.size];
            return (
              <li key={f.name + f.size} className="flex items-center gap-3 rounded-md bg-white p-2 pr-1 ring-1 ring-black/10">
                <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded bg-liner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {t ? <img src={t} alt="" className="size-full object-cover" /> : ext(f.name) === '.pdf' ? <FileText className="size-5 text-ink/60" /> : <Paperclip className="size-5 text-ink/60" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{f.name}</span>
                  <span className="text-xs text-slate">{fileSize(f.size)}</span>
                </span>
                <button type="button" onClick={() => onChange(files.filter((_, k) => k !== i))} className="grid size-10 place-items-center rounded text-slate hover:bg-black/5 hover:text-ink" aria-label={`Quitar ${f.name}`}>
                  <X className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Primera imagen subida (para mostrarla en la vista previa a escala) */
export function useFirstImage(files: File[]) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const img = files.find((f) => /^image\/(png|jpe?g|webp|svg\+xml)$/.test(f.type));
    if (!img) return setUrl(null);
    const u = URL.createObjectURL(img);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [files]);
  return url;
}
