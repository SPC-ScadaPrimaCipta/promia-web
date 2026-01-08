import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const pool = await getConnection();
        const searchParams = request.nextUrl.searchParams;
        const queryType = searchParams.get('type');

        let result;

        switch (queryType) {
            case 'join':
                // Example: JOIN query
                result = await pool.request().query(`
                    SELECT u.id, u.name, u.email, o.order_date, o.total
                    FROM Users u
                    LEFT JOIN Orders o ON u.id = o.user_id
                    WHERE o.order_date >= DATEADD(month, -1, GETDATE())
                `);
                break;

            case 'aggregate':
                // Example: Aggregate functions
                result = await pool.request().query(`
                    SELECT
                        COUNT(*) as total_users,
                        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
                        AVG(age) as average_age
                    FROM Users
                `);
                break;

            case 'stored-procedure':
                // Example: Call stored procedure with parameters
                result = await pool
                    .request()
                    .input('userId', sql.Int, 1)
                    .input('startDate', sql.Date, new Date('2024-01-01'))
                    .execute('sp_GetUserOrders');
                break;

            case 'transaction':
                // Example: Transaction (multiple queries)
                const transaction = pool.transaction();
                await transaction.begin();

                try {
                    // First query
                    await transaction
                        .request()
                        .input('name', sql.VarChar, 'Test User')
                        .input('email', sql.VarChar, 'test@example.com')
                        .query('INSERT INTO Users (name, email) VALUES (@name, @email)');

                    // Second query
                    await transaction
                        .request()
                        .input('description', sql.VarChar, 'Transaction completed')
                        .query('INSERT INTO Logs (description) VALUES (@description)');

                    // Commit transaction
                    await transaction.commit();

                    return NextResponse.json({
                        success: true,
                        message: 'Transaction completed successfully',
                    });
                } catch (error) {
                    // Rollback on error
                    await transaction.rollback();
                    throw error;
                }

            case 'pagination':
                // Example: Pagination with OFFSET/FETCH
                const page = parseInt(searchParams.get('page') || '1');
                const pageSize = parseInt(searchParams.get('pageSize') || '10');
                const offset = (page - 1) * pageSize;

                result = await pool
                    .request()
                    .input('offset', sql.Int, offset)
                    .input('pageSize', sql.Int, pageSize)
                    .query(`
                        SELECT * FROM Users
                        ORDER BY id
                        OFFSET @offset ROWS
                        FETCH NEXT @pageSize ROWS ONLY
                    `);

                // Get total count
                const countResult = await pool.request().query('SELECT COUNT(*) as total FROM Users');

                return NextResponse.json({
                    success: true,
                    data: result.recordset,
                    pagination: {
                        page,
                        pageSize,
                        total: countResult.recordset[0].total,
                        totalPages: Math.ceil(countResult.recordset[0].total / pageSize),
                    },
                });

            case 'search':
                // Example: Full-text search
                const searchTerm = searchParams.get('q') || '';
                result = await pool
                    .request()
                    .input('searchTerm', sql.VarChar, `%${searchTerm}%`)
                    .query(`
                        SELECT * FROM Users
                        WHERE name LIKE @searchTerm
                           OR email LIKE @searchTerm
                        ORDER BY name
                    `);
                break;

            case 'bulk-insert':
                // Example: Bulk insert using Table-Valued Parameter
                const table = new sql.Table('Users');
                table.columns.add('name', sql.VarChar(100));
                table.columns.add('email', sql.VarChar(100));

                // Add rows
                table.rows.add('User 1', 'user1@example.com');
                table.rows.add('User 2', 'user2@example.com');
                table.rows.add('User 3', 'user3@example.com');

                result = await pool.request().bulk(table);

                return NextResponse.json({
                    success: true,
                    message: 'Bulk insert completed',
                    rowsAffected: result.rowsAffected,
                });

            default:
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Invalid query type. Available: join, aggregate, stored-procedure, transaction, pagination, search, bulk-insert',
                    },
                    { status: 400 }
                );
        }

        return NextResponse.json({
            success: true,
            data: result.recordset,
        });
    } catch (error: any) {
        console.error('Advanced query error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message,
            },
            { status: 500 }
        );
    }
}
