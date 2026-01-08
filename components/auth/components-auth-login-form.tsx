'use client';
import IconLockDots from '@/components/icon/icon-lock-dots';
import IconUser from '@/components/icon/icon-user';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { signIn } from 'next-auth/react';

const ComponentsAuthLoginForm = () => {
    const router = useRouter();
    const [userid, setUserid] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const submitForm = async (e: any) => {
        e.preventDefault();
        setError('');

        try {
            const result = await signIn('credentials', {
                userid,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError('Invalid User ID or password');
            } else if (result?.ok) {
                router.push('/');
            }
        } catch (error) {
            setError('An error occurred. Please try again.');
        }
    };

    return (
        <form className="space-y-5 dark:text-white" onSubmit={submitForm}>
            {error && (
                <div className="relative flex items-center rounded border border-danger bg-danger-light p-3.5 text-danger dark:bg-danger-dark-light">
                    <span className="ltr:pr-2 rtl:pl-2">
                        <strong className="ltr:mr-1 rtl:ml-1">Error!</strong>
                        {error}
                    </span>
                </div>
            )}
            <div>
                <label htmlFor="Userid">User ID</label>
                <div className="relative text-white-dark">
                    <input
                        id="Userid"
                        type="text"
                        placeholder="Enter User ID"
                        className="form-input ps-10 placeholder:text-white-dark"
                        value={userid}
                        onChange={(e) => setUserid(e.target.value)}
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconUser className="h-5 w-5" />
                    </span>
                </div>
            </div>
            <div>
                <label htmlFor="Password">Password</label>
                <div className="relative text-white-dark">
                    <input
                        id="Password"
                        type="password"
                        placeholder="Enter Password"
                        className="form-input ps-10 placeholder:text-white-dark"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconLockDots fill={true} />
                    </span>
                </div>
            </div>
            <div>
                <label className="flex cursor-pointer items-center">
                    <input type="checkbox" className="form-checkbox bg-white dark:bg-black" />
                    <span className="text-white-dark">Subscribe to weekly newsletter</span>
                </label>
            </div>
            <button type="submit" className="btn btn-gradient !mt-6 w-full border-0 uppercase shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]">
                Sign in
            </button>
        </form>
    );
};

export default ComponentsAuthLoginForm;
