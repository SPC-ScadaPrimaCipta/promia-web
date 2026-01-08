import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

/**
 * Middleware to check if user is authenticated
 * Returns session if authenticated, or error response if not
 */
export async function requireAuth() {
    const session = await getServerSession();

    if (!session) {
        return {
            authenticated: false,
            response: NextResponse.json(
                {
                    success: false,
                    error: 'Unauthorized - Please login first',
                },
                { status: 401 }
            ),
        };
    }

    return {
        authenticated: true,
        session,
    };
}

/**
 * Middleware to check if user has admin role
 * Assumes your session has a user.role property
 */
export async function requireAdmin() {
    const session = await getServerSession();

    if (!session) {
        return {
            authenticated: false,
            response: NextResponse.json(
                {
                    success: false,
                    error: 'Unauthorized - Please login first',
                },
                { status: 401 }
            ),
        };
    }

    // Check if user is admin (adjust based on your session structure)
    const isAdmin = (session.user as any)?.email === 'admin@admin.com'; // Modify this logic

    if (!isAdmin) {
        return {
            authenticated: true,
            authorized: false,
            response: NextResponse.json(
                {
                    success: false,
                    error: 'Forbidden - Admin access required',
                },
                { status: 403 }
            ),
        };
    }

    return {
        authenticated: true,
        authorized: true,
        session,
    };
}
