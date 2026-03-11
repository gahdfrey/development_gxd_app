import Link from "next/link";

export default function Navbar() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-6 lg:px-10 flex h-16 items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold tracking-tight text-blue-600">Care<span className="text-black">Vault</span>
                    </h2>
                </div>
                <nav className="hidden md:flex items-center gap-8">
                    <a className="text-sm font-semibold hover:text-blue-600 transition-colors" href="#features">Features</a>
                    <a className="text-sm font-semibold hover:text-blue-600 transition-colors" href="#impact">Solutions</a>
                    <a className="text-sm font-semibold hover:text-blue-600 transition-colors" href="#support">Support</a>
                    <a className="text-sm font-semibold hover:text-blue-600 transition-colors" href="#contact">Contact</a>
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
    );
}
