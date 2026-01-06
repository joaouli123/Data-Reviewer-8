
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
import FloatingCTA from './FloatingCTA';

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
    </div>
  );
};

export default LandingPage;
