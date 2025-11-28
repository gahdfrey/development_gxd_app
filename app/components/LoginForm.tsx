'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomLoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState('');
    const router = useRouter();

    const validateForm = () => {
        const newErrors: { email?: string; password?: string } = {};

        if (!email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!password) {
            newErrors.password = 'Password is required';
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setApiError('');

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            const body = { email, password, ...(rememberMe && { rememberMe: true }) };


            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body),
            });


            const data = await response.json();

            if (!response.ok) {
                setApiError(data.error || 'Invalid email or password. Please try again.');
            } else {
                router.push('/dashboard');
            }
        } catch (error) {
            console.error('Login error:', error);
            setApiError('Network error. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: 'email' | 'password') => (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (field === 'email') {
            setEmail(value);
        } else {
            setPassword(value);
        }

        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    return (
        <div className="max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 md:p-8 border border-gray-200 dark:border-gray-700">
            <div className="text-center mb-6">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1">
                    Welcome Back
                </h1>
                <p className="text-gray-500 dark:text-gray-400">Sign in to your EMS account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

                {apiError && (
                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-700 dark:text-red-300">{apiError}</p>
                    </div>
                )}

                <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Email Address *
                    </label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={handleInputChange('email')}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300 dark:border-gray-600'
                            } dark:bg-gray-800`}
                        placeholder="e.g., alex@company.com"
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                </div>

                <div>
                    <label htmlFor="password" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Password *
                    </label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={handleInputChange('password')}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.password ? 'border-red-500 bg-red-50' : 'border-gray-300 dark:border-gray-600'
                            } dark:bg-gray-800`}
                        placeholder="At least 6 characters"
                    />
                    {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
                </div>

                <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-gray-400 select-none">
                        <input
                            type="checkbox"
                            id="rememberMe"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700"
                        />
                        <span>Remember me</span>
                    </label>
                    <a
                        href="#"
                        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
                    >
                        Forgot password?
                    </a>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Signing In...
                        </span>
                    ) : (
                        'Sign In'
                    )}
                </button>

                <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                    Don't have an account?{' '}
                    <a href="/signup" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors">
                        Sign up here
                    </a>
                </p>
            </form>
        </div>
    );
}


