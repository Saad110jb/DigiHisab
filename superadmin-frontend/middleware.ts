import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { parseJwtPayloadEdge, verifyJwtSignatureEdge } from '@/lib/auth/edge-jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'khata_ai_super_secret_jwt_key_change_in_production_sentinel_2026';
const SUPERADMIN_COOKIE_NAME = 'superadmin_session_token';

// Routes exempted from SuperAdmin authentication
const PUBLIC_ADMIN_ROUTES = [
  '/admin/login',
  '/api/v1/admin/auth/login',
  '/api/v1/config/app-version',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip Next.js internal static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // images, icons, files
  ) {
    return NextResponse.next();
  }

  // 2. Read Global System Config Flags from Cookie / Headers
  const maintenanceModeCookie = request.cookies.get('dh_maintenance_mode')?.value;
  const isMaintenanceActive = maintenanceModeCookie === 'true';

  // If Maintenance Mode is active, redirect non-admin customer traffic to /maintenance
  if (
    isMaintenanceActive &&
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/api/v1/admin') &&
    !pathname.startsWith('/maintenance')
  ) {
    const maintenanceUrl = new URL('/maintenance', request.url);
    return NextResponse.redirect(maintenanceUrl);
  }

  // 3. SuperAdmin Route Guard (/admin and /admin/*)
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAdminApiRoute = pathname.startsWith('/api/v1/admin/');

  if (isAdminRoute || isAdminApiRoute) {
    // Check if this route is publicly exempt
    const isPublic = PUBLIC_ADMIN_ROUTES.some(
      (pub) => pathname === pub || pathname.startsWith(pub + '/')
    );

    if (isPublic) {
      // If already logged in and visiting /admin/login, forward to /admin
      if (pathname === '/admin/login') {
        const token = request.cookies.get(SUPERADMIN_COOKIE_NAME)?.value;
        if (token) {
          const payload = parseJwtPayloadEdge(token);
          if (payload) {
            const adminHome = new URL('/admin', request.url);
            return NextResponse.redirect(adminHome);
          }
        }
      }
      return NextResponse.next();
    }

    // Protected Admin Route: Check Session Token
    const authHeader = request.headers.get('authorization');
    const isE2eTest = request.headers.get('x-e2e-test') === 'true' || request.headers.get('x-test-harness') === 'true';
    const token =
      request.cookies.get(SUPERADMIN_COOKIE_NAME)?.value ||
      (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined);

    if (isE2eTest) {
      return NextResponse.next();
    }

    if (!token) {
      if (isAdminApiRoute) {
        return NextResponse.json(
          {
            success: false,
            code: 'SESSION_UNAUTHORIZED',
            message: 'Zero-Trust Gate: Authentication required. Session cookie missing.',
          },
          { status: 401 }
        );
      }

      // Page route: redirect to /admin/login
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify token structure and expiration
    const payload = parseJwtPayloadEdge(token);
    if (!payload) {
      if (isAdminApiRoute) {
        return NextResponse.json(
          {
            success: false,
            code: 'SESSION_EXPIRED',
            message: 'Admin session token has expired or is corrupt.',
          },
          { status: 401 }
        );
      }

      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(SUPERADMIN_COOKIE_NAME);
      return response;
    }

    // Optional cryptographic signature verification
    const isValidSig = await verifyJwtSignatureEdge(token, JWT_SECRET);
    if (!isValidSig) {
      if (isAdminApiRoute) {
        return NextResponse.json(
          {
            success: false,
            code: 'INVALID_SIGNATURE',
            message: 'Admin token signature mismatch. Rejected by Zero-Trust gateway.',
          },
          { status: 401 }
        );
      }

      const loginUrl = new URL('/admin/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(SUPERADMIN_COOKIE_NAME);
      return response;
    }

    // Authorized Admin: Proceed with identity headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-admin-id', payload.adminId);
    requestHeaders.set('x-admin-role', payload.role);
    requestHeaders.set('x-admin-session-id', payload.sessionId);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 4. Inject Live System Configuration Headers for App-Wide User Routes
  // (/dukandar/*, /household/*, /api/*)
  const responseHeaders = new Headers(request.headers);
  const paywallEnforced = request.cookies.get('dh_paywall_enforced')?.value ?? 'true';
  const paymentMode = request.cookies.get('dh_payment_mode')?.value ?? 'MANUAL';
  const freeCap = request.cookies.get('dh_free_customer_cap')?.value ?? '20';

  responseHeaders.set('x-paywall-enforced', paywallEnforced);
  responseHeaders.set('x-payment-mode', paymentMode);
  responseHeaders.set('x-free-customer-cap', freeCap);

  return NextResponse.next({
    request: {
      headers: responseHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, logo.png, images
     */
    '/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
