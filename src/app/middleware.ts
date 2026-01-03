import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { initializeScheduler } from './lib/scheduler-init';

// Variable para controlar si el scheduler ya se inicializó
let schedulerInitialized = false;

export function middleware(request: NextRequest) {
  // Inicializar el scheduler solo una vez
  if (!schedulerInitialized) {
    initializeScheduler();
    schedulerInitialized = true;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};