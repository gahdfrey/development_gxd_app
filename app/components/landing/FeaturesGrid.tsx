import {
    Activity,
    FileCheck2,
    FlaskConical,
    LucideIcon,
    Network,
    ShieldCheck,
    Sparkles,
} from "lucide-react";
import Reveal from "./Reveal";

interface Feature {
    icon: LucideIcon;
    title: string;
    desc: string;
}

const features: Feature[] = [
    {
        icon: Network,
        title: "Interoperability",
        desc: "Connect with any health system through FHIR and HL7 standards for seamless, real-time data exchange.",
    },
    {
        icon: Sparkles,
        title: "Smart Analytics",
        desc: "Turn raw clinical data into actionable insight with AI-powered dashboards and population health views.",
    },
    {
        icon: FileCheck2,
        title: "Automated Billing",
        desc: "A smart claims engine catches coding errors before submission — maximizing reimbursement and minimizing denials.",
    },
    {
        icon: FlaskConical,
        title: "Lab Results Sync",
        desc: "Real-time laboratory integrations with automatic flagging of abnormal values and longitudinal trend analysis.",
    },
    {
        icon: ShieldCheck,
        title: "Enterprise Security",
        desc: "AES-256 encryption at rest, TLS 1.3 in transit, and granular role-based access across every record.",
    },
    {
        icon: Activity,
        title: "Clinical Workflows",
        desc: "Specialty-specific templates and one-click ordering that adapt to how your practice actually works.",
    },
];

export default function FeaturesGrid() {
    return (
        <section id="features" className="py-24 lg:py-32 scroll-mt-16">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <Reveal className="max-w-2xl mx-auto text-center mb-16">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600 mb-4">
                        Core capabilities
                    </p>
                    <h2 className="text-4xl lg:text-[2.75rem] font-bold tracking-tight text-slate-900 leading-tight">
                        Everything your practice needs, nothing it doesn&apos;t
                    </h2>
                    <p className="mt-5 text-lg text-slate-600 leading-relaxed">
                        Built to reduce clinician burnout and improve patient outcomes through
                        intelligent automation and intuitive design.
                    </p>
                </Reveal>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {features.map((feature, idx) => (
                        <Reveal key={feature.title} delay={(idx % 3) * 0.08}>
                            <div className="group h-full rounded-2xl border border-slate-200/80 bg-white p-8 transition-all duration-300 hover:border-blue-200 hover:shadow-[0_16px_48px_-16px_rgba(37,99,235,0.18)] hover:-translate-y-1">
                                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 transition-colors duration-300 group-hover:bg-blue-600 group-hover:text-white group-hover:ring-blue-600">
                                    <feature.icon className="h-5.5 w-5.5" strokeWidth={1.75} />
                                </div>
                                <h3 className="text-lg font-bold tracking-tight text-slate-900 mb-2.5">
                                    {feature.title}
                                </h3>
                                <p className="text-[15px] leading-relaxed text-slate-600">{feature.desc}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
