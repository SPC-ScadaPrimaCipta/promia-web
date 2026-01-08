import sql from 'mssql';

// SQL Server configuration
const config: sql.config = {
    server: process.env.DB_SERVER || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433'),
    database: process.env.DB_DATABASE || 'YourDatabase',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'YourPassword',
    options: {
        encrypt: true, // Use encryption
        trustServerCertificate: true, // For development/self-signed certificates
        enableArithAbort: true,
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
};

// Create a connection pool (singleton pattern)
let pool: sql.ConnectionPool | null = null;

export async function getConnection(): Promise<sql.ConnectionPool> {
    try {
        if (!pool) {
            pool = await sql.connect(config);
            console.log('Connected to SQL Server');
        }
        return pool;
    } catch (error) {
        console.error('Database connection error:', error);
        throw error;
    }
}

// Close the connection pool
export async function closeConnection(): Promise<void> {
    try {
        if (pool) {
            await pool.close();
            pool = null;
            console.log('SQL Server connection closed');
        }
    } catch (error) {
        console.error('Error closing connection:', error);
        throw error;
    }
}

// Export sql for data types
export { sql };
