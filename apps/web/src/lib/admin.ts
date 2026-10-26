'use client';

import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';
import { del, get, HttpError, patch, post, put } from './client-api';
import type { User } from './types';

/**
 * Datos del panel. Cada cambio que guarda la API dispara la revalidación del sitio público
 * (por etiquetas), así que lo editado se ve al instante en la web.
 */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => get<{ user: User }>('/auth/me').then((r) => r.user),
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useAdminQuery<T>(key: QueryKey, path: string, opts: { enabled?: boolean; refetchInterval?: number } = {}) {
  return useQuery({ queryKey: key, queryFn: () => get<T>(path), ...opts });
}

type Method = 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/** Mutación con aviso de éxito o error e invalidación de las consultas afectadas */
export function useAdminMutation<TVars = unknown, TRes = unknown>(opts: {
  method: Method;
  path: string | ((v: TVars) => string);
  body?: (v: TVars) => unknown;
  invalidate?: QueryKey[];
  success?: string | ((res: TRes) => string) | false;
  onSuccess?: (res: TRes, vars: TVars) => void;
}) {
  const qc = useQueryClient();
  return useMutation<TRes, Error, TVars>({
    mutationFn: async (vars) => {
      const path = typeof opts.path === 'function' ? opts.path(vars) : opts.path;
      const body = opts.body ? opts.body(vars) : vars;
      switch (opts.method) {
        case 'POST':
          return post<TRes>(path, body);
        case 'PATCH':
          return patch<TRes>(path, body);
        case 'PUT':
          return put<TRes>(path, body);
        case 'DELETE':
          return del<TRes>(path);
      }
    },
    onSuccess: (res, vars) => {
      opts.invalidate?.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      qc.invalidateQueries({ queryKey: ['stats'] });
      if (opts.success) toast.success(typeof opts.success === 'function' ? opts.success(res) : opts.success);
      opts.onSuccess?.(res, vars);
    },
    onError: (err) => {
      toast.error(err instanceof HttpError ? err.message : 'No se pudo guardar. Probá de nuevo.');
    },
  });
}

/** Lista de textos separada por renglones o comas → array limpio */
export const splitList = (s: string) =>
  s
    .split(/\n|,(?![^(]*\))/)
    .map((x) => x.trim())
    .filter(Boolean);
