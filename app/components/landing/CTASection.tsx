import { ArrowRight } from "lucide-react";
import Reveal from "./Reveal";

export default function CTASection() {
    return (
        <section className="py-24 lg:py-32">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <Reveal>
                    <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-8 py-20 lg:px-20 lg:py-28 text-center">
                        {/* Background accents */}
                        <div
                            className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.07)_1px,transparent_1px)] bg-[size:48px_48px]"
                            aria-hidden
                        />
                        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[360px] w-[720px] rounded-full bg-blue-600/30 blur-3xl" aria-hidden />

                        <div className="relative max-w-2xl mx-auto">
                            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                                Ready to transform your practice?
                            </h2>
                            <p className="mt-6 text-lg leading-relaxed text-slate-400">
                                Join 10,000+ healthcare providers who trust CareVault to manage their
                                clinical workflow and patient care.
                            </p>
                            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                                <button
                                    type="button"
                                    disabled
                                    aria-disabled="true"
                                    title="Access is by invitation only"
                                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-white/60 px-7 py-3.5 text-[15px] font-semibold text-slate-500 shadow-lg cursor-not-allowed select-none"
                                >
                                    Start your free trial
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                                <a
                                    href="#contact"
                                    className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl border border-white/20 bg-white/5 px-7 py-3.5 text-[15px] font-semibold text-white hover:bg-white/10 transition-colors"
                                >
                                    Schedule a demo
                                </a>
                            </div>
                            <p className="mt-8 text-sm text-slate-500">
                                Free 30-day trial · No credit card required · Cancel anytime
                            </p>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
