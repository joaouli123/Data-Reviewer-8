
import { useState, useEffect } from 'react';
import Header from './Header';
import Hero from './Hero';
import VisionSection from './VisionSection';
import PainPoints from './PainPoints';
import Benefits from './Benefits';
import TargetAudience from './TargetAudience';
import SecuritySection from './SecuritySection';
import Modules from './Modules';
import Pricing from './Pricing';
import Guarantee from './Guarantee';
import FAQ from './FAQ';
import Footer from './Footer';

const WhatsAppFAB = () => (
  <a
    href="https://wa.me/5554996231432?text=Olá,%20gostaria%20saber%20mais%20informações%20sobre%20o%20sistema."
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-6 right-6 z-50 group transition-transform hover:scale-110 active:scale-95"
  >
    <div className="absolute -inset-2 bg-green-500 rounded-2xl blur-lg opacity-40 group-hover:opacity-60 transition duration-300"></div>
    <div className="relative w-16 h-16 bg-[#25D366] rounded-2xl shadow-2xl flex items-center justify-center">
      <svg viewBox="0 0 24 24" fill="white" className="w-9 h-9">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </div>
  </a>
);

const LandingPage = () => {
  const [showFloatingCTA, setShowFloatingCTA] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 500) {
        setShowFloatingCTA(true);
      } else {
        setShowFloatingCTA(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <VisionSection />
        <PainPoints />
        <Benefits />
        <TargetAudience />
        <SecuritySection />
        <Modules />
        <Guarantee />
        <FAQ />
      </main>
      <Footer />
      <WhatsAppFAB />
    </div>
  );
};

export default LandingPage;
