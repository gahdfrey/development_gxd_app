import Image from "next/image";

export default function SupportSection() {
    return (
        <section id="support" className="pb-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="flex items-center gap-3">
                    <span className="p-2 bg-blue-600/10 rounded-lg text-blue-600">
                        <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#507fdc" strokeWidth="1.5">
                            <path fillRule="evenodd" clipRule="evenodd" d="M1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.937 1.25 22.75 6.06293 22.75 12C22.75 17.937 17.937 22.75 12 22.75C10.1437 22.75 8.39536 22.2788 6.87016 21.4493L2.63727 22.2373C2.39422 22.2826 2.14448 22.2051 1.96967 22.0303C1.79485 21.8555 1.71742 21.6058 1.76267 21.3627L2.55076 17.1298C1.72113 15.6046 1.25 13.8563 1.25 12ZM7.25 10C7.25 9.58579 7.58579 9.25 8 9.25H12H16C16.4142 9.25 16.75 9.58579 16.75 10C16.75 10.4142 16.4142 10.75 16 10.75H12H8C7.58579 10.75 7.25 10.4142 7.25 10ZM8 13.25C7.58579 13.25 7.25 13.5858 7.25 14C7.25 14.4142 7.58579 14.75 8 14.75H10H12C12.4142 14.75 12.75 14.4142 12.75 14C12.75 13.5858 12.4142 13.25 12 13.25H10H8Z" fill="#507fdc"></path>

                        </svg>
                    </span>
                    <h2 className="text-slate-900 text-3xl font-extrabold tracking-tight">World-Class Support</h2>
                </div>
                <p className="text-slate-600 text-lg leading-relaxed">We&apos;re here when you need us most. Our dedicated clinical support team is available 24 hours a day, 7 days a week, ensuring your facility never skips a beat.</p>
                <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                        <div className="shrink-0 w-8 h-8 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center mt-1">
                            <span>
                                <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#135bec">
                                    <path d="M5 13L9 17L19 7" stroke="#135bec" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                </svg>
                            </span>
                        </div>


                        <span className="text-slate-700 font-medium">Average response time under 2 minutes</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <div className="shrink-0 w-8 h-8 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center mt-1">
                            <span>
                                <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#135bec">
                                    <path d="M5 13L9 17L19 7" stroke="#135bec" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                </svg>
                            </span>
                        </div>


                        <span className="text-slate-700 font-medium">1-on-1 implementation specialists</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <div className="shrink-0 w-8 h-8 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center mt-1">
                            <span>
                                <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#135bec">
                                    <path d="M5 13L9 17L19 7" stroke="#135bec" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                </svg>
                            </span>
                        </div>


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

                            <Image alt="Support Agent" className="absolute inset-0 w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-ToDsX6J4t5RxHmkOrEXYRn9bzdawZTptsK6IsCFxisHdutoFvTe_hPP_SLrP5MeJocRAzwXTH_rirMkUHHBimK9-C8-bvA7W10ynFXr283UnuQCbq80ppb3ggQprNHbMLcqWTg-ycKfUKlA9V0wuR-hQp9eKOf8mOwWd3YbZ_YcjT3gZ0e7EWsKeJcmCKwEGvBpXNnnN1e4Jt-_rZLZJGsTEmKOQhB3-Qxq8nBk-ybTH_R-1eOkRAWTS4_2PluKbK8JFEo9b-O4"
                                width={500}
                                height={500}/>
                        </div>
                        <div className="md:col-span-3 p-8 md:p-10 flex flex-col justify-center gap-6">
                            <div className="text-blue-600">
                                <svg width="54px" height="54px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#507fdc" strokeWidth="1.5">
                                    <path fillRule="evenodd" clipRule="evenodd" d="M9.21255 12.75C9.12943 13.5242 8.9054 14.1421 8.5147 14.6891C7.99181 15.4211 7.11571 16.1036 5.66459 16.8292C5.29411 17.0144 5.14394 17.4649 5.32918 17.8354C5.51442 18.2059 5.96493 18.3561 6.33541 18.1708C7.88429 17.3964 9.00819 16.5789 9.7353 15.5609C10.4761 14.5238 10.75 13.3571 10.75 12V7.5C10.75 6.53351 9.96649 5.75 9 5.75H5C4.03351 5.75 3.25 6.53351 3.25 7.5V11C3.25 11.9665 4.03352 12.75 5 12.75H9.21255Z" fill="#507fdc"></path>
                                    <path fillRule="evenodd" clipRule="evenodd" d="M19.2125 12.75C19.1294 13.5242 18.9054 14.1421 18.5147 14.6891C17.9918 15.4211 17.1157 16.1036 15.6646 16.8292C15.2941 17.0144 15.1439 17.4649 15.3292 17.8354C15.5144 18.2059 15.9649 18.3561 16.3354 18.1708C17.8843 17.3964 19.0082 16.5789 19.7353 15.5609C20.4761 14.5238 20.75 13.3571 20.75 12V7.5C20.75 6.53352 19.9665 5.75 19 5.75H15C14.0335 5.75 13.25 6.53351 13.25 7.5V11C13.25 11.9665 14.0335 12.75 15 12.75H19.2125Z" fill="#507fdc"></path>
                                </svg>

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
    );
}
