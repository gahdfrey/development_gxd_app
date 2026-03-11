export default function ImpactSection() {
  return (
    <section id="impact" className="py-12 mb-16">
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
  );
}
