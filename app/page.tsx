"use client";

import Navbar from "@/app/components/landing/Navbar";
import HeroSection from "@/app/components/landing/HeroSection";
import FeaturesGrid from "@/app/components/landing/FeaturesGrid";
import InteroperabilitySection from "@/app/components/landing/InteroperabilitySection";
import CTASection from "@/app/components/landing/CTASection";
import ImpactSection from "@/app/components/landing/ImpactSection";
import StatsSection from "@/app/components/landing/StatsSection";
import SupportSection from "@/app/components/landing/SupportSection";
import ContactSection from "@/app/components/landing/ContactSection";
import LandingFooter from "@/app/components/landing/LandingFooter";

export default function Home() {
  return (
    <div className="font-display bg-white text-slate-900 antialiased">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 lg:px-10">
        <HeroSection />
        <FeaturesGrid />
        <InteroperabilitySection />
        <CTASection />
        <ImpactSection />
        <StatsSection />
        <SupportSection />
        <ContactSection />
      </main>

      <LandingFooter />
    </div>
  );
}