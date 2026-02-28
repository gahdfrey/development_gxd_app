export default function LandingFooter() {
    return (
        <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
                    <div className="col-span-2 lg:col-span-2">
                        <div className="flex items-center gap-2 mb-6">
                            <h2 className="text-xl font-bold tracking-tight text-blue-600">
                                Care
                                <span className="text-black">Vault</span>
                            </h2>


                        </div>
                        <p className="text-slate-500 max-w-xs mb-6">
                            Redefining healthcare technology with intelligent clinical workflows and unparalleled security since 2018.
                        </p>
                        <div className="flex gap-4">
                            <a className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all" href="#">

                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM8.547 4.505a8.25 8.25 0 1 0 11.672 8.214l-.46-.46a2.252 2.252 0 0 1-.422-.586l-1.08-2.16a.414.414 0 0 0-.663-.107.827.827 0 0 1-.812.21l-1.273-.363a.89.89 0 0 0-.738 1.595l.587.39c.59.395.674 1.23.172 1.732l-.2.2c-.211.212-.33.498-.33.796v.41c0 .409-.11.809-.32 1.158l-1.315 2.191a2.11 2.11 0 0 1-1.81 1.025 1.055 1.055 0 0 1-1.055-1.055v-1.172c0-.92-.56-1.747-1.414-2.089l-.654-.261a2.25 2.25 0 0 1-1.384-2.46l.007-.042a2.25 2.25 0 0 1 .29-.787l.09-.15a2.25 2.25 0 0 1 2.37-1.048l1.178.236a1.125 1.125 0 0 0 1.302-.795l.208-.73a1.125 1.125 0 0 0-.578-1.315l-.665-.332-.091.091a2.25 2.25 0 0 1-1.591.659h-.18c-.249 0-.487.1-.662.274a.931.931 0 0 1-1.458-1.137l1.279-2.132Z" clipRule="evenodd"/>
                                </svg>


                            </a>
                            <a className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all" href="#">

                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                                    <path fillRule="evenodd" d="M15.75 4.5a3 3 0 1 1 .825 2.066l-8.421 4.679a3.002 3.002 0 0 1 0 1.51l8.421 4.679a3 3 0 1 1-.729 1.31l-8.421-4.678a3 3 0 1 1 0-4.132l8.421-4.679a3 3 0 0 1-.096-.755Z" clipRule="evenodd"/>
                                </svg>


                            </a>
                            <a className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all" href="#">

                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                                    <path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z"/>
                                    <path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z"/>
                                </svg>


                            </a>
                        </div>
                    </div>
                    <div>
                        <h6 className="font-bold mb-6">Product</h6>
                        <ul className="space-y-4 text-sm text-slate-500">
                            <li>
                                <a className="hover:text-blue-600 transition-colors" href="#">Telehealth</a>
                            </li>
                            <li>
                                <a className="hover:text-blue-600 transition-colors" href="#">Billing &amp; Claims</a>
                            </li>
                            <li>
                                <a className="hover:text-blue-600 transition-colors" href="#">Patient Portal</a>
                            </li>
                            <li>
                                <a className="hover:text-blue-600 transition-colors" href="#">E-Prescribing</a>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h6 className="font-bold mb-6">Compliance</h6>
                        <ul className="space-y-4 text-sm text-slate-500">
                            <li>
                                <a className="hover:text-blue-600 transition-colors" href="#">HIPAA Policy</a>
                            </li>
                            <li>
                                <a className="hover:text-blue-600 transition-colors" href="#">GDPR Info</a>
                            </li>
                            <li>
                                <a className="hover:text-blue-600 transition-colors" href="#">SOC2 Reports</a>
                            </li>
                            <li>
                                <a className="hover:text-blue-600 transition-colors" href="#">Data Privacy</a>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h6 className="font-bold mb-6">Company</h6>
                        <ul className="space-y-4 text-sm text-slate-500">
                            <li>
                                <a className="hover:text-blue-600 transition-colors" href="#">About Us</a>
                            </li>
                            <li>
                                <a className="hover:text-blue-600 transition-colors" href="#">Careers</a>
                            </li>
                            <li>
                                <a className="hover:text-blue-600 transition-colors" href="#">Contact</a>
                            </li>
                            <li>
                                <a className="hover:text-blue-600 transition-colors" href="#">Partners</a>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-slate-400">© {
                        new Date().getFullYear()
                    }
                        dleventh. All rights reserved.</p>
                    <div className="flex gap-8 text-xs font-medium text-slate-500">
                        <a className="hover:text-blue-600" href="#">Privacy Policy</a>
                        <a className="hover:text-blue-600" href="#">Terms of Service</a>
                        <a className="hover:text-blue-600" href="#">Cookie Policy</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
