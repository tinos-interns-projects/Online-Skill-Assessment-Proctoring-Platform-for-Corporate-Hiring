import MarketingLayout from "../components/MarketingLayout.jsx";
import MarketingPageTemplate from "../components/MarketingPageTemplate.jsx";

const highlights = [
  { title: "Standardized Benchmarks", description: "Screen reasoning, quantitative aptitude, and verbal ability with trusted benchmarks." },
  { title: "Custom Blueprints", description: "Blend aptitude modules with role-specific questions for tailored evaluation." },
  { title: "Fast Shortlisting", description: "Sort candidates by score, percentile, and assessment readiness in one queue." }
];

const metrics = [
  { label: "Aptitude questions available", value: "5K+", note: "Across quantitative, logical, and verbal modules." },
  { label: "Completion rate", value: "93%", note: "Designed for a smooth candidate experience." },
  { label: "Shortlisting speed", value: "3x", note: "Compared with manual screening flows." }
];

function AptitudeTests() {
  return (
    <MarketingLayout>
      <MarketingPageTemplate
        eyebrow="Online Examinations"
        title="Aptitude tests for scalable screening programs"
        description="Run ready-to-launch aptitude assessments that support campus hiring, bulk screening, and operational role evaluations."
        highlights={highlights}
        metrics={metrics}
        primaryCta={{ label: "Request Demo", to: "/signup" }}
        secondaryCta={{ label: "See Pricing", to: "/pricing" }}
      />
    </MarketingLayout>
  );
}

export default AptitudeTests;
