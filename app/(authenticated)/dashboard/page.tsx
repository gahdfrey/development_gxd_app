import { getSession, logout } from '@/lib/session';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Dashboard - EMS',
    description: 'Your Employee Management System dashboard',
};

async function SignOutButton() {
    return (
        <form
            action={async () => {
                'use server';
                await logout();
            }}
        >
            <button
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-[var(--gradient-secondary-start)] to-[var(--gradient-secondary-end)] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
                Sign Out
            </button>
        </form>
    );
}

export default async function DashboardPage() {
    const user = await getSession();

    if (!user) {
        redirect('/login');
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-[var(--gradient-accent-start)] via-[var(--gradient-primary-start)] to-[var(--gradient-accent-end)] animate-gradient p-8">
            <div className="max-w-4xl mx-auto">
                <div className="glass rounded-3xl p-8 md:p-12 animate-fade-in">

                    {/* Header */}
                    <div>
                        {/* SideMenu is now in layout */}
                    </div>
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-[var(--gradient-primary-start)] to-[var(--gradient-primary-end)] bg-clip-text text-transparent mb-2">
                                EMS Dashboard
                            </h1>
                            <p className="text-gray-600 dark:text-gray-300">
                                Manage your employees and streamline HR processes
                            </p>
                        </div>
                        <SignOutButton />
                    </div>

                    {/* User Info Card */}
                    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                            Your Profile
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="font-medium text-gray-700 dark:text-gray-200 w-24">
                                    Username:
                                </span>
                                <span className="text-gray-900 dark:text-gray-100 font-semibold">
                                    {user.username || 'N/A'}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-medium text-gray-700 dark:text-gray-200 w-24">
                                    Email:
                                </span>
                                <span className="text-gray-900 dark:text-gray-100">
                                    {user.email}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-medium text-gray-700 dark:text-gray-200 w-24">
                                    User ID:
                                </span>
                                <span className="text-gray-600 dark:text-gray-400 text-sm font-mono">
                                    {user.id || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* EMS Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
                            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">
                                👥 Employee Management
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                View, add, and update employee records with secure access.
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-pink-50 to-red-50 dark:from-pink-900/20 dark:to-red-900/20 rounded-2xl p-6 border border-pink-200 dark:border-pink-800">
                            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">
                                📊 Attendance Tracking
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Monitor attendance and generate reports for your team.
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-800">
                            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">
                                💼 Payroll Processing
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Handle salaries, deductions, and compliance effortlessly.
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl p-6 border border-yellow-200 dark:border-yellow-800">
                            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">
                                📈 Performance Analytics
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Track KPIs and insights to boost team productivity.
                            </p>
                        </div>
                    </div>

                    {/* Quick Actions for EMS */}
                    <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
                        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">
                            🚀 Quick Actions
                        </h3>
                        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            <li>• <a href="/employees" className="text-blue-600 hover:underline">View Employees</a></li>
                            <li>• <a href="/attendance" className="text-blue-600 hover:underline">Track Attendance</a></li>
                            <li>• <a href="/payroll" className="text-blue-600 hover:underline">Process Payroll</a></li>
                            <li>• <a href="/reports" className="text-blue-600 hover:underline">Generate Reports</a></li>
                            <li>• Customize roles and permissions</li>
                        </ul>
                    </div>
                </div>
            </div>
        </main>
    );
}
