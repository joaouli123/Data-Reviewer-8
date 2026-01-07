
import { useState, useEffect } from 'react';
import Header from './Header';
import Hero from './Hero';
import PainPoints from './PainPoints';
import Benefits from './Benefits';
import Modules from './Modules';
import Pricing from './Pricing';
import Guarantee from './Guarantee';
import FAQ from './FAQ';
import Footer from './Footer';

import LogoWhatsapp from '@assets/image_1767816007481.png';

const WhatsAppFAB = () => (
  <a
    href="https://wa.me/5554996231432?text=Olá,%20gostaria%20de%20saber%20o%20valor!"
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-6 right-6 z-50 group transition-transform hover:scale-110 active:scale-95"
  >
    <div className="absolute -inset-2 bg-green-500 rounded-2xl blur-lg opacity-40 group-hover:opacity-60 transition duration-300"></div>
    <img 
      src={LogoWhatsapp} 
      alt="WhatsApp" 
      className="relative w-16 h-16 shadow-2xl rounded-2xl object-contain"
    />
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
        <PainPoints />
        <Benefits />
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
