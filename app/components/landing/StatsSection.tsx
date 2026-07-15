import Reveal from "./Reveal";

const stats = [
    { value: "5,000+", label: "Clinics served", note: "Across 4 continents" },
    { value: "10M+", label: "Patients managed", note: "Active records on platform" },
    { value: "99.99%", label: "System uptime", note: "Industry-leading SLA" },
    { value: "< 2 min", label: "Support response", note: "24/7 clinical support" },
];

export default function StatsSection() {
    return (
        <section id="impact" className="relative overflow-hidden bg-slate-950 scroll-mt-16">
            {/* Background accents */}
            <div
                className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.07)_1px,transparent_1px)] bg-[size:56px_56px]"
                aria-hidden
            />
            <div className="absolute -top-48 left-1/2 -translate-x-1/2 h-[420px] w-[820px] rounded-full bg-blue-600/20 blur-3xl" aria-hidden />

            <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-32">
                <Reveal className="max-w-2xl mx-auto text-center mb-16">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-400 mb-4">
                        Impact
                    </p>
                    <h2 className="text-4xl lg:text-[2.75rem] font-bold tracking-tight text-white leading-tight">
                        Care delivery, at scale
                    </h2>
                    <p className="mt-5 text-lg text-slate-400 leading-relaxed">
                        A modern EHR designed for reliability, speed, and world-class care —
                        trusted by health systems of every size.
                    </p>
                </Reveal>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl bg-white/10 ring-1 ring-white/10 overflow-hidden">
                    {stats.map((stat, idx) => (
                        <div key={stat.label} className="bg-slate-950/90 px-8 py-10 text-center">
                            <Reveal delay={idx * 0.08}>
                                <p className="text-4xl lg:text-5xl font-bold tracking-tight text-white">
                                    {stat.value}
                                </p>
                                <p className="mt-3 text-sm font-semibold text-blue-400">{stat.label}</p>
                                <p className="mt-1 text-[13px] text-slate-500">{stat.note}</p>
                            </Reveal>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
