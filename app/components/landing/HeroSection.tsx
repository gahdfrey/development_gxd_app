"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
    ArrowRight,
    Bell,
    CalendarDays,
    CheckCircle2,
    FlaskConical,
    LayoutDashboard,
    Search,
    Settings,
    ShieldCheck,
    Users,
} from "lucide-react";

const trustedBy = ["Northline Health", "Beacon Medical", "St. Aurelia", "CarePoint", "Vantage Clinics"];

const patients = [
    { initials: "MR", name: "Maria Rodriguez", detail: "Annual physical · 9:30 AM", status: "Checked in", statusClass: "bg-emerald-50 text-emerald-700" },
    { initials: "JT", name: "James Thornton", detail: "Lab review · 10:15 AM", status: "Waiting", statusClass: "bg-amber-50 text-amber-700" },
    { initials: "AO", name: "Adaeze Okafor", detail: "Follow-up · 11:00 AM", status: "Scheduled", statusClass: "bg-slate-100 text-slate-600" },
];

function DashboardMockup() {
    return (
        <div className="relative w-full max-w-[620px]">
            {/* Glow */}
            <div className="absolute -inset-8 bg-gradient-to-tr from-blue-500/20 via-sky-400/10 to-indigo-500/20 rounded-[2.5rem] blur-3xl" aria-hidden />

            {/* Main window */}
            <div className="relative rounded-2xl bg-white ring-1 ring-slate-900/10 shadow-[0_24px_80px_-24px_rgba(15,23,42,0.35)] overflow-hidden">
                {/* Title bar */}
                <div className="flex items-center gap-3 h-11 px-4 bg-slate-50/80 border-b border-slate-200/80">
                    <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    </div>
                    <div className="flex-1 flex justify-center">
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-white border border-slate-200 rounded-md px-3 py-1">
                            <ShieldCheck className="h-3 w-3 text-emerald-500" />
                            app.carevault.health
                        </div>
                    </div>
                </div>

                <div className="flex">
                    {/* Sidebar */}
                    <div className="hidden sm:flex w-12 flex-col items-center gap-1.5 py-4 border-r border-slate-200/80 bg-slate-50/50">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                            <LayoutDashboard className="h-4 w-4" />
                        </span>
                        {[Users, CalendarDays, FlaskConical, Bell, Settings].map((Icon, i) => (
                            <span key={i} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400">
                                <Icon className="h-4 w-4" />
                            </span>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 sm:p-5 space-y-4">
                        {/* Header row */}
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[13px] font-semibold text-slate-900">Good morning, Dr. Jenkins</p>
                                <p className="text-[11px] text-slate-400">Tuesday · 14 appointments today</p>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                                <Search className="h-3 w-3" />
                                <span className="hidden sm:inline">Search patients…</span>
                            </div>
                        </div>

                        {/* Stat tiles */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: "Patients today", value: "14", delta: "+3" },
                                { label: "Pending labs", value: "6", delta: "2 new" },
                                { label: "Claims cleared", value: "98%", delta: "+1.2%" },
                            ].map((s) => (
                                <div key={s.label} className="rounded-xl border border-slate-200/80 bg-white p-3">
                                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{s.label}</p>
                                    <div className="mt-1 flex items-baseline gap-1.5">
                                        <span className="text-lg font-bold text-slate-900">{s.value}</span>
                                        <span className="text-[10px] font-semibold text-emerald-600">{s.delta}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Chart */}
                        <div className="rounded-xl border border-slate-200/80 p-3">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[11px] font-semibold text-slate-700">Patient volume</p>
                                <p className="text-[10px] text-slate-400">Last 30 days</p>
                            </div>
                            <svg viewBox="0 0 320 80" className="w-full h-16" preserveAspectRatio="none" aria-hidden>
                                <defs>
                                    <linearGradient id="heroChart" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <path
                                    d="M0,60 C30,55 45,40 70,42 C95,44 110,58 140,50 C170,42 185,22 215,26 C245,30 260,44 290,32 L320,24 L320,80 L0,80 Z"
                                    fill="url(#heroChart)"
                                />
                                <path
                                    d="M0,60 C30,55 45,40 70,42 C95,44 110,58 140,50 C170,42 185,22 215,26 C245,30 260,44 290,32 L320,24"
                                    fill="none"
                                    stroke="#2563eb"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>

                        {/* Patient rows */}
                        <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100">
                            {patients.map((p) => (
                                <div key={p.name} className="flex items-center gap-3 px-3 py-2.5">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-700">
                                        {p.initials}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[12px] font-semibold text-slate-800">{p.name}</p>
                                        <p className="truncate text-[10px] text-slate-400">{p.detail}</p>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.statusClass}`}>
                                        {p.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating card: sync toast */}
            <div className="absolute -left-4 sm:-left-10 bottom-14 rounded-xl bg-white ring-1 ring-slate-900/10 shadow-xl px-4 py-3 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </span>
                <div>
                    <p className="text-[12px] font-semibold text-slate-900">Lab sync complete</p>
                    <p className="text-[10px] text-slate-400">142 records updated just now</p>
                </div>
            </div>

            {/* Floating card: uptime */}
            <div className="absolute -right-2 sm:-right-6 -top-5 rounded-xl bg-white ring-1 ring-slate-900/10 shadow-xl px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Uptime</p>
                <p className="text-base font-bold text-slate-900">
                    99.99% <span className="text-[10px] font-semibold text-emerald-600 align-middle">SLA</span>
                </p>
            </div>
        </div>
    );
}

export default function HeroSection() {
    const shouldReduceMotion = useReducedMotion();
    const fadeUp = (delay: number) => ({
        initial: shouldReduceMotion ? false : { opacity: 0, y: 24 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] as const },
    });

    return (
        <section className="relative overflow-hidden pt-32 pb-16 lg:pt-40 lg:pb-24">
            {/* Background: grid + radial wash */}
            <div
                className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(226,232,240,0.6)_1px,transparent_1px),linear-gradient(to_bottom,rgba(226,232,240,0.6)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_60%,transparent_100%)]"
                aria-hidden
            />
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 -z-10 h-[480px] w-[880px] rounded-full bg-gradient-to-b from-blue-100/80 via-sky-50/60 to-transparent blur-3xl" aria-hidden />

            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-16 lg:gap-12 items-center">
                    {/* Copy */}
                    <div className="max-w-xl">
                        <motion.div {...fadeUp(0)}>
                            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/80 px-3.5 py-1.5 text-xs font-semibold text-blue-700">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                HIPAA compliant · SOC 2 Type II certified
                            </span>
                        </motion.div>

                        <motion.h1
                            {...fadeUp(0.08)}
                            className="mt-6 text-[2.75rem] leading-[1.05] sm:text-6xl lg:text-[4.25rem] font-bold tracking-tight text-slate-900"
                        >
                            The EHR built for the way{" "}
                            <span className="text-blue-600">clinicians think</span>
                        </motion.h1>

                        <motion.p {...fadeUp(0.16)} className="mt-6 text-lg leading-relaxed text-slate-600">
                            CareVault unifies charts, labs, scheduling, and billing into one fast,
                            intuitive workspace — so your team spends less time on screens and more
                            time with patients.
                        </motion.p>

                        <motion.div {...fadeUp(0.24)} className="mt-9 flex flex-wrap items-center gap-3.5">
                            <button
                                type="button"
                                disabled
                                aria-disabled="true"
                                title="Access is by invitation only"
                                className="inline-flex items-center gap-2 rounded-xl bg-blue-600/50 px-6 py-3.5 text-[15px] font-semibold text-white/90 shadow-lg shadow-blue-600/15 cursor-not-allowed select-none"
                            >
                                Start free trial
                                <ArrowRight className="h-4 w-4" />
                            </button>
                            <a
                                href="#contact"
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-[15px] font-semibold text-slate-800 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                            >
                                Request a demo
                            </a>
                        </motion.div>

                        <motion.div {...fadeUp(0.32)} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
                            {["Free 30-day trial", "No credit card required", "Guided migration"].map((item) => (
                                <span key={item} className="inline-flex items-center gap-1.5">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    {item}
                                </span>
                            ))}
                        </motion.div>
                    </div>

                    {/* Product mockup */}
                    <motion.div
                        initial={shouldReduceMotion ? false : { opacity: 0, y: 32, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
                        className="relative flex justify-center lg:justify-end"
                    >
                        <DashboardMockup />
                    </motion.div>
                </div>

                {/* Trust strip */}
                <motion.div {...fadeUp(0.4)} className="mt-20 lg:mt-24 border-t border-slate-200/80 pt-8">
                    <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-6">
                        Trusted by leading care teams
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
                        {trustedBy.map((name) => (
                            <span key={name} className="text-[15px] font-semibold tracking-tight text-slate-400/90">
                                {name}
                            </span>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
