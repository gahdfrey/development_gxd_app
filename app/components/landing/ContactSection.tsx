"use client";

import { useState } from "react";
import { ChevronDown, Loader2, Mail, MapPin, Phone, Send } from "lucide-react";
import Reveal from "./Reveal";
import { useToast } from "@/app/contexts/ToastContext";

const faqs = [
    {
        q: "How does CareVault protect patient data?",
        a: "CareVault is engineered around HIPAA and GDPR data-protection principles: role-based access control, full audit logging, consent management, encryption in transit, and patient data-rights tooling. Formal certifications (e.g. SOC 2) are handled per deployment with your hosting and compliance teams.",
    },
    {
        q: "How long does data migration take?",
        a: "Our automated migration tools typically handle mid-sized practice data imports within 48–72 hours, including patient records and billing history.",
    },
    {
        q: "Do you provide training for staff?",
        a: "Every implementation comes with dedicated 1-on-1 onboarding and access to our 24/7 learning management system for your entire clinical team.",
    },
    {
        q: "Can CareVault integrate with our existing lab partners?",
        a: "Yes. We maintain live interfaces with all major national laboratories and can stand up custom HL7/FHIR connections for regional partners.",
    },
];

const contactDetails = [
    { icon: Mail, label: "Email", value: "hello@carevault.health" },
    { icon: Phone, label: "Phone", value: "+234 905 669 9774" },
    { icon: MapPin, label: "Office", value: "8b Dipo Awolesi Street, Magodo" },
];

const inputClasses =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

function FaqItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
                <span className="text-[15px] font-semibold text-slate-900">{q}</span>
                <ChevronDown
                    className={`h-4.5 w-4.5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                />
            </button>
            <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
                <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-[14px] leading-relaxed text-slate-600">{a}</p>
                </div>
            </div>
        </div>
    );
}

const initialForm = {
    firstName: "",
    lastName: "",
    workEmail: "",
    orgType: "Private practice",
    message: "",
};

export default function ContactSection() {
    const { showToast } = useToast();
    const [form, setForm] = useState(initialForm);
    const [isSending, setIsSending] = useState(false);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSending) return;
        setIsSending(true);
        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || "Failed to send your message. Please try again.");
            }
            // Toast auto-dismisses after 3 seconds (see Toast component default).
            showToast("Message sent — we'll be in touch shortly.", "success");
            setForm(initialForm);
        } catch (err) {
            showToast(
                err instanceof Error ? err.message : "Failed to send your message. Please try again.",
                "error",
            );
        } finally {
            setIsSending(false);
        }
    };

    return (
        <section id="contact" className="bg-slate-50 border-y border-slate-200/70 scroll-mt-16">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-32">
                <Reveal className="max-w-2xl mb-16">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600 mb-4">
                        Contact
                    </p>
                    <h2 className="text-4xl lg:text-[2.75rem] font-bold tracking-tight text-slate-900 leading-tight">
                        Let&apos;s build a better workflow together
                    </h2>
                    <p className="mt-5 text-lg text-slate-600 leading-relaxed">
                        Our team is ready to help you transition to a smarter, HIPAA &amp; GDPR-aligned EHR
                        tailored to your practice size.
                    </p>
                </Reveal>

                <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
                    {/* Contact form */}
                    <Reveal>
                        <div className="rounded-3xl border border-slate-200/80 bg-white p-8 lg:p-10 shadow-[0_24px_64px_-40px_rgba(15,23,42,0.3)]">
                            <h3 className="text-xl font-bold tracking-tight text-slate-900">Send us a message</h3>
                            <p className="mt-1.5 text-sm text-slate-500">Typical response time: under 2 hours.</p>

                            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                                <div className="grid sm:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label htmlFor="first-name" className="block text-sm font-medium text-slate-700">
                                            First name
                                        </label>
                                        <input
                                            id="first-name"
                                            name="firstName"
                                            type="text"
                                            placeholder="Jane"
                                            required
                                            value={form.firstName}
                                            onChange={handleChange}
                                            disabled={isSending}
                                            className={inputClasses}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="last-name" className="block text-sm font-medium text-slate-700">
                                            Last name
                                        </label>
                                        <input
                                            id="last-name"
                                            name="lastName"
                                            type="text"
                                            placeholder="Smith"
                                            required
                                            value={form.lastName}
                                            onChange={handleChange}
                                            disabled={isSending}
                                            className={inputClasses}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="work-email" className="block text-sm font-medium text-slate-700">
                                        Work email
                                    </label>
                                    <input
                                        id="work-email"
                                        name="workEmail"
                                        type="email"
                                        placeholder="jane.smith@clinic.com"
                                        required
                                        value={form.workEmail}
                                        onChange={handleChange}
                                        disabled={isSending}
                                        className={inputClasses}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="org-type" className="block text-sm font-medium text-slate-700">
                                        Organization type
                                    </label>
                                    <select
                                        id="org-type"
                                        name="orgType"
                                        value={form.orgType}
                                        onChange={handleChange}
                                        disabled={isSending}
                                        className={inputClasses}
                                    >
                                        <option>Private practice</option>
                                        <option>Multi-specialty clinic</option>
                                        <option>Hospital system</option>
                                        <option>Urgent care</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="message" className="block text-sm font-medium text-slate-700">
                                        Message
                                    </label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        rows={4}
                                        placeholder="Tell us about your practice needs…"
                                        required
                                        value={form.message}
                                        onChange={handleChange}
                                        disabled={isSending}
                                        className={`${inputClasses} resize-none`}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSending}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {isSending ? (
                                        <>
                                            Sending…
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        </>
                                    ) : (
                                        <>
                                            Send message
                                            <Send className="h-4 w-4" />
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-xs leading-relaxed text-slate-400">
                                    By submitting this form, you agree to our privacy policy and HIPAA
                                    data handling practices.
                                </p>
                            </form>
                        </div>
                    </Reveal>

                    {/* FAQ + contact details */}
                    <Reveal delay={0.12} className="space-y-10">
                        <div>
                            <h3 className="text-xl font-bold tracking-tight text-slate-900 mb-6">
                                Common questions
                            </h3>
                            <div className="space-y-3">
                                {faqs.map((faq) => (
                                    <FaqItem key={faq.q} q={faq.q} a={faq.a} />
                                ))}
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-4">
                            {contactDetails.map((item) => (
                                <div key={item.label} className="rounded-xl border border-slate-200/80 bg-white p-5">
                                    <item.icon className="h-5 w-5 text-blue-600 mb-3" strokeWidth={1.75} />
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        {item.label}
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-slate-800">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}
