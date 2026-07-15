import {
    ArrowRight,
    Building2,
    CheckCircle2,
    FlaskConical,
    HeartPulse,
    LucideIcon,
    Pill,
    Receipt,
    ScanLine,
} from "lucide-react";
import Reveal from "./Reveal";

const bullets = [
    {
        title: "Unified patient profiles",
        desc: "Access comprehensive histories across different networks through FHIR standards.",
    },
    {
        title: "Real-time lab connectivity",
        desc: "Instant result transmission with automatic integration into specialty-specific flows.",
    },
    {
        title: "E-prescribing built in",
        desc: "Route prescriptions to any pharmacy with formulary checks and interaction alerts.",
    },
];

interface Node {
    icon: LucideIcon;
    label: string;
    position: string;
    lineFrom: { x: number; y: number };
}

const nodes: Node[] = [
    { icon: FlaskConical, label: "Labs", position: "top-0 left-1/2 -translate-x-1/2", lineFrom: { x: 200, y: 52 } },
    { icon: Pill, label: "Pharmacy", position: "top-1/4 right-0", lineFrom: { x: 336, y: 122 } },
    { icon: Receipt, label: "Billing", position: "bottom-1/4 right-0", lineFrom: { x: 336, y: 278 } },
    { icon: ScanLine, label: "Imaging", position: "bottom-0 left-1/2 -translate-x-1/2", lineFrom: { x: 200, y: 348 } },
    { icon: Building2, label: "HIE", position: "top-1/4 left-0", lineFrom: { x: 64, y: 122 } },
];

function EcosystemDiagram() {
    return (
        <div className="relative mx-auto aspect-square w-full max-w-[440px]">
            {/* Connection lines */}
            <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" aria-hidden>
                {nodes.map((n) => (
                    <line
                        key={n.label}
                        x1="200"
                        y1="200"
                        x2={n.lineFrom.x}
                        y2={n.lineFrom.y}
                        stroke="#cbd5e1"
                        strokeWidth="1.5"
                        strokeDasharray="4 5"
                    />
                ))}
                <circle cx="200" cy="200" r="120" fill="none" stroke="#e2e8f0" strokeWidth="1" />
                <circle cx="200" cy="200" r="170" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2 6" />
            </svg>

            {/* Hub */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative">
                    <div className="absolute -inset-5 rounded-full bg-blue-500/15 blur-xl" aria-hidden />
                    <div className="relative flex flex-col items-center gap-1.5 rounded-2xl bg-blue-600 px-6 py-5 shadow-xl shadow-blue-600/30 ring-1 ring-blue-500">
                        <HeartPulse className="h-7 w-7 text-white" strokeWidth={2} />
                        <span className="text-sm font-bold text-white">CareVault</span>
                    </div>
                </div>
            </div>

            {/* Satellite nodes */}
            {nodes.map((n) => (
                <div key={n.label} className={`absolute ${n.position}`}>
                    <div className="flex items-center gap-2.5 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-900/10 shadow-lg shadow-slate-900/5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <n.icon className="h-4 w-4" strokeWidth={1.75} />
                        </span>
                        <span className="text-sm font-semibold text-slate-800">{n.label}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function InteroperabilitySection() {
    return (
        <section id="platform" className="bg-slate-50 border-y border-slate-200/70 scroll-mt-16">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-32">
                <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
                    <Reveal>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600 mb-4">
                            Interoperability
                        </p>
                        <h2 className="text-4xl lg:text-[2.75rem] font-bold tracking-tight text-slate-900 leading-tight">
                            Connected to your entire care ecosystem
                        </h2>
                        <p className="mt-5 text-lg text-slate-600 leading-relaxed">
                            CareVault bridges the gap between pharmacies, labs, imaging centers, and
                            other providers — instantly, and without the fax machine.
                        </p>

                        <ul className="mt-10 space-y-6">
                            {bullets.map((b) => (
                                <li key={b.title} className="flex gap-4">
                                    <CheckCircle2 className="mt-0.5 h-5.5 w-5.5 shrink-0 text-blue-600" strokeWidth={1.75} />
                                    <div>
                                        <h4 className="font-semibold text-slate-900">{b.title}</h4>
                                        <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{b.desc}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <a
                            href="#contact"
                            className="group mt-10 inline-flex items-center gap-2 text-[15px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            Learn more about integrations
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </a>
                    </Reveal>

                    <Reveal delay={0.12}>
                        <EcosystemDiagram />
                    </Reveal>
                </div>
            </div>
        </section>
    );
}
