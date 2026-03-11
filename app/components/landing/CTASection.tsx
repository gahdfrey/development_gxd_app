import Link from "next/link";

export default function CTASection() {
    return (
        <section className="py-20">
            <div className="bg-blue-600 rounded-3xl p-10 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-blue-600/40">
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-black/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Ready to transform your practice?</h2>
                    <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto">Join 10,000+ healthcare providers who trust CareVault EHR to manage their clinical workflow and patient care.</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/signup" className="bg-white text-blue-600 hover:bg-slate-50 font-black px-8 py-4 rounded-xl transition-all w-full sm:w-auto">
                            Start Your Free Trial
                        </Link>
                        <button className="bg-blue-600/20 text-white border border-white/30 hover:bg-blue-600/30 font-bold px-8 py-4 rounded-xl transition-all w-full sm:w-auto">
                            Schedule a Demo
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
