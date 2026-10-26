'use client';

/**
 * Elemento firma: el logo se "plotea".
 * El punto blanco del logo es la cuchilla: recorre el contorno de la M y la R (una sola pieza) y de la T
 * sobre una plancha de vinilo lima; después el sobrante se despega (como cuando se pela un calco)
 * y queda el logo. Tocá el punto para volver a cortarlo.
 * Con "reducir movimiento" se muestra el logo terminado, sin animación.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { DOT, LOGO_VIEWBOX, PATH_MR, PATH_T, SHEET } from './logo-paths';

const LIME = '#C6F800';
const T_FEED = 450; // la plancha entra
const T_CUT = 2600; // corte de las letras
const T_PEEL = 1150; // despegado del sobrante
const T_HOME = 520; // la cuchilla vuelve a su lugar
const BLADE_R = 30;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

type Pt = { x: number; y: number };

export function PlotterLogo({ className, title = 'Martino Gráfica', autoPlay = true, onDone }: { className?: string; title?: string; autoPlay?: boolean; onDone?: () => void }) {
  const uid = useId().replace(/:/g, '');
  const mrRef = useRef<SVGPathElement>(null);
  const tRef = useRef<SVGPathElement>(null);
  const cutMrRef = useRef<SVGPathElement>(null);
  const cutTRef = useRef<SVGPathElement>(null);
  const wasteRef = useRef<SVGGElement>(null);
  const flapRef = useRef<SVGGElement>(null);
  const clipRef = useRef<SVGPolygonElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const sheetRef = useRef<SVGGElement>(null);
  const raf = useRef(0);
  const [running, setRunning] = useState(false);

  const setPeel = useCallback((s: number) => {
    // Línea de pliegue que avanza desde la esquina superior derecha hacia la inferior izquierda
    const TR = { x: SHEET.x + SHEET.w, y: SHEET.y };
    const len = Math.hypot(SHEET.w, SHEET.h);
    const d = { x: -SHEET.w / len, y: SHEET.h / len };
    const n = { x: d.y, y: -d.x };
    const P0 = { x: TR.x + d.x * s, y: TR.y + d.y * s };
    const L = 6000;
    const pts: Pt[] = [
      { x: P0.x + n.x * L, y: P0.y + n.y * L },
      { x: P0.x - n.x * L, y: P0.y - n.y * L },
      { x: P0.x - n.x * L + d.x * L, y: P0.y - n.y * L + d.y * L },
      { x: P0.x + n.x * L + d.x * L, y: P0.y + n.y * L + d.y * L },
    ];
    clipRef.current?.setAttribute('points', pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
    // Reflejo del sobrante sobre la línea de pliegue = la solapa despegada
    const a = 2 * n.x * n.x - 1;
    const b = 2 * n.x * n.y;
    const c = b;
    const dd = 2 * n.y * n.y - 1;
    const e = P0.x - (a * P0.x + c * P0.y);
    const f = P0.y - (b * P0.x + dd * P0.y);
    flapRef.current?.setAttribute('transform', `matrix(${a} ${b} ${c} ${dd} ${e} ${f})`);
  }, []);

  const showFinal = useCallback(() => {
    const total = Math.hypot(SHEET.w, SHEET.h) + 200;
    setPeel(total);
    if (wasteRef.current) wasteRef.current.style.opacity = '0';
    if (flapRef.current) flapRef.current.style.opacity = '0';
    for (const p of [cutMrRef.current, cutTRef.current]) if (p) p.style.opacity = '0';
    if (sheetRef.current) sheetRef.current.style.opacity = '1';
    const dot = dotRef.current;
    if (dot) {
      dot.setAttribute('cx', String(DOT.cx));
      dot.setAttribute('cy', String(DOT.cy));
      dot.setAttribute('r', String(DOT.r));
    }
  }, [setPeel]);

  const play = useCallback(() => {
    const mr = mrRef.current;
    const t = tRef.current;
    const cMr = cutMrRef.current;
    const cT = cutTRef.current;
    const dot = dotRef.current;
    if (!mr || !t || !cMr || !cT || !dot) return;
    cancelAnimationFrame(raf.current);
    setRunning(true);

    const lMr = mr.getTotalLength();
    const lT = t.getTotalLength();
    const lAll = lMr + lT;
    const startMr = mr.getPointAtLength(0);
    for (const [p, l] of [
      [cMr, lMr],
      [cT, lT],
    ] as const) {
      p.style.opacity = '1';
      p.style.strokeDasharray = `${l} ${l}`;
      p.style.strokeDashoffset = String(l);
    }
    if (wasteRef.current) wasteRef.current.style.opacity = '1';
    if (flapRef.current) flapRef.current.style.opacity = '1';
    setPeel(-10);

    const t0 = performance.now();
    const peelLen = Math.hypot(SHEET.w, SHEET.h) + 260;
    const frame = (now: number) => {
      const el = now - t0;
      // 1) entra la plancha y la cuchilla baja a su punto de partida
      const feed = clamp(el / T_FEED);
      if (sheetRef.current) sheetRef.current.style.opacity = String(easeOut(feed));
      if (el < T_FEED) {
        const k = ease(feed);
        dot.setAttribute('cx', String(DOT.cx + (startMr.x - DOT.cx) * k));
        dot.setAttribute('cy', String(DOT.cy + (startMr.y - DOT.cy) * k));
        dot.setAttribute('r', String(DOT.r + (BLADE_R - DOT.r) * k));
      }
      // 2) corte: la cuchilla recorre MR y después T
      const cut = clamp((el - T_FEED) / T_CUT);
      if (el >= T_FEED) {
        const dist = ease(cut) * lAll;
        const onMr = dist <= lMr;
        const p = onMr ? mr.getPointAtLength(dist) : t.getPointAtLength(dist - lMr);
        if (cut < 1) {
          dot.setAttribute('cx', String(p.x));
          dot.setAttribute('cy', String(p.y));
          dot.setAttribute('r', String(BLADE_R));
        }
        cMr.style.strokeDashoffset = String(lMr - Math.min(dist, lMr));
        cT.style.strokeDashoffset = String(lT - Math.max(0, dist - lMr));
      }
      // 3) despegado del sobrante
      const peelStart = T_FEED + T_CUT;
      const peel = clamp((el - peelStart) / T_PEEL);
      if (el >= peelStart) {
        setPeel(-10 + ease(peel) * peelLen);
        const fade = clamp((peel - 0.55) / 0.45);
        cMr.style.opacity = String(1 - fade);
        cT.style.opacity = String(1 - fade);
      }
      // 4) la cuchilla vuelve y es otra vez el punto del logo
      const homeStart = peelStart + T_PEEL * 0.55;
      const home = clamp((el - homeStart) / T_HOME);
      if (el >= homeStart) {
        const end = t.getPointAtLength(lT);
        const k = ease(home);
        dot.setAttribute('cx', String(end.x + (DOT.cx - end.x) * k));
        dot.setAttribute('cy', String(end.y + (DOT.cy - end.y) * k));
        dot.setAttribute('r', String(BLADE_R + (DOT.r - BLADE_R) * easeOut(home)));
      }
      if (el < peelStart + T_PEEL + 80 || home < 1) raf.current = requestAnimationFrame(frame);
      else {
        showFinal();
        setRunning(false);
        onDone?.();
      }
    };
    raf.current = requestAnimationFrame(frame);
  }, [onDone, setPeel, showFinal]);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!autoPlay || reduce) {
      showFinal();
      onDone?.();
      return;
    }
    // Arranca apenas se ve (si el logo está fuera de pantalla, espera)
    const el = sheetRef.current?.ownerSVGElement;
    if (!el) return;
    let started = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true;
          play();
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf.current);
    };
  }, [autoPlay, play, showFinal, onDone]);

  const wasteD = `M ${SHEET.x} ${SHEET.y} h ${SHEET.w} v ${SHEET.h} h ${-SHEET.w} Z ${PATH_MR} ${PATH_T}`;

  return (
    <svg viewBox={LOGO_VIEWBOX} className={cn('block h-auto w-full overflow-visible', className)} role="img" aria-label={title}>
      <title>{title}</title>
      <defs>
        <clipPath id={`unpeeled-${uid}`} clipPathUnits="userSpaceOnUse">
          <polygon ref={clipRef} points="-9999,-9999 9999,-9999 9999,9999 -9999,9999" />
        </clipPath>
        <linearGradient id={`back-${uid}`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4ffd0" />
          <stop offset="0.45" stopColor="#dff58a" />
          <stop offset="1" stopColor="#b7d63a" />
        </linearGradient>
        <filter id={`lift-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="-18" dy="26" stdDeviation="22" floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>

      <g ref={sheetRef}>
        {/* Las letras (lo que queda pegado) */}
        <g fill={LIME}>
          <path ref={mrRef} d={PATH_MR} />
          <path ref={tRef} d={PATH_T} />
        </g>
        {/* Sobrante de vinilo alrededor de las letras: se despega */}
        <g ref={wasteRef} style={{ opacity: 0 }} clipPath={`url(#unpeeled-${uid})`}>
          <path d={wasteD} fillRule="evenodd" fill={LIME} />
        </g>
        {/* Líneas de corte de la cuchilla */}
        <g fill="none" stroke="#000" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" style={{ mixBlendMode: 'multiply' }}>
          <path ref={cutMrRef} d={PATH_MR} style={{ opacity: 0 }} />
          <path ref={cutTRef} d={PATH_T} style={{ opacity: 0 }} />
        </g>
        {/* Solapa despegada (el dorso del vinilo) */}
        <g clipPath={`url(#unpeeled-${uid})`} style={{ pointerEvents: 'none' }}>
          <g ref={flapRef} style={{ opacity: 0 }} filter={`url(#lift-${uid})`}>
            <path d={wasteD} fillRule="evenodd" fill={`url(#back-${uid})`} />
          </g>
        </g>
      </g>

      {/* Punto / cuchilla */}
      <circle
        ref={dotRef}
        cx={DOT.cx}
        cy={DOT.cy}
        r={DOT.r}
        fill="#fff"
        className={cn('outline-none', !running && 'cursor-pointer')}
        role="button"
        tabIndex={0}
        aria-label="Volver a plotear el logo"
        onClick={() => !running && play()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !running) {
            e.preventDefault();
            play();
          }
        }}
      />
    </svg>
  );
}

/** Logo estático (header, footer, panel) */
export function LogoMark({ className, dot = '#fff', lime = LIME, title = 'Martino Gráfica' }: { className?: string; dot?: string; lime?: string; title?: string }) {
  return (
    <svg viewBox={LOGO_VIEWBOX} className={cn('block h-auto', className)} role="img" aria-label={title}>
      <path d={PATH_MR} fill={lime} />
      <path d={PATH_T} fill={lime} />
      <circle cx={DOT.cx} cy={DOT.cy} r={DOT.r} fill={dot} />
    </svg>
  );
}
