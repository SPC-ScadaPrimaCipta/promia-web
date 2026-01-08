import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getConnection, sql } from '@/lib/db';

// GET: Fetch all users or search by email
export async function GET(request: NextRequest) {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const pool = await getConnection();
        const searchParams = request.nextUrl.searchParams;
        const email = searchParams.get('email');

        let result;

        if (email) {
            // Query with parameter (prevents SQL injection)
            result = await pool
                .request()
                .input('email', sql.VarChar, email)
                .query('SELECT USER_ID, USER_NAME, USER_GROUP, ENABLED, FGSTYLEID FROM RBI_USER WHERE user_id = @email');
        } else {
            // Query all users
            result = await pool.request().query('SELECT USER_ID, USER_NAME, USER_GROUP, ENABLED, FGSTYLEID FROM RBI_USER');
        }

        return NextResponse.json({
            success: true,
            data: result.recordset,
            count: result.recordset.length,
        });
    } catch (error: any) {
        console.error('Database query error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message,
            },
            { status: 500 }
        );
    }
}

// POST: Create a new user
export async function POST(request: NextRequest) {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, email, password } = body;

        // Validate input
        if (!name || !email || !password) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Name, email, and password are required',
                },
                { status: 400 }
            );
        }

        const pool = await getConnection();

        // Insert with parameters (prevents SQL injection)
        const result = await pool
            .request()
            .input('name', sql.VarChar, name)
            .input('email', sql.VarChar, email)
            .input('password', sql.VarChar, password)
            .query(`
                INSERT INTO Users (name, email, password)
                VALUES (@name, @email, @password);
                SELECT SCOPE_IDENTITY() AS id;
            `);

        const newUserId = result.recordset[0].id;

        return NextResponse.json(
            {
                success: true,
                message: 'User created successfully',
                data: { id: newUserId, name, email },
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Database insert error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message,
            },
            { status: 500 }
        );
    }
}

// PUT: Update a user
export async function PUT(request: NextRequest) {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { id, name, email } = body;

        // Validate input
        if (!id) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User ID is required',
                },
                { status: 400 }
            );
        }

        const pool = await getConnection();

        // Build dynamic update query
        let updateFields = [];
        const req = pool.request().input('id', sql.Int, id);

        if (name) {
            updateFields.push('name = @name');
            req.input('name', sql.VarChar, name);
        }
        if (email) {
            updateFields.push('email = @email');
            req.input('email', sql.VarChar, email);
        }

        if (updateFields.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'No fields to update',
                },
                { status: 400 }
            );
        }

        const query = `UPDATE Users SET ${updateFields.join(', ')} WHERE id = @id`;
        await req.query(query);

        return NextResponse.json({
            success: true,
            message: 'User updated successfully',
        });
    } catch (error: any) {
        console.error('Database update error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message,
            },
            { status: 500 }
        );
    }
}

// DELETE: Delete a user
export async function DELETE(request: NextRequest) {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User ID is required',
                },
                { status: 400 }
            );
        }

        const pool = await getConnection();

        await pool
            .request()
            .input('id', sql.Int, parseInt(id))
            .query('DELETE FROM Users WHERE id = @id');

        return NextResponse.json({
            success: true,
            message: 'User deleted successfully',
        });
    } catch (error: any) {
        console.error('Database delete error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message,
            },
            { status: 500 }
        );
    }
}
