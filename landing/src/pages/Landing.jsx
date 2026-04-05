import HeroSection from "../sections/HeroSection";
import ProblemSection from "../sections/ProblemSection";
import SolutionSection from "../sections/SolutionSection";
import HowItWorksSection from "../sections/HowItWorksSection";
import WhyDcpvasSection from "../sections/WhyDcpvasSection";
import ProofSection from "../sections/ProofSection";
import AiPreviewSection from "../sections/AiPreviewSection";
import StatsSection from "../sections/StatsSection";
import AudienceSection from "../sections/AudienceSection";
import TestimonialsSection from "../sections/TestimonialsSection";
import FinalCtaSection from "../sections/FinalCtaSection";
import FooterSection from "../sections/FooterSection";

export default function Landing() {
	return (
		<main className="min-h-screen bg-gradient-to-br from-[#0a0f1c] via-[#020617] to-[#020617] text-slate-100">
			<HeroSection />
			<ProblemSection />
			<SolutionSection />
			<HowItWorksSection />
			<WhyDcpvasSection />
			<ProofSection />
			<AiPreviewSection />
			<StatsSection />
			<AudienceSection />
			<TestimonialsSection />
			<FinalCtaSection />
			<FooterSection />
		</main>
	);
}
