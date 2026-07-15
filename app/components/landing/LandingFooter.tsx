import { HeartPulse, Linkedin, Mail, Twitter } from "lucide-react";

const columns = [
    {
        heading: "Product",
        links: ["Telehealth", "Billing & Claims", "Patient Portal", "E-Prescribing"],
    },
    {
        heading: "Compliance",
        links: ["HIPAA Policy", "GDPR Info", "SOC 2 Reports", "Data Privacy"],
    },
    {
        heading: "Company",
        links: ["About Us", "Careers", "Contact", "Partners"],
    },
];

const socials = [
    { icon: Twitter, label: "Twitter" },
    { icon: Linkedin, label: "LinkedIn" },
    { icon: Mail, label: "Email" },
];

export default function LandingFooter() {
    return (
        <footer className="border-t border-slate-200 bg-white">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-8">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-12 mb-16">
                    <div className="col-span-2">
                        <div className="flex items-center gap-2.5 mb-5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                                <HeartPulse className="h-[18px] w-[18px]" strokeWidth={2.25} />
                            </span>
                            <span className="text-[17px] font-bold tracking-tight text-slate-900">
                                Care<span className="text-blue-600">Vault</span>
                            </span>
                        </div>
                        <p className="max-w-xs text-[15px] leading-relaxed text-slate-500 mb-6">
                            Redefining healthcare technology with intelligent clinical workflows and
                            unparalleled security since 2018.
                        </p>
                        <div className="flex gap-2.5">
                            {socials.map((social) => (
                                <a
                                    key={social.label}
                                    href="#"
                                    aria-label={social.label}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                                >
                                    <social.icon className="h-4 w-4" strokeWidth={1.75} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {columns.map((col) => (
                        <div key={col.heading}>
                            <h6 className="text-sm font-bold text-slate-900 mb-5">{col.heading}</h6>
                            <ul className="space-y-3.5">
                                {col.links.map((link) => (
                                    <li key={link}>
                                        <a
                                            href="#"
                                            className="text-sm text-slate-500 hover:text-blue-600 transition-colors"
                                        >
                                            {link}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-8">
                    <p className="text-[13px] text-slate-400">
                        © {new Date().getFullYear()} Dleventh. All rights reserved.
                    </p>
                    <div className="flex gap-7 text-[13px] font-medium text-slate-500">
                        <a className="hover:text-blue-600 transition-colors" href="#">Privacy Policy</a>
                        <a className="hover:text-blue-600 transition-colors" href="#">Terms of Service</a>
                        <a className="hover:text-blue-600 transition-colors" href="#">Cookie Policy</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
