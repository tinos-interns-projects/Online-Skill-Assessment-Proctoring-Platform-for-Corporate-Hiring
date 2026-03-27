import MarketingLayout from "../components/MarketingLayout.jsx";
import MarketingPageTemplate from "../components/MarketingPageTemplate.jsx";

const highlights = [
  { title: "Workflow Automation", description: "Create screening funnels, auto-assign tests, and streamline recruiter handoffs." },
  { title: "Role Readiness", description: "Blend aptitude, coding, and domain questions into structured hiring stages." },
  { title: "Decision Support", description: "Share scorecards and shortlist recommendations with hiring managers instantly." }
];

const metrics = [
  { label: "Hiring teams onboarded", value: "1,200+", note: "From startups to enterprise TA functions." },
  { label: "Average screening cost saved", value: "42%", note: "Through automated assessments and reduced interviews." },
  { label: "Time to shortlist", value: "24 hrs", note: "For most standard hiring campaigns." }
];

function HiringAssessments() {
  return (
    <MarketingLayout>
      <MarketingPageTemplate
        eyebrow="Hiring & L&D"
        title="Hiring assessments that speed up confident decisions"
        description="Build predictable screening programs with structured assessments, quality signals, and recruiter-ready insights."
        highlights={highlights}
        metrics={metrics}
        primaryCta={{ label: "Create Workspace", to: "/signup" }}
        secondaryCta={{ label: "Read Documentation", to: "/resources/docs" }}
      />
    </MarketingLayout>
  );
}

export default HiringAssessments;
