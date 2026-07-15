"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HeartPulse, Menu, X } from "lucide-react";

const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Platform", href: "#platform" },
    { label: "Impact", href: "#impact" },
    { label: "Support", href: "#support" },
    { label: "Contact", href: "#contact" },
];

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <header
            className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
                scrolled
                    ? "bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_1px_20px_-8px_rgba(15,23,42,0.12)]"
                    : "bg-transparent border-b border-transparent"
            }`}
        >
            <div className="max-w-7xl mx-auto px-6 lg:px-8 flex h-16 items-center justify-between">
                <Link href="/" className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-600/25">
                        <HeartPulse className="h-[18px] w-[18px]" strokeWidth={2.25} />
                    </span>
                    <span className="text-[17px] font-bold tracking-tight text-slate-900">
                        Care<span className="text-blue-600">Vault</span>
                    </span>
                </Link>

                <nav className="hidden md:flex items-center gap-1">
                    {navLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg transition-colors"
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>

                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        title="Access is by invitation only"
                        className="hidden sm:inline-flex text-sm font-semibold px-4 py-2 text-slate-400 rounded-lg cursor-not-allowed select-none"
                    >
                        Log in
                    </button>
                    <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        title="Access is by invitation only"
                        className="inline-flex items-center bg-slate-900/40 text-white/80 text-sm font-semibold px-4 py-2 rounded-lg shadow-sm cursor-not-allowed select-none"
                    >
                        Get started
                    </button>
                    <button
                        type="button"
                        aria-label={mobileOpen ? "Close menu" : "Open menu"}
                        onClick={() => setMobileOpen((v) => !v)}
                        className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {mobileOpen && (
                <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-slate-200 px-6 pb-4 pt-2">
                    <nav className="flex flex-col gap-1">
                        {navLinks.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileOpen(false)}
                                className="px-3 py-2.5 text-[15px] font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                {link.label}
                            </a>
                        ))}
                        <button
                            type="button"
                            disabled
                            aria-disabled="true"
                            title="Access is by invitation only"
                            className="sm:hidden text-left px-3 py-2.5 text-[15px] font-medium text-slate-400 rounded-lg cursor-not-allowed select-none"
                        >
                            Log in
                        </button>
                    </nav>
                </div>
            )}
        </header>
    );
}
