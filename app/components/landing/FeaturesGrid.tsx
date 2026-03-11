import {ReactNode} from "react";

interface Feature {
    icon: string | ReactNode;
    title: string;
    desc: string;
}

const InteroperabilityIcon = () => (
    <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor">
        <rect x="3" y="2" width="7" height="5" rx="0.6" stroke="currentColor" strokeWidth="1.5"></rect>
        <rect x="8.5" y="17" width="7" height="5" rx="0.6" stroke="currentColor" strokeWidth="1.5"></rect>
        <rect x="14" y="2" width="7" height="5" rx="0.6" stroke="currentColor" strokeWidth="1.5"></rect>
        <path d="M6.5 7V10.5C6.5 11.6046 7.39543 12.5 8.5 12.5H15.5C16.6046 12.5 17.5 11.6046 17.5 10.5V7" stroke="currentColor" strokeWidth="1.5"></path>
        <path d="M12 12.5V17" stroke="currentColor" strokeWidth="1.5"></path>
    </svg>
);

const SmartAnalyticsIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" strokeWidth="1.5" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor">
        <path d="M8.5 4H6C4.89543 4 4 4.89543 4 6V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V6C20 4.89543 19.1046 4 18 4H15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
        <path d="M8 6.4V4.5C8 4.22386 8.22386 4 8.5 4C8.77614 4 9.00422 3.77604 9.05152 3.50398C9.19968 2.65171 9.77399 1 12 1C14.226 1 14.8003 2.65171 14.9485 3.50398C14.9958 3.77604 15.2239 4 15.5 4C15.7761 4 16 4.22386 16 4.5V6.4C16 6.73137 15.7314 7 15.4 7H8.6C8.26863 7 8 6.73137 8 6.4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
    </svg>
);

const AutomatedBillingIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" strokeWidth="1.5" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor">
        <path d="M22 9V17C22 18.1046 21.1046 19 20 19H4C2.89543 19 2 18.1046 2 17V7C2 5.89543 2.89543 5 4 5H20C21.1046 5 22 5.89543 22 7V9ZM22 9H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
    </svg>
);

const LabResultsIcon = () => (
    <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor">
        <path d="M20 17.6073C21.4937 17.0221 23 15.6889 23 13C23 9 19.6667 8 18 8C18 6 18 2 12 2C6 2 6 6 6 8C4.33333 8 1 9 1 13C1 15.6889 2.50628 17.0221 4 17.6073" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M7.58059 19.4874L9.34836 21.2552C10.9105 22.8173 13.4431 22.8173 15.0052 21.2552L15.3588 20.9016" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M7.93413 21.9623L7.58058 19.4874L10.0554 19.841L7.93413 21.9623Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M16.2981 16.9016L14.5303 15.1339C12.9682 13.5718 10.4355 13.5718 8.87345 15.1339L8.51989 15.4874" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M15.9445 14.4268L16.2981 16.9017L13.8232 16.5481L15.9445 14.4268Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
    </svg>
);

const SecureDataIcon = () => (
    <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor">
        <path d="M16 12H17.4C17.7314 12 18 12.2686 18 12.6V19.4C18 19.7314 17.7314 20 17.4 20H6.6C6.26863 20 6 19.7314 6 19.4V12.6C6 12.2686 6.26863 12 6.6 12H8M16 12V8C16 6.66667 15.2 4 12 4C8.8 4 8 6.66667 8 8V12M16 12H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
    </svg>
);

const HIPAAIcon = () => (
    <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor">
        <path d="M16 12H17.4C17.7314 12 18 12.2686 18 12.6V19.4C18 19.7314 17.7314 20 17.4 20H6.6C6.26863 20 6 19.7314 6 19.4V12.6C6 12.2686 6.26863 12 6.6 12H8M16 12V8C16 6.66667 15.2 4 12 4C8.8 4 8 6.66667 8 8V12M16 12H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
    </svg>
);

const features: Feature[] = [
    {
        icon: <InteroperabilityIcon/>,
        title: "Interoperability",
        desc: "Connect with any health system for seamless data exchange."
    },
    {
        icon: <SmartAnalyticsIcon/>,
        title: "Smart Analytics",
        desc: "Turn raw clinical data into actionable insights with our AI powered dashboard."
    },
    {
        icon: <AutomatedBillingIcon/>,
        title: "Automated Billing",
        desc: "Smart claims engine that identifies coding errors before submission to maximize your reimbursement rates and minimize denials."
    },
    {
        icon: <LabResultsIcon/>,
        title: "Lab Results Sync",
        desc: "Real-time laboratory integrations with automatic flagging of abnormal values and longitudinal trend analysis for patient health."
    }, {
        icon: <SecureDataIcon/>,
        title: "Secure Data",
        desc: "Enterprise-grade security and full HIPAA compliance for patient data protection"


    }, {
        icon: <HIPAAIcon/>,
        title: "HIPAA Compliance",
        // desc: "Enterprise-grade security and full HIPAA compliance for patient data protection"
        desc: "Enterprise grade security protocols ensuring 100% HIPAA compliance and encrypted data storage across all systems."


    },
];

export default function FeaturesGrid() {
    return (
        <section id="features" className="py-16">
            <div className="mb-12">
                <h2 className="text-3xl font-bold tracking-tight mb-4">Core Capabilities</h2>
                <p className="text-slate-600 max-w-2xl">
                    Built to reduce burnout and improve patient outcomes through intelligent automation and intuitive design.
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {
                features.map((feature, idx) => (
                    <div key={idx}
                        className="group p-8 rounded-xl bg-white border border-slate-200 hover:border-blue-600/50 transition-all duration-300 shadow-sm hover:shadow-xl">
                        <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            {
                            typeof feature.icon === "string" ? (
                                <span className="material-symbols-outlined">
                                    {
                                    feature.icon
                                }</span>
                            ) : (feature.icon)
                        } </div>
                        <h3 className="text-xl font-bold mb-3">
                            {
                            feature.title
                        }</h3>
                        <p className="text-slate-600 leading-relaxed text-sm">
                            {
                            feature.desc
                        }</p>
                    </div>
                ))
            } </div>
        </section>
    );
}
