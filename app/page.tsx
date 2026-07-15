"use client";

import Navbar from "@/app/components/landing/Navbar";
import HeroSection from "@/app/components/landing/HeroSection";
import FeaturesGrid from "@/app/components/landing/FeaturesGrid";
import InteroperabilitySection from "@/app/components/landing/InteroperabilitySection";
import StatsSection from "@/app/components/landing/StatsSection";
import SupportSection from "@/app/components/landing/SupportSection";
import ContactSection from "@/app/components/landing/ContactSection";
import CTASection from "@/app/components/landing/CTASection";
import LandingFooter from "@/app/components/landing/LandingFooter";
import WhatsAppWidget from "@/app/components/landing/WhatsAppWidget";

export default function Home() {
  return (
    <div className="bg-white text-slate-900 antialiased [scroll-behavior:smooth]">
      <Navbar />

      <main>
        <HeroSection />
        <FeaturesGrid />
        <InteroperabilitySection />
        <StatsSection />
        <SupportSection />
        <ContactSection />
        <CTASection />
      </main>

      <LandingFooter />
      <WhatsAppWidget />
    </div>
  );
}
