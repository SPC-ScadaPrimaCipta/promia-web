import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getConnection, sql } from '@/lib/db';

export const authOptions: NextAuthOptions = {
    secret: process.env.NEXTAUTH_SECRET,
    trustHost: true,
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                userid: { label: 'User ID', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                console.log('=== Authorization Attempt ===');
                console.log('User ID:', credentials?.userid);
                console.log('Password provided:', credentials?.password ? 'Yes' : 'No');

                if (!credentials?.userid || !credentials?.password) {
                    console.log('❌ Missing credentials');
                    return null;
                }

                try {
                    console.log('🔄 Connecting to SQL Server...');
                    const pool = await getConnection();
                    console.log('✅ Connected to SQL Server');

                    // Query user from database (get all columns to find password field)
                    console.log('🔍 Querying user:', credentials.userid);
                    const result = await pool
                        .request()
                        .input('userid', sql.VarChar, credentials.userid)
                        .input('userpassword', sql.VarChar, credentials.password)
                        .query('SELECT user_id, user_name, pwdcompare(@userpassword, user_password, 0) password_true, user_group, enabled, fgStyleID FROM RBI_USER WHERE USER_ID = @userid');

                    console.log('Query result count:', result.recordset.length);

                    if (result.recordset.length === 0) {
                        console.log('❌ User not found in database');
                        return null;
                    }

                    const user = result.recordset[0];

                    // SQL Server returns lowercase column names
                    const userId = user.user_id || user.USER_ID;
                    const userName = user.user_name || user.USER_NAME;
                    const isEnabled = user.enabled || user.Enabled || user.ENABLED;
                    const userGroup = user.user_group || user.USER_GROUP;
                    const passwordMatch = user.password_true || user.PASSWORD_TRUE;

                    console.log('✅ User found:', {
                        user_id: userId,
                        user_name: userName,
                        enabled: isEnabled,
                        password_match: passwordMatch,
                        columns: Object.keys(user)
                    });

                    // Check if user is enabled
                    if (!isEnabled) {
                        console.log('❌ User is disabled');
                        return null;
                    }

                    // Verify password using SQL Server PWDCOMPARE
                    console.log('🔑 Checking password...');

                    if (!passwordMatch) {
                        console.log('❌ Invalid password - PWDCOMPARE returned false');
                        return null;
                    }

                    console.log('✅ Password verified successfully using PWDCOMPARE');

                    console.log('✅ Authentication successful!');
                    const userSession = {
                        id: userId,
                        name: userName,
                        email: userId, // Using user_id as email for session
                        group: userGroup,
                    };
                    console.log('Returning user session:', userSession);
                    return userSession;
                } catch (error) {
                    console.error('❌ Database authentication error:', error);
                    return null;
                }
            },
        }),
    ],
    pages: {
        signIn: '/auth/boxed-signin',
    },
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    debug: true,
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
            }
            return session;
        },
    },
};
