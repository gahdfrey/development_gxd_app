import {ReactNode} from "react";

interface Stat {
    label: string;
    value: string;
    icon: ReactNode;

    trend: string;
    trendLabel: string;
    trendIcon?: ReactNode;
}

const TrendingUpIcon = () => (
    <svg width="16" height="16" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#16a34a">
        <path d="M20 20H4V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M4 16.5L12 9L15 12L19.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
    </svg>
);

const CheckmarkIcon = () => (
    <svg width="16" height="16" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#16a34a">
        <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
    </svg>
);

const GroupsIcon = () => (
    <svg width="24px" height="24px" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#747d73">
        <path d="M1 20V19C1 15.134 4.13401 12 8 12V12C11.866 12 15 15.134 15 19V20" stroke="#747d73" strokeWidth="1.5" strokeLinecap="round"></path>
        <path d="M13 14V14C13 11.2386 15.2386 9 18 9V9C20.7614 9 23 11.2386 23 14V14.5" stroke="#747d73" strokeWidth="1.5" strokeLinecap="round"></path>
        <path d="M8 12C10.2091 12 12 10.2091 12 8C12 5.79086 10.2091 4 8 4C5.79086 4 4 5.79086 4 8C4 10.2091 5.79086 12 8 12Z" stroke="#747d73" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M18 9C19.6569 9 21 7.65685 21 6C21 4.34315 19.6569 3 18 3C16.3431 3 15 4.34315 15 6C15 7.65685 16.3431 9 18 9Z" stroke="#747d73" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
    </svg>
);

const MedicalServicesIcon = () => (
    <svg width="24px" height="24px" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#747d73">
        <path d="M6.4 8C6.73137 8 7 7.73137 7 7.4V3.6C7 3.26863 7.26863 3 7.6 3H16.4C16.7314 3 17 3.26863 17 3.6V7.4C17 7.73137 17.2686 8 17.6 8H19.4C19.7314 8 20 8.26863 20 8.6V20.4C20 20.7314 19.7314 21 19.4 21H4.6C4.26863 21 4 20.7314 4 20.4V8.6C4 8.26863 4.26863 8 4.6 8H6.4Z" stroke="#747d73" strokeWidth="1.5"></path>
        <path d="M9.99219 8H11.9922M13.9922 8H11.9922M11.9922 8V6M11.9922 8V10" stroke="#747d73" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M16 17.01L16.01 16.9989" stroke="#747d73" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M16 13.01L16.01 12.9989" stroke="#747d73" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M12 13.01L12.01 12.9989" stroke="#747d73" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M8 13.01L8.01 12.9989" stroke="#747d73" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M8 17.01L8.01 16.9989" stroke="#747d73" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M12 17.01L12.01 16.9989" stroke="#747d73" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
    </svg>
);

const SystemUptimeIcon = () => (
    <svg width="24px" height="24px" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#747d73">
        <path d="M12 4L12 8" stroke="#747d73" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M4 8L6.5 10.5" stroke="#747d73" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M17.5 10.5L20 8" stroke="#747d73" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M3 17H6" stroke="#747d73" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M12 17L13 11" stroke="#747d73" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M18 17H21" stroke="#747d73" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M8.5 20.001H4C2.74418 18.3295 2 16.2516 2 14C2 8.47715 6.47715 4 12 4C17.5228 4 22 8.47715 22 14C22 16.2516 21.2558 18.3295 20 20.001L15.5 20" stroke="#747d73" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M12 23C13.6569 23 15 21.6569 15 20C15 18.3431 13.6569 17 12 17C10.3431 17 9 18.3431 9 20C9 21.6569 10.3431 23 12 23Z" stroke="#747d73" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
    </svg>

);

const stats: Stat[] = [
    {
        label: "Clinics Served",
        value: "5,000+",
        icon: <MedicalServicesIcon/>,
        trend: "15%",
        trendLabel: "Growth this year",
        trendIcon: <TrendingUpIcon/>}, {
        label: "Patients Managed",
        value: "10M+",
        icon: <GroupsIcon/>,
        trend: "22%",
        trendLabel: "Active patient records",
        trendIcon: <TrendingUpIcon/>}, {
        label: "System Uptime",
        value: "99.9%",
        icon: <SystemUptimeIcon/>,
        trend: "+0.01%",
        trendLabel: "Industry leading SLA",
        trendIcon: <CheckmarkIcon/>},
];

export default function StatsSection() {
    return (
        <section className="mb-20">
            <div className="flex items-center gap-3 mb-8">
                <h2 className="text-slate-900 text-3xl font-extrabold tracking-tight">Impact by the Numbers</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {
                stats.map((stat, idx) => (
                    <div key={idx}
                        className="group flex flex-col gap-4 rounded-xl p-8 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all border-b-4 border-b-blue-600">
                        <div className="flex items-center justify-between">
                            <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">
                                {
                                stat.label
                            }</p>
                            <span className="material-symbols-outlined text-blue-600/40 group-hover:text-blue-600 transition-colors">
                                {
                                stat.icon
                            }</span>
                        </div>
                        <p className="text-slate-900 text-5xl font-black tracking-tight">
                            {
                            stat.value
                        }</p>
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-emerald-600 font-bold text-sm bg-emerald-50 px-2 py-0.5 rounded">
                                {
                                stat.trendIcon
                            }
                                {
                                stat.trend
                            } </span>
                            <span className="text-slate-400 text-xs">
                                {
                                stat.trendLabel
                            }</span>
                        </div>
                    </div>
                ))
            } </div>
        </section>
    );
}
