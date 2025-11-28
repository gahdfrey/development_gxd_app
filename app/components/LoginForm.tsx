
// 'use client';

// import { useState, FormEvent } from 'react';
// import { useRouter } from 'next/navigation';

// export default function LoginForm() {
//     const [email, setEmail] = useState('');
//     const [password, setPassword] = useState('');
//     const [rememberMe, setRememberMe] = useState(false);
//     const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
//     const [isLoading, setIsLoading] = useState(false);
//     const [apiError, setApiError] = useState('');
//     const router = useRouter();

//     const validateForm = () => {
//         const newErrors: { email?: string; password?: string } = {};

//         if (!email) {
//             newErrors.email = 'Email is required';
//         } else if (!/\S+@\S+\.\S+/.test(email)) {
//             newErrors.email = 'Email is invalid';
//         }

//         if (!password) {
//             newErrors.password = 'Password is required';
//         } else if (password.length < 6) {
//             newErrors.password = 'Password must be at least 6 characters';
//         }

//         setErrors(newErrors);
//         return Object.keys(newErrors).length === 0;
//     };

//     const handleSubmit = async (e: FormEvent) => {
//         e.preventDefault();
//         setApiError('');

//         if (!validateForm()) {
//             return;
//         }

//         setIsLoading(true);

//         try {
//             const response = await fetch('/api/auth/login', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({ email, password }),
//             });

//             const data = await response.json();

//             if (!response.ok) {
//                 setApiError(data.error || 'Invalid email or password');
//             } else {
//                 // If "Remember me" is checked, extend cookie maxAge (handled server-side, but client can refresh)
//                 if (rememberMe) {
//                     // Optional: You could add a client-side persistent token here if needed, but server sets httpOnly cookie
//                 }
//                 router.push('/home');
//                 router.refresh();
//             }
//         } catch (error) {
//             console.error('Login error:', error); // Add this for debugging
//             setApiError('An error occurred. Please try again.');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <div className="rounded-3xl p-8 md:p-10 w-full max-w-md">
//             <div className="text-center mb-8">
//                 <h1 className="text-4xl font-bold bg-gradient-to-r from-[var(--gradient-primary-start)] to-[var(--gradient-primary-end)] bg-clip-text text-transparent mb-2">
//                     Welcome Back
//                 </h1>
//                 <p className="text-gray-600 dark:text-gray-300">Sign in to your account</p>
//             </div>

//             <form onSubmit={handleSubmit} className="space-y-6">
//                 {/* API Error Message */}
//                 {apiError && (
//                     <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
//                         <p className="text-sm text-red-600 dark:text-red-400">{apiError}</p>
//                     </div>
//                 )}

//                 {/* Email Field */}
//                 <div>
//                     <label htmlFor="email" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
//                         Email Address
//                     </label>
//                     <input
//                         type="email"
//                         id="email"
//                         value={email}
//                         onChange={(e) => setEmail(e.target.value)}
//                         className={`input-focus w-full px-4 py-3 rounded-xl border ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
//                             } bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm transition-all duration-300 hover:border-[var(--gradient-primary-start)] focus:bg-white dark:focus:bg-gray-800`}
//                         placeholder="you@example.com"
//                     />
//                     {errors.email && (
//                         <p className="mt-1 text-sm text-red-500">{errors.email}</p>
//                     )}
//                 </div>

//                 {/* Password Field */}
//                 <div>
//                     <label htmlFor="password" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
//                         Password
//                     </label>
//                     <input
//                         type="password"
//                         id="password"
//                         value={password}
//                         onChange={(e) => setPassword(e.target.value)}
//                         className={`input-focus w-full px-4 py-3 rounded-xl border ${errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
//                             } bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm transition-all duration-300 hover:border-[var(--gradient-primary-start)] focus:bg-white dark:focus:bg-gray-800`}
//                         placeholder="••••••••"
//                     />
//                     {errors.password && (
//                         <p className="mt-1 text-sm text-red-500">{errors.password}</p>
//                     )}
//                 </div>

//                 {/* Remember Me & Forgot Password - UPDATED STRUCTURE */}
//                 <div className="flex items-center justify-between">
//                     <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600 dark:text-gray-300 group">
//                         <input
//                             type="checkbox"
//                             id="rememberMe"
//                             checked={rememberMe}
//                             onChange={(e) => {
//                                 console.log('Remember me toggled:', e.target.checked); // Add for debugging
//                                 setRememberMe(e.target.checked);
//                             }}
//                             className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-[var(--gradient-primary-start)] focus:ring-2 focus:ring-[var(--gradient-primary-start)] focus:ring-offset-0 transition-all flex-shrink-0 accent-[var(--gradient-primary-start)] pointer-events-auto"
//                         />
//                         <span className="group-hover:text-[var(--gradient-primary-start)] transition-colors select-none">
//                             Remember me
//                         </span>
//                     </label>
//                     <a
//                         href="#"
//                         className="text-sm text-[var(--gradient-primary-start)] hover:text-[var(--gradient-primary-end)] transition-colors font-medium"
//                     >
//                         Forgot password?
//                     </a>
//                 </div>

//                 {/* Submit Button */}
//                 <button
//                     type="submit"
//                     disabled={isLoading}
//                     className="w-full py-3 px-4 bg-gradient-to-r from-[var(--gradient-primary-start)] to-[var(--gradient-primary-end)] text-black font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
//                     onClick={(e) => {
//                         console.log('Submit clicked'); // Add for debugging
//                         handleSubmit(e as any); // Fallback if onSubmit not firing
//                     }}
//                 >
//                     {isLoading ? 'Signing in...' : 'Sign In'}
//                 </button>

//                 {/* Sign Up Link */}
//                 <p className="text-center text-sm text-black dark:text-gray-300">
//                     Don't have an account?{' '}
//                     <a
//                         href="/signup"
//                         className="text-[var(--gradient-primary-start)] hover:text-[var(--gradient-primary-end)] font-semibold transition-colors"
//                     >
//                         Sign up
//                     </a>
//                 </p>
//             </form>
//         </div>
//     );
// }


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
            const body: { email: string; password: string; rememberMe?: boolean } = { email, password };
            if (rememberMe) {
                body.rememberMe = true; // Optional: Pass to server for extended session
            }

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok) {
                setApiError(data.error || 'Invalid email or password. Please try again.');
            } else {
                router.push('/home');
                router.refresh();
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
        // Clear field-specific error on change
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
                {/* Global Error Message */}
                {apiError && (
                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-700 dark:text-red-300">{apiError}</p>
                    </div>
                )}

                {/* Email Field */}
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

                {/* Password Field */}
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

                {/* Remember Me & Forgot Password */}
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

                {/* Submit Button */}
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

                {/* Footer Link */}
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
