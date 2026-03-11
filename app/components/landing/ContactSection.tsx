const faqs = [
    {
        q: "Is ModernEHR fully HIPAA compliant?",
        a: "Yes, we employ AES-256 encryption at rest and TLS 1.3 in transit. Our servers are SOC2 Type II certified and specifically hardened for PHI data."
    }, {
        q: "How long does data migration take?",
        a: "Our automated migration tools typically handle mid-sized practice data imports within 48-72 hours, including patient records and billing history."
    }, {
        q: "Do you provide training for staff?",
        a: "Every implementation comes with dedicated 1-on-1 onboarding and access to our 24/7 learning management system for your entire clinical team."
    },
];

const offices = [
    {
        city: "San Francisco, CA",
        address: "101 California St, Suite 400",
        zip: "San Francisco, CA 94111",
        img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAK7rKrWFfVanUbqFjFtNmTMg7ha-FnNFQ2Z0xV4LBTEzRsRNncEd6mY4HjJbMq5KIDimQkE28mHUNc_5D0JwIT2hg-28S2e8u3jvAg47VD9V3TD3ej0lw4LJJrii4UYWMhRGHidBK4yMpSSZKzXtMs3xXFBmrLk3UH7EqllqxySbBo58RA_WsLiGbPV-ZpJ0DFLyYNvkJ1TYpO_7KQTw0UXg7DV6RxKf77XzeldusyDBxj6M_EvbZ9N8X55eQQxDmRDDETmD1cmNE"
    }, {
        city: "Austin, TX",
        address: "500 W 2nd St, Suite 1900",
        zip: "Austin, TX 78701",
        img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBWLeFGOFperKr1vo53cjng786Stoi8EyB3-fF-IK__zI8qrdTdOnGINOGhFkSmGV4qcj66prnfYu1YZ_ZMGeQNEdWBWzJ97OLFrqIdTNdTaV9mh6uXiO90SYAEx4lDNiEmkvjQFYrpvsydhuQDybTb3oE_KQETMmk0XALen9y3E3TjHspIYfrvIiV0C0CK-jKI1bM9gNiaQAbTGoFk6Vus9icH6KDSOU1I_ieE5z44AK_qU5rOVeZMTZlkbAXKkunGQO24BXLZ6u4"
    },
];

export default function ContactSection() {
    return (
        <section id="contact" className="py-16 md:py-24">
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
                                <input className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all" placeholder="Jane" type="text"/>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold ml-1">Last Name</label>
                                <input className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all" placeholder="Smith" type="text"/>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold ml-1">Work Email</label>
                            <input className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all" placeholder="jane.smith@clinic.com" type="email"/>
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
                            <textarea className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all resize-none" placeholder="Tell us about your practice needs..."
                                rows={4}></textarea>
                        </div>
                        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2" type="submit">
                            <span>Send Message</span>
                            {/* <span className="material-symbols-outlined text-sm">send</span> */} </button>
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
                            <span>
                                <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#507fdc" strokeWidth="1.5">
                                    <path fillRule="evenodd" clipRule="evenodd" d="M1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.937 1.25 22.75 6.06293 22.75 12C22.75 17.937 17.937 22.75 12 22.75C10.1437 22.75 8.39536 22.2788 6.87016 21.4493L2.63727 22.2373C2.39422 22.2826 2.14448 22.2051 1.96967 22.0303C1.79485 21.8555 1.71742 21.6058 1.76267 21.3627L2.55076 17.1298C1.72113 15.6046 1.25 13.8563 1.25 12ZM10.3446 7.60313C10.0001 7.89541 9.75 8.34102 9.75 9.00001C9.75 9.41422 9.41421 9.75001 9 9.75001C8.58579 9.75001 8.25 9.41422 8.25 9.00001C8.25 7.90899 8.68736 7.04209 9.37414 6.45937C10.0446 5.89048 10.9119 5.625 11.75 5.625C12.5882 5.625 13.4554 5.89049 14.1259 6.45938C14.8126 7.0421 15.25 7.90899 15.25 9.00001C15.25 9.76589 15.0538 10.3495 14.7334 10.8301C14.4642 11.234 14.1143 11.5462 13.839 11.7919C13.8089 11.8187 13.7798 11.8447 13.7517 11.8699C13.4445 12.1464 13.213 12.3743 13.0433 12.6741C12.881 12.9609 12.75 13.3616 12.75 13.9999C12.75 14.4141 12.4142 14.7499 12 14.7499C11.5858 14.7499 11.25 14.4141 11.25 13.9999C11.25 13.1382 11.4315 12.4764 11.7379 11.9352C12.037 11.4069 12.4305 11.041 12.7483 10.755L12.8205 10.6901C13.1207 10.4204 13.3276 10.2347 13.4853 9.99803C13.6337 9.77553 13.75 9.48414 13.75 9.00001C13.75 8.34103 13.4999 7.89542 13.1554 7.60314C12.7946 7.29702 12.2868 7.125 11.75 7.125C11.2131 7.125 10.7054 7.29702 10.3446 7.60313ZM12.5672 18.501C12.8445 18.1933 12.8197 17.719 12.512 17.4418C12.2042 17.1646 11.73 17.1893 11.4528 17.497L11.4428 17.5081C11.1655 17.8159 11.1903 18.2901 11.498 18.5674C11.8058 18.8446 12.28 18.8199 12.5572 18.5121L12.5672 18.501Z" fill="#507fdc"></path>
                                </svg>
                            </span>

                            Common Questions
                        </h3>
                        <div className="space-y-4">
                            {
                            faqs.map((faq, idx) => (
                                <div key={idx}
                                    className="p-5 bg-white rounded-xl border border-slate-100">
                                    <h4 className="font-bold mb-2 flex justify-between items-center">
                                        {
                                        faq.q
                                    }
                                        {/* <span className="material-symbols-outlined text-slate-400">expand_more</span> */} </h4>
                                    <p className="text-sm text-slate-600">
                                        {
                                        faq.a
                                    }</p>
                                </div>
                            ))
                        } </div>
                    </div>

                    {/* Locations */}
                    <div>
                        <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                            {/* <span className="material-symbols-outlined text-blue-600">location_on</span> */}
                            <svg width="24px" height="24px" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#507fdc">
                                <path d="M20 10C20 14.4183 12 22 12 22C12 22 4 14.4183 4 10C4 5.58172 7.58172 2 12 2C16.4183 2 20 5.58172 20 10Z" stroke="#507fdc" strokeWidth="1.5"></path>
                                <path d="M12 11C12.5523 11 13 10.5523 13 10C13 9.44772 12.5523 9 12 9C11.4477 9 11 9.44772 11 10C11 10.5523 11.4477 11 12 11Z" fill="#507fdc" stroke="#507fdc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                            </svg>
                            Our Offices
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-6">
                            {
                            offices.map((office, idx) => (
                                <div key={idx}
                                    className="group cursor-pointer">
                                    <div className="h-40 bg-slate-200 rounded-xl mb-4 overflow-hidden relative">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                                            alt={
                                                office.city
                                            }
                                            src={
                                                office.img
                                            }/>
                                        <div className="absolute inset-0 bg-blue-600/10 group-hover:bg-transparent"></div>
                                    </div>
                                    <h5 className="font-bold">
                                        {
                                        office.city
                                    }</h5>
                                    <p className="text-sm text-slate-500">
                                        {
                                        office.address
                                    }<br/>{
                                        office.zip
                                    }</p>
                                </div>
                            ))
                        } </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
