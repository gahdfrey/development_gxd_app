"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="font-display bg-white text-slate-900 antialiased">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-blue-600">
              <span className="material-symbols-outlined text-3xl">database</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">HealTech EHR</h2>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a className="text-sm font-semibold hover:text-blue-600 transition-colors" href="#">Features</a>
            <a className="text-sm font-semibold hover:text-blue-600 transition-colors" href="#">Solutions</a>
            <a className="text-sm font-semibold hover:text-blue-600 transition-colors" href="#">Pricing</a>
            <a className="text-sm font-semibold hover:text-blue-600 transition-colors" href="#">Resources</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:flex text-sm font-semibold px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-all">
              Login
            </Link>
            <Link href="/signup" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-lg shadow-blue-600/20 transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/10 via-transparent to-transparent"></div>
          <div className="absolute top-40 left-10 -z-10 opacity-20">
            <span className="material-symbols-outlined text-8xl text-blue-600 select-none">medical_services</span>
          </div>
          <div className="absolute bottom-20 right-1/4 -z-10 opacity-10">
            <span className="material-symbols-outlined text-9xl text-blue-600 select-none">monitor_heart</span>
          </div>
          <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-8 max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-600/20 px-3 py-1 rounded-full w-fit">
                <span className="material-symbols-outlined text-blue-600 text-sm">verified_user</span>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Next-Gen HIPAA Compliant Platform</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight text-slate-900">
                Patient Care, <span className="text-blue-600">Reimagined.</span>
              </h1>
              <p className="text-lg lg:text-xl text-slate-600 leading-relaxed">
                Experience a modern EHR platform designed for seamless integration, intuitive workflows, and superior patient outcomes. Built for providers who value speed and security.
              </p>
              <div className="flex flex-wrap gap-4 mt-4">
                <button className="h-14 px-8 rounded-xl bg-blue-600 text-white font-bold text-lg shadow-xl shadow-blue-600/30 hover:scale-[1.02] transition-transform flex items-center gap-2">
                  <span>Get Started Free</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
                <button className="h-14 px-8 rounded-xl bg-white text-slate-900 font-bold text-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined">play_circle</span>
                  <span>Request a Demo</span>
                </button>
              </div>
              <div className="flex items-center gap-6 mt-8 grayscale opacity-60">
                <span className="text-xs font-bold uppercase text-slate-500">Trusted by</span>
                <div className="flex gap-4 items-center">
                  <span className="material-symbols-outlined text-2xl">health_and_safety</span>
                  <span className="material-symbols-outlined text-2xl">local_hospital</span>
                  <span className="material-symbols-outlined text-2xl">clinical_notes</span>
                </div>
              </div>
            </div>
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
                <div className="absolute bottom-10 -left-10 bg-white p-4 rounded-xl shadow-2xl border border-slate-100 flex items-center gap-4 animate-bounce">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold">Sync Complete</p>
                    <p className="text-xs text-slate-500">142 Records updated</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Features Grid */}
        <section className="py-16 px-6 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <div className="mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Core Capabilities</h2>
              <p className="text-slate-600 max-w-2xl">
                Built to reduce burnout and improve patient outcomes through intelligent automation and intuitive design.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="group p-8 rounded-xl bg-white border border-slate-200 hover:border-blue-600/50 transition-all duration-300 shadow-sm hover:shadow-xl">
                <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined">auto_awesome</span>
                </div>
                <h3 className="text-xl font-bold mb-3">Intelligent Charting</h3>
                <p className="text-slate-600 leading-relaxed text-sm">AI-driven documentation that learns your specialty-specific patterns to save hours on daily paperwork and clinical notes.</p>
              </div>
              <div className="group p-8 rounded-xl bg-white border border-slate-200 hover:border-blue-600/50 transition-all duration-300 shadow-sm hover:shadow-xl">
                <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined">videocam</span>
                </div>
                <h3 className="text-xl font-bold mb-3">Telehealth Integration</h3>
                <p className="text-slate-600 leading-relaxed text-sm">Seamless HD video consultations directly within the patient record with integrated digital consent forms and screen sharing.</p>
              </div>
              <div className="group p-8 rounded-xl bg-white border border-slate-200 hover:border-blue-600/50 transition-all duration-300 shadow-sm hover:shadow-xl">
                <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined">receipt_long</span>
                </div>
                <h3 className="text-xl font-bold mb-3">Automated Billing</h3>
                <p className="text-slate-600 leading-relaxed text-sm">Smart claims engine that identifies coding errors before submission to maximize your reimbursement rates and minimize denials.</p>
              </div>
              <div className="group p-8 rounded-xl bg-white border border-slate-200 hover:border-blue-600/50 transition-all duration-300 shadow-sm hover:shadow-xl">
                <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined">labs</span>
                </div>
                <h3 className="text-xl font-bold mb-3">Lab Results Sync</h3>
                <p className="text-slate-600 leading-relaxed text-sm">Real-time laboratory integrations with automatic flagging of abnormal values and longitudinal trend analysis for patient health.</p>
              </div>
              <div className="group p-8 rounded-xl bg-white border border-slate-200 hover:border-blue-600/50 transition-all duration-300 shadow-sm hover:shadow-xl">
                <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined">medication</span>
                </div>
                <h3 className="text-xl font-bold mb-3">E-Prescribing</h3>
                <p className="text-slate-600 leading-relaxed text-sm">Direct transmission to pharmacies nationwide with EPCS capability and integrated drug-to-drug interaction alerts.</p>
              </div>
              <div className="group p-8 rounded-xl bg-white border border-slate-200 hover:border-blue-600/50 transition-all duration-300 shadow-sm hover:shadow-xl">
                <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined">security</span>
                </div>
                <h3 className="text-xl font-bold mb-3">HIPAA Compliance</h3>
                <p className="text-slate-600 leading-relaxed text-sm">Enterprise-grade security protocols ensuring 100% HIPAA compliance and encrypted data storage across all systems.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Advanced Interoperability Section */}
        <section className="py-24 px-6 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="flex-1 space-y-8">
                <div>
                  <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">Advanced Interoperability</h2>
                  <p className="text-lg text-slate-600">Connect with the entire healthcare ecosystem. Our platform bridges the gap between pharmacies, labs, and other providers instantly.</p>
                </div>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center mt-1">
                      <span className="material-symbols-outlined text-sm">check</span>
                    </div>
                    <div>
                      <h4 className="font-bold">Unified Patient Profiles</h4>
                      <p className="text-sm text-slate-500">Access comprehensive histories across different networks through FHIR standards.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center mt-1">
                      <span className="material-symbols-outlined text-sm">check</span>
                    </div>
                    <div>
                      <h4 className="font-bold">Real-time Lab Connectivity</h4>
                      <p className="text-sm text-slate-500">Instant result transmission and automatic integration into specialty-specific flows.</p>
                    </div>
                  </div>
                </div>
                <button className="flex items-center gap-2 font-bold text-blue-600 group">
                  Learn more about integrations
                  <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
                </button>
              </div>
              <div className="flex-1 w-full max-w-xl">
                <div className="relative">
                  <div className="absolute -inset-4 bg-blue-600/20 rounded-2xl blur-2xl opacity-30"></div>
                  <div className="relative grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100">
                      <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden mb-4">
                        <div className="w-full h-full bg-gradient-to-br from-blue-600/10 to-blue-600/30 flex items-center justify-center">
                          <span className="material-symbols-outlined text-5xl text-blue-600/40">hub</span>
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
                          <span className="material-symbols-outlined text-5xl text-blue-600/40">monitoring</span>
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
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto bg-blue-600 rounded-3xl p-10 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-blue-600/40">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-black/10 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Ready to transform your practice?</h2>
              <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto">Join 10,000+ providers who trust HealTech EHR to manage their clinical workflow and patient care.</p>
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

        {/* Hero Impact Section */}
        <section className="max-w-7xl mx-auto w-full px-4 md:px-10 py-12 mb-16">
          <div
            className="relative overflow-hidden rounded-xl bg-slate-900 min-h-[520px] flex flex-col items-center justify-center p-8 text-center"
            style={{
              backgroundImage: "linear-gradient(rgba(19, 91, 236, 0.4) 0%, rgba(0, 0, 0, 0.8) 100%), url('https://lh3.googleusercontent.com/aida-public/AB6AXuB38mapxsVQbG0asKBuA3RgBeES1t91zNg8mMuc3OeVVY7m9DBqgvYNXAC4vZ1kPaRPoExv6_2488UV1idxJ6HkTpdHhTYXpgq55s45AOsPJ_5g8Bm4PfCTFKFMNeuLpMoBRQ83gpuIB6NgjXYx2uvxhxrkfHwtlsl1DPJ8KnDMURxWUB9AeI9fzdXfLk8S-lM2wdp0W2Vv4tV2J8hEvDrkR4H4kSfNcnYADmJIQDv0XhEjTKuNaBmeiosv-FdjWnoi0OWEe1OVMi0')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="relative z-10 max-w-3xl flex flex-col gap-6">
              <span className="inline-block self-center px-4 py-1.5 rounded-full bg-blue-600/20 text-blue-600 border border-blue-600/30 text-xs font-bold uppercase tracking-widest">Global Scale</span>
              <h2 className="text-white text-4xl md:text-6xl font-black leading-tight tracking-tight">Transforming Healthcare at Scale</h2>
              <p className="text-slate-200 text-lg md:text-xl font-normal max-w-2xl mx-auto leading-relaxed">Experience the impact of a modern Electronic Health Record system designed for reliability, speed, and world-class care delivery.</p>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                <button className="flex min-w-[160px] cursor-pointer items-center justify-center rounded-lg h-12 px-6 bg-blue-600 text-white text-base font-bold shadow-xl shadow-blue-600/40 hover:scale-105 transition-transform">View Our Impact</button>
                <button className="flex min-w-[160px] cursor-pointer items-center justify-center rounded-lg h-12 px-6 bg-white/10 backdrop-blur-md border border-white/20 text-white text-base font-bold hover:bg-white/20 transition-all">Read Case Studies</button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="max-w-7xl mx-auto w-full px-4 md:px-10 mb-20">
          <div className="flex items-center gap-3 mb-8">
            <span className="p-2 bg-blue-600/10 rounded-lg text-blue-600">
              <span className="material-symbols-outlined">analytics</span>
            </span>
            <h2 className="text-slate-900 text-3xl font-extrabold tracking-tight">Impact by the Numbers</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group flex flex-col gap-4 rounded-xl p-8 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all border-b-4 border-b-blue-600">
              <div className="flex items-center justify-between">
                <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Clinics Served</p>
                <span className="material-symbols-outlined text-blue-600/40 group-hover:text-blue-600 transition-colors">medical_services</span>
              </div>
              <p className="text-slate-900 text-5xl font-black tracking-tight">5,000+</p>
              <div className="flex items-center gap-2">
                <span className="flex items-center text-emerald-600 font-bold text-sm bg-emerald-50 px-2 py-0.5 rounded">
                  <span className="material-symbols-outlined text-sm">trending_up</span>15%
                </span>
                <span className="text-slate-400 text-xs">Growth this year</span>
              </div>
            </div>
            <div className="group flex flex-col gap-4 rounded-xl p-8 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all border-b-4 border-b-blue-600">
              <div className="flex items-center justify-between">
                <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Patients Managed</p>
                <span className="material-symbols-outlined text-blue-600/40 group-hover:text-blue-600 transition-colors">groups</span>
              </div>
              <p className="text-slate-900 text-5xl font-black tracking-tight">10M+</p>
              <div className="flex items-center gap-2">
                <span className="flex items-center text-emerald-600 font-bold text-sm bg-emerald-50 px-2 py-0.5 rounded">
                  <span className="material-symbols-outlined text-sm">trending_up</span>22%
                </span>
                <span className="text-slate-400 text-xs">Active patient records</span>
              </div>
            </div>
            <div className="group flex flex-col gap-4 rounded-xl p-8 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all border-b-4 border-b-blue-600">
              <div className="flex items-center justify-between">
                <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">System Uptime</p>
                <span className="material-symbols-outlined text-blue-600/40 group-hover:text-blue-600 transition-colors">verified_user</span>
              </div>
              <p className="text-slate-900 text-5xl font-black tracking-tight">99.9%</p>
              <div className="flex items-center gap-2">
                <span className="flex items-center text-emerald-600 font-bold text-sm bg-emerald-50 px-2 py-0.5 rounded">
                  <span className="material-symbols-outlined text-sm">check_circle</span>+0.01%
                </span>
                <span className="text-slate-400 text-xs">Industry leading SLA</span>
              </div>
            </div>
          </div>
        </section>

        {/* World-Class Support Section */}
        <section className="max-w-7xl mx-auto w-full px-4 md:px-10 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-blue-600/10 rounded-lg text-blue-600">
                <span className="material-symbols-outlined">support_agent</span>
              </span>
              <h2 className="text-slate-900 text-3xl font-extrabold tracking-tight">World-Class Support</h2>
            </div>
            <p className="text-slate-600 text-lg leading-relaxed">We&apos;re here when you need us most. Our dedicated clinical support team is available 24 hours a day, 7 days a week, ensuring your facility never skips a beat.</p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-blue-600 mt-1">check_circle</span>
                <span className="text-slate-700 font-medium">Average response time under 2 minutes</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-blue-600 mt-1">check_circle</span>
                <span className="text-slate-700 font-medium">1-on-1 implementation specialists</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-blue-600 mt-1">check_circle</span>
                <span className="text-slate-700 font-medium">Ongoing training and certification for staff</span>
              </li>
            </ul>
            <div className="pt-4">
              <button className="px-8 py-3 bg-white border-2 border-blue-600 text-blue-600 font-bold rounded-lg hover:bg-blue-600 hover:text-white transition-all">Talk to Support</button>
            </div>
          </div>
          <div className="lg:col-span-7">
            <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl shadow-slate-200 border border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-5 h-full">
                <div className="md:col-span-2 relative h-64 md:h-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="Support Agent" className="absolute inset-0 w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-ToDsX6J4t5RxHmkOrEXYRn9bzdawZTptsK6IsCFxisHdutoFvTe_hPP_SLrP5MeJocRAzwXTH_rirMkUHHBimK9-C8-bvA7W10ynFXr283UnuQCbq80ppb3ggQprNHbMLcqWTg-ycKfUKlA9V0wuR-hQp9eKOf8mOwWd3YbZ_YcjT3gZ0e7EWsKeJcmCKwEGvBpXNnnN1e4Jt-_rZLZJGsTEmKOQhB3-Qxq8nBk-ybTH_R-1eOkRAWTS4_2PluKbK8JFEo9b-O4" />
                </div>
                <div className="md:col-span-3 p-8 md:p-10 flex flex-col justify-center gap-6">
                  <div className="text-blue-600">
                    <span className="material-symbols-outlined text-5xl opacity-30">format_quote</span>
                  </div>
                  <blockquote className="text-slate-800 text-xl italic font-medium leading-relaxed">
                    &ldquo;The response time is incredible. Whenever we have a critical update or need assistance during late shifts, the Modern EHR team is there within minutes. It&apos;s a level of partnership we haven&apos;t found elsewhere.&rdquo;
                  </blockquote>
                  <div className="flex flex-col">
                    <p className="text-slate-900 font-bold text-lg">Dr. Sarah Jenkins</p>
                    <p className="text-blue-600 text-sm font-semibold uppercase tracking-wider">Chief Medical Officer, City General Hospital</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact & FAQ Section */}
        <section className="max-w-7xl mx-auto px-6 py-16 md:py-24">
          {/* Hero Title */}
          <div className="max-w-3xl mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">Let&apos;s build a better workflow together</h2>
            <p className="text-lg text-slate-600">Our team is ready to help you transition to a smarter, HIPAA-compliant EHR system tailored to your practice size.</p>
          </div>
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Contact Form */}
            <div className="bg-white p-8 rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100">
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2">Send us a message</h3>
                <p className="text-slate-500 text-sm">Typical response time: under 2 hours.</p>
              </div>
              <form className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold ml-1">First Name</label>
                    <input className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all" placeholder="Jane" type="text" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold ml-1">Last Name</label>
                    <input className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all" placeholder="Smith" type="text" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold ml-1">Work Email</label>
                  <input className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all" placeholder="jane.smith@clinic.com" type="email" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold ml-1">Organization Type</label>
                  <select className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all appearance-none">
                    <option>Private Practice</option>
                    <option>Multi-specialty Clinic</option>
                    <option>Hospital System</option>
                    <option>Urgent Care</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold ml-1">Message</label>
                  <textarea className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all resize-none" placeholder="Tell us about your practice needs..." rows={4}></textarea>
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2" type="submit">
                  <span>Send Message</span>
                  <span className="material-symbols-outlined text-sm">send</span>
                </button>
                <p className="text-center text-xs text-slate-400 mt-4 italic">
                  By submitting this form, you agree to our privacy policy and HIPAA data handling practices.
                </p>
              </form>
            </div>

            {/* FAQ & Locations */}
            <div className="space-y-12">
              {/* FAQs */}
              <div>
                <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-600">quiz</span>
                  Common Questions
                </h3>
                <div className="space-y-4">
                  <div className="p-5 bg-white rounded-xl border border-slate-100">
                    <h4 className="font-bold mb-2 flex justify-between items-center">
                      Is ModernEHR fully HIPAA compliant?
                      <span className="material-symbols-outlined text-slate-400">expand_more</span>
                    </h4>
                    <p className="text-sm text-slate-600">Yes, we employ AES-256 encryption at rest and TLS 1.3 in transit. Our servers are SOC2 Type II certified and specifically hardened for PHI data.</p>
                  </div>
                  <div className="p-5 bg-white rounded-xl border border-slate-100">
                    <h4 className="font-bold mb-2 flex justify-between items-center">
                      How long does data migration take?
                      <span className="material-symbols-outlined text-slate-400">expand_more</span>
                    </h4>
                    <p className="text-sm text-slate-600">Our automated migration tools typically handle mid-sized practice data imports within 48-72 hours, including patient records and billing history.</p>
                  </div>
                  <div className="p-5 bg-white rounded-xl border border-slate-100">
                    <h4 className="font-bold mb-2 flex justify-between items-center">
                      Do you provide training for staff?
                      <span className="material-symbols-outlined text-slate-400">expand_more</span>
                    </h4>
                    <p className="text-sm text-slate-600">Every implementation comes with dedicated 1-on-1 onboarding and access to our 24/7 learning management system for your entire clinical team.</p>
                  </div>
                </div>
              </div>

              {/* Locations */}
              <div>
                <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-600">location_on</span>
                  Our Offices
                </h3>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="group cursor-pointer">
                    <div className="h-40 bg-slate-200 rounded-xl mb-4 overflow-hidden relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt="San Francisco office" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAK7rKrWFfVanUbqFjFtNmTMg7ha-FnNFQ2Z0xV4LBTEzRsRNncEd6mY4HjJbMq5KIDimQkE28mHUNc_5D0JwIT2hg-28S2e8u3jvAg47VD9V3TD3ej0lw4LJJrii4UYWMhRGHidBK4yMpSSZKzXtMs3xXFBmrLk3UH7EqllqxySbBo58RA_WsLiGbPV-ZpJ0DFLyYNvkJ1TYpO_7KQTw0UXg7DV6RxKf77XzeldusyDBxj6M_EvbZ9N8X55eQQxDmRDDETmD1cmNE" />
                      <div className="absolute inset-0 bg-blue-600/10 group-hover:bg-transparent"></div>
                    </div>
                    <h5 className="font-bold">San Francisco, CA</h5>
                    <p className="text-sm text-slate-500">101 California St, Suite 400<br />San Francisco, CA 94111</p>
                  </div>
                  <div className="group cursor-pointer">
                    <div className="h-40 bg-slate-200 rounded-xl mb-4 overflow-hidden relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt="Austin office" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBWLeFGOFperKr1vo53cjng786Stoi8EyB3-fF-IK__zI8qrdTdOnGINOGhFkSmGV4qcj66prnfYu1YZ_ZMGeQNEdWBWzJ97OLFrqIdTNdTaV9mh6uXiO90SYAEx4lDNiEmkvjQFYrpvsydhuQDybTb3oE_KQETMmk0XALen9y3E3TjHspIYfrvIiV0C0CK-jKI1bM9gNiaQAbTGoFk6Vus9icH6KDSOU1I_ieE5z44AK_qU5rOVeZMTZlkbAXKkunGQO24BXLZ6u4" />
                      <div className="absolute inset-0 bg-blue-600/10 group-hover:bg-transparent"></div>
                    </div>
                    <h5 className="font-bold">Austin, TX</h5>
                    <p className="text-sm text-slate-500">500 W 2nd St, Suite 1900<br />Austin, TX 78701</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-1.5 bg-blue-600 rounded">
                  <span className="material-symbols-outlined text-white text-lg">health_metrics</span>
                </div>
                <span className="text-xl font-bold">ModernEHR</span>
              </div>
              <p className="text-slate-500 max-w-xs mb-6">
                Redefining healthcare technology with intelligent clinical workflows and unparalleled security since 2018.
              </p>
              <div className="flex gap-4">
                <a className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all" href="#">
                  <span className="material-symbols-outlined text-xl">public</span>
                </a>
                <a className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all" href="#">
                  <span className="material-symbols-outlined text-xl">share</span>
                </a>
                <a className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all" href="#">
                  <span className="material-symbols-outlined text-xl">mail</span>
                </a>
              </div>
            </div>
            <div>
              <h6 className="font-bold mb-6">Product</h6>
              <ul className="space-y-4 text-sm text-slate-500">
                <li><a className="hover:text-blue-600 transition-colors" href="#">Telehealth</a></li>
                <li><a className="hover:text-blue-600 transition-colors" href="#">Billing &amp; Claims</a></li>
                <li><a className="hover:text-blue-600 transition-colors" href="#">Patient Portal</a></li>
                <li><a className="hover:text-blue-600 transition-colors" href="#">E-Prescribing</a></li>
              </ul>
            </div>
            <div>
              <h6 className="font-bold mb-6">Compliance</h6>
              <ul className="space-y-4 text-sm text-slate-500">
                <li><a className="hover:text-blue-600 transition-colors" href="#">HIPAA Policy</a></li>
                <li><a className="hover:text-blue-600 transition-colors" href="#">GDPR Info</a></li>
                <li><a className="hover:text-blue-600 transition-colors" href="#">SOC2 Reports</a></li>
                <li><a className="hover:text-blue-600 transition-colors" href="#">Data Privacy</a></li>
              </ul>
            </div>
            <div>
              <h6 className="font-bold mb-6">Company</h6>
              <ul className="space-y-4 text-sm text-slate-500">
                <li><a className="hover:text-blue-600 transition-colors" href="#">About Us</a></li>
                <li><a className="hover:text-blue-600 transition-colors" href="#">Careers</a></li>
                <li><a className="hover:text-blue-600 transition-colors" href="#">Contact</a></li>
                <li><a className="hover:text-blue-600 transition-colors" href="#">Partners</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-400">© {new Date().getFullYear()} ModernEHR Systems Inc. All rights reserved.</p>
            <div className="flex gap-8 text-xs font-medium text-slate-500">
              <a className="hover:text-blue-600" href="#">Privacy Policy</a>
              <a className="hover:text-blue-600" href="#">Terms of Service</a>
              <a className="hover:text-blue-600" href="#">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}