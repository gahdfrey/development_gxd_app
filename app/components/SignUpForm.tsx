'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomSignUpForm() {
    const [formData, setFormData] = useState({
        firstname: '',
        lastname: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [errors, setErrors] = useState<{
        firstname?: string;
        lastname?: string;
        username?: string;
        email?: string;
        password?: string;
        confirmPassword?: string;
    }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const router = useRouter();

    const validateForm = () => {
        const newErrors: {
            firstname?: string;
            lastname?: string;
            username?: string;
            email?: string;
            password?: string;
            confirmPassword?: string;
        } = {};

        if (!formData.firstname.trim()) {
            newErrors.firstname = 'First name is required';
        } else if (formData.firstname.length < 2) {
            newErrors.firstname = 'First name must be at least 2 characters';
        }

        if (!formData.lastname.trim()) {
            newErrors.lastname = 'Last name is required';
        } else if (formData.lastname.length < 2) {
            newErrors.lastname = 'Last name must be at least 2 characters';
        }

        if (!formData.username.trim()) {
            newErrors.username = 'Username is required';
        } else if (formData.username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters long';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
            newErrors.password = 'Password needs at least one uppercase letter, one lowercase letter, and one number';
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match. Try again.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setApiError('');
        setSuccessMessage('');

        if (!validateForm()) {
            return;
        }

        if (!termsAccepted) {
            setApiError('You must accept the Terms and Conditions to proceed');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.errors) {
                    setErrors(data.errors);
                } else {
                    setApiError(data.error || 'Registration failed. Please try again.');
                }
            } else {
                setSuccessMessage('Welcome aboard! Redirecting you to the login page...');
                setTimeout(() => {
                    router.push('/login');
                }, 1500);
            }
        } catch (error) {
            console.error('Signup error:', error);
            setApiError('Network error. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
        // Clear field-specific error on change
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    return (
        <div className="max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 md:p-8 border border-gray-200 dark:border-gray-700">
            <div className="text-center mb-6">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1">
                    Get Started
                </h1>
                <p className="text-gray-500 dark:text-gray-400">Create your EMS account in moments</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Global Messages */}
                {apiError && (
                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-700 dark:text-red-300">{apiError}</p>
                    </div>
                )}
                {successMessage && (
                    <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">{successMessage}</p>
                    </div>
                )}

                {/* Personal Info Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                    <div>
                        <label htmlFor="firstname" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            First Name *
                        </label>
                        <input
                            type="text"
                            id="firstname"
                            value={formData.firstname}
                            onChange={handleInputChange('firstname')}
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.firstname ? 'border-red-500 bg-red-50' : 'border-gray-300 dark:border-gray-600'
                                } dark:bg-gray-800`}
                            placeholder="e.g., Alex"
                        />
                        {errors.firstname && <p className="mt-1 text-xs text-red-500">{errors.firstname}</p>}
                    </div>

                    <div>
                        <label htmlFor="lastname" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Last Name *
                        </label>
                        <input
                            type="text"
                            id="lastname"
                            value={formData.lastname}
                            onChange={handleInputChange('lastname')}
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.lastname ? 'border-red-500 bg-red-50' : 'border-gray-300 dark:border-gray-600'
                                } dark:bg-gray-800`}
                            placeholder="e.g., Rivera"
                        />
                        {errors.lastname && <p className="mt-1 text-xs text-red-500">{errors.lastname}</p>}
                    </div>
                </div>

                {/* Username Field */}
                <div>
                    <label htmlFor="username" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Username *
                    </label>
                    <input
                        type="text"
                        id="username"
                        value={formData.username}
                        onChange={handleInputChange('username')}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.username ? 'border-red-500 bg-red-50' : 'border-gray-300 dark:border-gray-600'
                            } dark:bg-gray-800`}
                        placeholder="e.g., alexriv"
                    />
                    {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username}</p>}
                </div>

                {/* Email Field */}
                <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Email Address *
                    </label>
                    <input
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={handleInputChange('email')}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300 dark:border-gray-600'
                            } dark:bg-gray-800`}
                        placeholder="e.g., alex@company.com"
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                </div>

                {/* Password Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="password" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Password *
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={formData.password}
                            onChange={handleInputChange('password')}
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.password ? 'border-red-500 bg-red-50' : 'border-gray-300 dark:border-gray-600'
                                } dark:bg-gray-800`}
                            placeholder="At least 8 characters"
                        />
                        {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Confirm Password *
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleInputChange('confirmPassword')}
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${errors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-300 dark:border-gray-600'
                                } dark:bg-gray-800`}
                            placeholder="Match password above"
                        />
                        {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
                    </div>
                </div>

                {/* Terms Checkbox */}
                <div className="flex items-center pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-gray-400 select-none">
                        <input
                            type="checkbox"
                            checked={termsAccepted}
                            onChange={(e) => setTermsAccepted(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700"
                        />
                        <span>
                            I accept the{' '}
                            <a href="#" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors">
                                Terms of Service
                            </a>{' '}
                            and{' '}
                            <a href="#" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors">
                                Privacy Policy
                            </a>
                        </span>
                    </label>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isLoading || !!successMessage}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating Account...
                        </span>
                    ) : successMessage ? (
                        'Account Ready!'
                    ) : (
                        'Sign Up for Free'
                    )}
                </button>

                {/* Footer Link */}
                <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                    Already registered?{' '}
                    <a href="/login" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors">
                        Log in here
                    </a>
                </p>
            </form>
        </div>
    );
}