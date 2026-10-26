'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

interface UICtx {
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
}

const Ctx = createContext<UICtx>({ searchOpen: false, openSearch: () => {}, closeSearch: () => {} });

export function UIProvider({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  // ⌘K / Ctrl+K y "/" abren el buscador
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const value = useMemo(() => ({ searchOpen, openSearch, closeSearch }), [searchOpen, openSearch, closeSearch]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useUI = () => useContext(Ctx);
