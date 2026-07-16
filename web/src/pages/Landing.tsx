import { Hero } from '../components/Hero';
import { StatsBar } from '../components/StatsBar';
import { Vitrine } from '../components/Vitrine';
import { HowItWorks } from '../components/HowItWorks';
import { Footer } from '../components/Footer';

export default function Landing() {
  return (
    <>
      <Hero />
      <StatsBar />
      <Vitrine />
      <HowItWorks />
      <Footer />
    </>
  );
}
