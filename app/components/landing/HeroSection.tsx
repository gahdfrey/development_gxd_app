export default function HeroSection() {
    return (
        <section className="relative min-h-[90vh] flex items-center overflow-hidden">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/10 via-transparent to-transparent"></div>
            <div className="absolute top-40 left-10 -z-10 opacity-20">
                <span className="material-symbols-outlined text-8xl text-blue-600 select-none">medical_services</span>
            </div>
            <div className="absolute bottom-20 right-1/4 -z-10 opacity-10">
                <span className="material-symbols-outlined text-9xl text-blue-600 select-none">monitor_heart</span>
            </div>

            <div className="w-full grid lg:grid-cols-2 gap-12 items-center">
                {/* Content Side */}
                <div className="flex flex-col gap-8 max-w-2xl mt-10">
                    <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-600/20 px-3 py-1 rounded-full w-fit">
                        {/* <span className="material-symbols-outlined text-blue-600 text-sm">verified_user</span> */}
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Next-Gen HIPAA Compliant Platform</span>
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight text-slate-900">
                        Patient Care,
                        <span className="text-blue-600">Reimagined.</span>
                    </h1>
                    <p className="text-lg lg:text-xl text-slate-600 leading-relaxed">
                        Experience a modern EHR platform designed for seamless integration, intuitive workflows, and superior patient outcomes. Built for providers who value speed and security.
                    </p>
                    <div className="flex flex-wrap gap-4 mt-4">
                        <button className="px-6 py-4 rounded-xl bg-blue-600 text-white font-bold text-lg shadow-xl shadow-blue-600/30 hover:scale-[1.02] transition-transform flex items-center gap-2">
                            <span>Get Started</span>
                            {/* <span className="material-symbols-outlined">arrow_forward</span> */} </button>
                        <button className="px-6 py-4 rounded-xl bg-white text-slate-900 font-bold text-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2">
                            {/* <span className="material-symbols-outlined">play_circle</span> */}
                            <span>Request a Demo</span>
                        </button>
                    </div>
                    <div className="flex items-center gap-6 mt-8 grayscale opacity-60">
                        <span className="text-xs font-bold uppercase text-slate-500">Trusted by</span>
                        <div className="flex gap-4 items-center">
                            <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor">
                                <path d="M13.6667 16H10.3333V13.6667H8V10.3333H10.3333V8H13.6667V10.3333H16V13.6667H13.6667V16Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                <path d="M5 18L3.13036 4.91253C3.05646 4.39524 3.39389 3.91247 3.90398 3.79912L11.5661 2.09641C11.8519 2.03291 12.1481 2.03291 12.4339 2.09641L20.096 3.79912C20.6061 3.91247 20.9435 4.39524 20.8696 4.91252L19 18C18.9293 18.495 18.5 21.5 12 21.5C5.5 21.5 5.07071 18.495 5 18Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                            </svg>
                            <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor">
                                <path d="M6.4 8C6.73137 8 7 7.73137 7 7.4V3.6C7 3.26863 7.26863 3 7.6 3H16.4C16.7314 3 17 3.26863 17 3.6V7.4C17 7.73137 17.2686 8 17.6 8H19.4C19.7314 8 20 8.26863 20 8.6V20.4C20 20.7314 19.7314 21 19.4 21H4.6C4.26863 21 4 20.7314 4 20.4V8.6C4 8.26863 4.26863 8 4.6 8H6.4Z" stroke="currentColor" strokeWidth="1.5"></path>
                                <path d="M9.99219 8H11.9922M13.9922 8H11.9922M11.9922 8V6M11.9922 8V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                <path d="M16 17.01L16.01 16.9989" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                <path d="M16 13.01L16.01 12.9989" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                <path d="M12 13.01L12.01 12.9989" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                <path d="M8 13.01L8.01 12.9989" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                <path d="M8 17.01L8.01 16.9989" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                <path d="M12 17.01L12.01 16.9989" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                            </svg>
                            <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor">
                                <path d="M8 14L16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                <path d="M8 10L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                <path d="M8 18L12 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                <path d="M10 3H6C4.89543 3 4 3.89543 4 5V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V5C20 3.89543 19.1046 3 18 3H14.5M10 3V1M10 3V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Dashboard Mockup Side */}
                <div className="relative lg:h-[600px] w-full flex items-center justify-center lg:justify-end">
                    <div className="relative w-full aspect-[4/3] max-w-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden group">
                        <div className="h-12 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-2">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                            </div>
                        </div>
                        <div className="p-6 flex flex-col gap-6">
                            <div className="flex justify-between items-center">
                                <div className="w-48 h-8 bg-slate-100 rounded-lg"></div>
                                <div className="w-24 h-8 bg-blue-600/10 rounded-lg"></div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="h-24 bg-slate-50 rounded-xl border border-slate-100 p-4">
                                    <div className="w-1/2 h-4 bg-slate-200 rounded mb-2"></div>
                                    <div className="w-3/4 h-8 bg-blue-600/20 rounded"></div>
                                </div>
                                <div className="h-24 bg-slate-50 rounded-xl border border-slate-100 p-4">
                                    <div className="w-1/2 h-4 bg-slate-200 rounded mb-2"></div>
                                    <div className="w-3/4 h-8 bg-slate-200 rounded"></div>
                                </div>
                                <div className="h-24 bg-slate-50 rounded-xl border border-slate-100 p-4">
                                    <div className="w-1/2 h-4 bg-slate-200 rounded mb-2"></div>
                                    <div className="w-3/4 h-8 bg-slate-200 rounded"></div>
                                </div>
                            </div>
                            <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-4">
                                <div className="w-full h-4 bg-slate-200 rounded"></div>
                                <div className="w-full h-4 bg-slate-200 rounded"></div>
                                <div className="w-2/3 h-4 bg-slate-200 rounded"></div>
                                <div className="w-full h-32 bg-blue-600/5 rounded-lg border border-blue-600/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-4xl text-blue-600/40">bar_chart</span>
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-10 -left-2 bg-white p-4 rounded-xl shadow-2xl border border-slate-100 flex items-center gap-4 animate-bounce">
                            {/* <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-600">check_circle</span>
              </div> */}
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#91f48a" strokeWidth="1.5">
                                <path fillRule="evenodd" clipRule="evenodd" d="M12 1.25C6.06294 1.25 1.25 6.06294 1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25ZM7.53044 11.9697C7.23755 11.6768 6.76268 11.6768 6.46978 11.9697C6.17689 12.2626 6.17689 12.7374 6.46978 13.0303L9.46978 16.0303C9.76268 16.3232 10.2376 16.3232 10.5304 16.0303L17.5304 9.03033C17.8233 8.73744 17.8233 8.26256 17.5304 7.96967C17.2375 7.67678 16.7627 7.67678 16.4698 7.96967L10.0001 14.4393L7.53044 11.9697Z" fill="#91f48a"></path>
                            </svg>
                            <div>
                                <p className="text-sm font-bold">Sync Complete</p>
                                <p className="text-xs text-slate-500">142 Records updated</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
