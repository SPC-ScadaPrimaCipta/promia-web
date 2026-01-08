import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
    // Skip middleware for API routes
    if (request.nextUrl.pathname.startsWith('/api')) {
        return NextResponse.next();
    }

    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
    });

    const isAuthPage = request.nextUrl.pathname.startsWith('/auth');

    if (!token && !isAuthPage) {
        // Redirect to login if not authenticated and trying to access protected page
        return NextResponse.redirect(new URL('/auth/boxed-signin', request.url));
    }

    if (token && isAuthPage) {
        // Redirect to home if authenticated and trying to access auth page
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|assets).*)'],
};
