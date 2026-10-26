import { NextResponse, type NextRequest } from 'next/server';

/** Chequeo rápido: sin cookie de sesión, el panel redirige al ingreso (la API valida el token de verdad) */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login') && !req.cookies.has('mg_session')) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = pathname === '/admin' ? '' : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };
