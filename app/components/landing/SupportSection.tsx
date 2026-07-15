import { ArrowRight, CheckCircle2, Quote, Star } from "lucide-react";
import Reveal from "./Reveal";

const supportPoints = [
    "24/7 clinical support with an average response under 2 minutes",
    "Dedicated 1-on-1 implementation specialists for every rollout",
    "Ongoing training and certification for your entire staff",
    "Guided data migration — most practices are live in 72 hours",
];

export default function SupportSection() {
    return (
        <section id="support" className="py-24 lg:py-32 scroll-mt-16">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
                    <Reveal>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600 mb-4">
                            World-class support
                        </p>
                        <h2 className="text-4xl lg:text-[2.75rem] font-bold tracking-tight text-slate-900 leading-tight">
                            A partner, not just a platform
                        </h2>
                        <p className="mt-5 text-lg text-slate-600 leading-relaxed">
                            We&apos;re here when you need us most. Our dedicated clinical support team
                            is available around the clock, so your facility never skips a beat.
                        </p>

                        <ul className="mt-9 space-y-4">
                            {supportPoints.map((point) => (
                                <li key={point} className="flex items-start gap-3.5">
                                    <CheckCircle2 className="mt-0.5 h-5.5 w-5.5 shrink-0 text-blue-600" strokeWidth={1.75} />
                                    <span className="text-[15px] leading-relaxed text-slate-700">{point}</span>
                                </li>
                            ))}
                        </ul>

                        <a
                            href="#contact"
                            className="group mt-10 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-[15px] font-semibold text-slate-800 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                        >
                            Talk to our team
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </a>
                    </Reveal>

                    <Reveal delay={0.12}>
                        <figure className="relative rounded-3xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white p-9 lg:p-12 shadow-[0_24px_64px_-32px_rgba(15,23,42,0.25)]">
                            <Quote className="absolute right-9 top-9 h-10 w-10 text-blue-100" strokeWidth={1.5} aria-hidden />

                            <div className="flex gap-1 mb-7">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star key={i} className="h-4.5 w-4.5 fill-amber-400 text-amber-400" />
                                ))}
                            </div>

                            <blockquote className="text-xl lg:text-[22px] font-medium leading-relaxed tracking-tight text-slate-800">
                                &ldquo;The response time is incredible. Whenever we have a critical
                                update or need assistance during late shifts, the CareVault team is
                                there within minutes. It&apos;s a level of partnership we haven&apos;t
                                found anywhere else.&rdquo;
                            </blockquote>

                            <figcaption className="mt-9 flex items-center gap-4 border-t border-slate-200/80 pt-7">
                                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                                    SJ
                                </span>
                                <div>
                                    <p className="font-bold text-slate-900">Dr. Sarah Jenkins</p>
                                    <p className="text-sm text-slate-500">
                                        Chief Medical Officer, City General Hospital
                                    </p>
                                </div>
                            </figcaption>
                        </figure>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}
