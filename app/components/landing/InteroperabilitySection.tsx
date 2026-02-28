export default function InteroperabilitySection() {
    return (
        <section className="py-24 overflow-hidden">
            <div className="flex flex-col lg:flex-row items-center gap-16">
                <div className="flex-1 space-y-8">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">Advanced Interoperability</h2>
                        <p className="text-lg text-slate-600">Connect with the entire healthcare ecosystem. Our platform bridges the gap between pharmacies, labs, and other providers instantly.</p>
                    </div>
                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="shrink-0 w-8 h-8 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center mt-1">
                                <span>
                                    <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#135bec">
                                        <path d="M5 13L9 17L19 7" stroke="#135bec" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                    </svg>
                                </span>
                            </div>
                            <div>
                                <h4 className="font-bold">Unified Patient Profiles</h4>
                                <p className="text-sm text-slate-500">Access comprehensive histories across different networks through FHIR standards.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="shrink-0 w-8 h-8 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center mt-1">
                                <span>
                                    <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#135bec">
                                        <path d="M5 13L9 17L19 7" stroke="#135bec" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                    </svg>
                                </span>
                            </div>
                            <div>
                                <h4 className="font-bold">Real-time Lab Connectivity</h4>
                                <p className="text-sm text-slate-500">Instant result transmission and automatic integration into specialty-specific flows.</p>
                            </div>
                        </div>
                    </div>
                    <button className="flex items-center gap-2 font-bold text-blue-600 group">
                        Learn more about integrations
                    </button>
                </div>
                <div className="flex-1 w-full max-w-xl">
                    <div className="relative">
                        <div className="absolute -inset-4 bg-blue-600/20 rounded-2xl blur-2xl opacity-30"></div>
                        <div className="relative grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100">
                                <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden mb-4">
                                    <div className="w-full h-full bg-gradient-to-br from-blue-600/10 to-blue-600/30 flex items-center justify-center">
                                        <svg width="54" height="54" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#135bec">
                                            <path d="M4 6V12C4 12 4 15 11 15C18 15 18 12 18 12V6" stroke="#135bec" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M11 3C18 3 18 6 18 6C18 6 18 9 11 9C4 9 4 6 4 6C4 6 4 3 11 3Z" stroke="#135bec" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M11 21C4 21 4 18 4 18V12" stroke="#135bec" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M15 21V19" stroke="#135bec" strokeWidth="1.5" strokeLinecap="round"></path>
                                            <path d="M18 21V17" stroke="#135bec" strokeWidth="1.5" strokeLinecap="round"></path>
                                            <path d="M21 21V15" stroke="#135bec" strokeWidth="1.5" strokeLinecap="round"></path>
                                        </svg>
                                    </div>
                                </div>
                                <p className="font-bold text-sm">Network Status</p>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                                    <div className="h-full w-4/5 bg-blue-600 rounded-full"></div>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100 mt-8">
                                <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden mb-4">
                                    <div className="w-full h-full bg-gradient-to-tr from-blue-600/10 to-blue-600/30 flex items-center justify-center">
                                        <svg width="54" height="54" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#135bec">
                                            <path d="M14 19L17 22L22 17" stroke="#135bec" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M17 14V4M17 4L20 7M17 4L14 7" stroke="#135bec" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                            <path d="M7 4V20M7 20L10 17M7 20L4 17" stroke="#135bec" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                        </svg>
                                    </div>
                                </div>
                                <p className="font-bold text-sm">Data Exchange</p>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                                    <div className="h-full w-full bg-emerald-500 rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
