import MarketingLayout from "../components/MarketingLayout.jsx";
import MarketingPageTemplate from "../components/MarketingPageTemplate.jsx";

const highlights = [
  { title: "Role-Based Challenges", description: "Launch frontend, backend, and full-stack coding tracks aligned to job families." },
  { title: "Structured Scoring", description: "Measure correctness, reasoning, and speed with consistent evaluation rules." },
  { title: "Hiring Insights", description: "Compare candidate readiness across cohorts with detailed score breakdowns." }
];

const metrics = [
  { label: "Coding sessions launched", value: "48K+", note: "Used across technical screening programs." },
  { label: "Average setup time", value: "15 min", note: "Create new assessments with reusable templates." },
  { label: "Skill libraries available", value: "250+", note: "Programming and framework-aligned coverage." }
];

function CodingAssessment() {
  return (
    <MarketingLayout>
      <MarketingPageTemplate
        eyebrow="Test Library"
        title="Coding assessments that mirror real technical hiring"
        description="Assess practical programming ability with scalable coding workflows, controlled environments, and transparent hiring signals."
        highlights={highlights}
        metrics={metrics}
        primaryCta={{ label: "Explore Test Library", to: "/test-library" }}
        secondaryCta={{ label: "Launch Assessment", to: "/signup" }}
      />
    </MarketingLayout>
  );
}

export default CodingAssessment;
