# Login System Changes - User ID Authentication

## Summary
Changed the login system to accept **User ID** (plain text) instead of email addresses, and integrated with SQL Server `RBI_USER` table.

---

## What Changed

### 1. Authentication Backend - [lib/auth.ts](lib/auth.ts)

**Changed from:**
- Field: `email` (email format required)
- Validation: Hardcoded admin@admin.com

**Changed to:**
- Field: `userid` (plain text, no @ symbol required)
- Validation: SQL Server database lookup in `RBI_USER` table
- Checks: User exists, user is enabled
- Password: Currently hardcoded as "admin" (needs to be updated for production)

**SQL Query:**
```sql
SELECT USER_ID, USER_NAME, USER_GROUP, ENABLED
FROM RBI_USER
WHERE USER_ID = @userid
```

---

### 2. Login Form - [components/auth/components-auth-login-form.tsx](components/auth/components-auth-login-form.tsx)

**Changed:**
- Variable: `email` → `userid`
- Input type: `type="email"` → `type="text"`
- Label: "Email" → "User ID"
- Placeholder: "Enter Email" → "Enter User ID"
- Icon: `IconMail` → `IconUser`
- Error message: "Invalid email or password" → "Invalid User ID or password"

---

### 3. Login Page - [app/(auth)/auth/boxed-signin/page.tsx](app/(auth)/auth/boxed-signin/page.tsx)

**Changed:**
- Description text: "Enter your email and password to login" → "Enter your User ID and password to login"

---

## How to Use

### Login with User ID (No @ Symbol Required)

**Example:**
```
User ID: admin
Password: admin
```

**What happens:**
1. User enters their User ID (e.g., "admin", "john", "user123")
2. System queries SQL Server: `SELECT * FROM RBI_USER WHERE USER_ID = 'admin'`
3. Checks if user exists and is enabled (`ENABLED = 1`)
4. Validates password (currently hardcoded as "admin")
5. Creates session with user data

---

## Database Structure

The system now uses the `RBI_USER` table with these columns:
- `USER_ID` - User identifier (used for login)
- `USER_NAME` - Display name
- `USER_GROUP` - User's group/role
- `ENABLED` - Whether user account is active (0 or 1)
- `FGSTYLEID` - Style ID

---

## Testing

**Valid Login:**
- Any user in `RBI_USER` table with `ENABLED = 1`
- Password: `admin` (hardcoded)

**Invalid Login:**
- User ID not in database → "Invalid User ID or password"
- User exists but `ENABLED = 0` → "Invalid User ID or password"
- Wrong password → "Invalid User ID or password"

---

## TODO: Password Security

**IMPORTANT:** The current implementation uses a hardcoded password "admin" for testing.

**For production, you need to:**

1. **Add password column to database** (if not exists):
   ```sql
   ALTER TABLE RBI_USER ADD PASSWORD_HASH VARCHAR(255);
   ```

2. **Hash passwords** using bcrypt:
   ```bash
   npm install bcrypt
   npm install --save-dev @types/bcrypt
   ```

3. **Update auth.ts** to verify hashed passwords:
   ```typescript
   import bcrypt from 'bcrypt';

   // In authorize function, replace this:
   if (credentials.password !== 'admin') {
       return null;
   }

   // With this:
   const isValidPassword = await bcrypt.compare(
       credentials.password,
       user.PASSWORD_HASH
   );

   if (!isValidPassword) {
       console.log('Invalid password');
       return null;
   }
   ```

4. **Create password hashing utility:**
   ```typescript
   // To hash a password:
   const hashedPassword = await bcrypt.hash('userPassword', 10);
   ```

---

## API Protection

All API routes are now protected with authentication checks:
- [app/api/test-db/route.ts](app/api/test-db/route.ts)
- [app/api/users/route.ts](app/api/users/route.ts)

They check for valid session before allowing database access.

---

## Files Modified

1. ✅ [lib/auth.ts](lib/auth.ts) - Authentication logic with SQL Server
2. ✅ [components/auth/components-auth-login-form.tsx](components/auth/components-auth-login-form.tsx) - Login form UI
3. ✅ [app/(auth)/auth/boxed-signin/page.tsx](app/(auth)/auth/boxed-signin/page.tsx) - Login page text
4. ✅ [app/api/users/route.ts](app/api/users/route.ts) - Added auth checks
5. ✅ [app/api/test-db/route.ts](app/api/test-db/route.ts) - Added auth checks

---

## Quick Reference

### Before:
```
Login: admin@admin.com (email format required)
Password: admin
```

### After:
```
Login: admin (any text, no @ required)
Password: admin
Validated against: PROMIA_UBL.RBI_USER table
```

---

## Next Steps

1. ✅ Login with User ID working
2. ⚠️ **TODO:** Implement proper password hashing
3. ⚠️ **TODO:** Add password column to RBI_USER table
4. ⚠️ **TODO:** Create user management APIs (change password, etc.)
5. ⚠️ **TODO:** Add role-based access control using USER_GROUP

---

**Last Updated:** December 11, 2024
