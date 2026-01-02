
import { useState, useEffect } from 'react';
import Header from './landing/Header';
import Hero from './landing/Hero';
import PainPoints from './landing/PainPoints';
import Benefits from './landing/Benefits';
import Modules from './landing/Modules';
import Pricing from './landing/Pricing';
import Guarantee from './landing/Guarantee';
import FAQ from './landing/FAQ';
import Footer from './landing/Footer';
import FloatingCTA from './landing/FloatingCTA';

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
        <Pricing />
        <Guarantee />
        <FAQ />
      </main>
      <Footer />
      {showFloatingCTA && <FloatingCTA />}
    </div>
  );
};

export default LandingPage;
