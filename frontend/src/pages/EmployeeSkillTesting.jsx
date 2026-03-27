import MarketingLayout from "../components/MarketingLayout.jsx";
import MarketingPageTemplate from "../components/MarketingPageTemplate.jsx";

const highlights = [
  { title: "Skill Gap Mapping", description: "Identify capability gaps across functional teams using benchmark-driven assessments." },
  { title: "Upskilling Journeys", description: "Assign recurring tests and monitor learner readiness over time." },
  { title: "Progress Reporting", description: "Share employee growth signals with managers and L&D stakeholders." }
];

const metrics = [
  { label: "Employees benchmarked", value: "85K+", note: "Across tech, sales, and operations teams." },
  { label: "Programs automated", value: "430+", note: "Learning and certification initiatives deployed." },
  { label: "Reporting turnaround", value: "Same day", note: "Actionable scorecards after every cohort." }
];

function EmployeeSkillTesting() {
  return (
    <MarketingLayout>
      <MarketingPageTemplate
        eyebrow="Hiring & L&D"
        title="Employee skill testing for continuous development"
        description="Benchmark workforce capability, assign skill tracks, and measure readiness improvements with a single assessment platform."
        highlights={highlights}
        metrics={metrics}
        primaryCta={{ label: "Start Skill Program", to: "/signup" }}
        secondaryCta={{ label: "Explore Blog", to: "/resources/blog" }}
      />
    </MarketingLayout>
  );
}

export default EmployeeSkillTesting;
