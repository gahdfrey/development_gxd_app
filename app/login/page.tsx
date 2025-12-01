import LoginForm from '../components/LoginForm';
import type { Metadata } from 'next';
import { ToastProvider } from '@/app/contexts/ToastContext';

export const metadata: Metadata = {
    title: 'Sign In - GXD App',
    description: 'Sign in to your GXD account to access your dashboard and personalized features.',
};

export default function LoginPage() {
    return (
        <ToastProvider>
            {/* <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[var(--gradient-primary-start)] via-[var(--gradient-accent-start)] to-[var(--gradient-primary-end)] animate-gradient"> */}
            <main className="min-h-screen flex items-center justify-center p-4 ">

                {/* <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCAzLjk5OS00QzQyLjIwOSAzMCA0NCAzMS43OSA0NCAzNGMwIDIuMjEtMS43OTEgNC00LjAwMSA0QzM3Ljc5IDM4IDM2IDM2LjIxIDM2IDM0em0wLTMwYzAtMi4yMSAxLjc5LTQgMy45OTktNEM0Mi4yMDkgMCA0NCAxLjc5IDQ0IDRjMCAyLjIxLTEuNzkxIDQtNC4wMDEgNEMzNy43OSA4IDM2IDYuMjEgMzYgNHptLTMwIDBjMC0yLjIxIDEuNzktNCAzLjk5OS00QzEyLjIwOSAwIDE0IDEuNzkgMTQgNGMwIDIuMjEtMS43OTEgNC00LjAwMSA0QzcuNzkgOCA2IDYuMjEgNiA0em0tMy42IDMwYzAtMi4yMSAxLjc5LTQgMy45OTktNEMxMi4yMDkgMzAgMTQgMzEuNzkgMTQgMzRjMCAyLjIxLTEuNzkxIDQtNC4wMDEgNEM3Ljc5IDM4IDYgMzYuMjEgNiAzNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div> */}

                <LoginForm />
            </main>
        </ToastProvider>
    );
}
