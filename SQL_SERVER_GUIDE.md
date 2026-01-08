# SQL Server Integration Guide

This guide explains how to query SQL Server database in your Next.js application.

## Setup

### 1. Connection Configuration

The database connection is configured in [lib/db.ts](lib/db.ts) using environment variables from `.env.local`:

```
DB_SERVER=10.147.19.12
DB_PORT=1433
DB_DATABASE=PROMIA_UBL
DB_USER=sa
DB_PASSWORD=Kembar12345
```

### 2. Connection String Breakdown

- **Server/IP**: `10.147.19.12` - Your SQL Server IP address
- **Port**: `1433` - Default SQL Server port
- **Database**: `PROMIA_UBL` - Your database name
- **User**: `sa` - SQL Server username
- **Password**: `Kembar12345` - SQL Server password

## Usage Examples

### Test Database Connection

**Endpoint**: `GET /api/test-db`

**Example**:
```bash
curl http://localhost:3000/api/test-db
```

**Response**:
```json
{
  "success": true,
  "message": "Connected to SQL Server",
  "data": [{"version": "Microsoft SQL Server ..."}]
}
```

---

## CRUD Operations

### 1. GET - Fetch All Users

**Endpoint**: `GET /api/users`

```bash
curl http://localhost:3000/api/users
```

**Response**:
```json
{
  "success": true,
  "data": [
    {"id": 1, "name": "John Doe", "email": "john@example.com"},
    {"id": 2, "name": "Jane Smith", "email": "jane@example.com"}
  ],
  "count": 2
}
```

### 2. GET - Search Users by Email

**Endpoint**: `GET /api/users?email=john%40example.com`

```bash
curl "http://localhost:3000/api/users?email=john@example.com"
```

### 3. POST - Create New User

**Endpoint**: `POST /api/users`

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"secret123"}'
```

**Response**:
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {"id": 3, "name": "John Doe", "email": "john@example.com"}
}
```

### 4. PUT - Update User

**Endpoint**: `PUT /api/users`

```bash
curl -X PUT http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"id":1,"name":"John Updated","email":"john.new@example.com"}'
```

### 5. DELETE - Delete User

**Endpoint**: `DELETE /api/users?id=1`

```bash
curl -X DELETE "http://localhost:3000/api/users?id=1"
```

---

## Advanced Query Examples

### JOIN Query

**Endpoint**: `GET /api/advanced-query?type=join`

Fetches users with their orders from the last month.

### Aggregate Functions

**Endpoint**: `GET /api/advanced-query?type=aggregate`

Returns statistics like total users, active users, and average age.

### Stored Procedure

**Endpoint**: `GET /api/advanced-query?type=stored-procedure`

Calls a stored procedure with parameters.

### Transaction

**Endpoint**: `GET /api/advanced-query?type=transaction`

Executes multiple queries in a transaction (commits or rolls back).

### Pagination

**Endpoint**: `GET /api/advanced-query?type=pagination&page=1&pageSize=10`

Returns paginated results.

```bash
curl "http://localhost:3000/api/advanced-query?type=pagination&page=1&pageSize=10"
```

**Response**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### Search

**Endpoint**: `GET /api/advanced-query?type=search&q=john`

Full-text search across name and email fields.

### Bulk Insert

**Endpoint**: `GET /api/advanced-query?type=bulk-insert`

Inserts multiple rows at once using Table-Valued Parameter.

---

## Query from Frontend

### Using Fetch API

```typescript
// GET request
async function getUsers() {
  const response = await fetch('/api/users');
  const data = await response.json();
  console.log(data);
}

// POST request
async function createUser(name: string, email: string, password: string) {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  const data = await response.json();
  return data;
}

// PUT request
async function updateUser(id: number, name: string, email: string) {
  const response = await fetch('/api/users', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name, email })
  });
  return await response.json();
}

// DELETE request
async function deleteUser(id: number) {
  const response = await fetch(`/api/users?id=${id}`, {
    method: 'DELETE'
  });
  return await response.json();
}
```

### Using in React Component

```tsx
'use client';
import { useEffect, useState } from 'react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch('/api/users');
        const data = await response.json();
        if (data.success) {
          setUsers(data.data);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map((user: any) => (
          <li key={user.id}>
            {user.name} - {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Security Best Practices

1. **Always use parameterized queries** to prevent SQL injection:
   ```typescript
   // ✅ GOOD
   await pool.request()
     .input('email', sql.VarChar, email)
     .query('SELECT * FROM Users WHERE email = @email');

   // ❌ BAD - Never do this!
   await pool.request()
     .query(`SELECT * FROM Users WHERE email = '${email}'`);
   ```

2. **Store credentials in environment variables**, never commit `.env.local` to git

3. **Use connection pooling** for better performance (already configured in `lib/db.ts`)

4. **Handle errors properly** with try-catch blocks

5. **Validate input** before querying the database

6. **Use transactions** for operations that need to be atomic

---

## SQL Data Types Reference

Common SQL Server data types when using `.input()`:

```typescript
sql.Int          // Integer
sql.BigInt       // Big integer
sql.VarChar      // Variable character
sql.NVarChar     // Unicode variable character
sql.Text         // Text
sql.Bit          // Boolean (0 or 1)
sql.DateTime     // Date and time
sql.Date         // Date only
sql.Decimal      // Decimal number
sql.Float        // Floating point
sql.Money        // Currency
sql.UniqueIdentifier // GUID/UUID
```

**Example**:
```typescript
await pool.request()
  .input('id', sql.Int, 123)
  .input('name', sql.VarChar, 'John')
  .input('price', sql.Decimal(10, 2), 99.99)
  .input('isActive', sql.Bit, true)
  .input('createdAt', sql.DateTime, new Date())
  .query('INSERT INTO Products ...');
```

---

## Troubleshooting

### Connection Issues

1. **Check firewall**: Ensure port 1433 is open
2. **SQL Server configuration**: Enable TCP/IP in SQL Server Configuration Manager
3. **Authentication**: Verify username and password
4. **Network**: Test connectivity with `telnet 10.147.19.12 1433`

### Common Errors

**"Login failed for user"**
- Check username and password in `.env.local`
- Verify SQL Server authentication mode (mixed mode)

**"Cannot open database"**
- Verify database name exists
- Check user permissions

**"Connection timeout"**
- Check server IP address
- Verify network connectivity
- Check SQL Server is running

---

## Next Steps

1. Install dependencies: `npm install`
2. Update `.env.local` with your actual database credentials
3. Restart your dev server: `npm run dev`
4. Test the connection: Visit `http://localhost:3000/api/test-db`
5. Create your own tables and API routes based on the examples

Happy querying! 🚀
