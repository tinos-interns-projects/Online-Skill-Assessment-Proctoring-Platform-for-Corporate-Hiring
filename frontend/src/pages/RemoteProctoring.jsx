import MarketingLayout from "../components/MarketingLayout.jsx";
import MarketingPageTemplate from "../components/MarketingPageTemplate.jsx";

const highlights = [
  { title: "Identity Verification", description: "Authenticate candidates with pre-test checks and secure session launch workflows." },
  { title: "Live Monitoring", description: "Track tab switches, face detection, and session evidence with AI-assisted alerts." },
  { title: "Review Queue", description: "Escalate flagged sessions to human reviewers with complete event trails." }
];

const metrics = [
  { label: "Flagged events auto-captured", value: "98%", note: "Reduces manual invigilation overhead." },
  { label: "Average review time", value: "6 min", note: "Faster adjudication after every test window." },
  { label: "Supported assessment types", value: "12+", note: "Across aptitude, coding, and domain tracks." }
];

function RemoteProctoring() {
  return (
    <MarketingLayout>
      <MarketingPageTemplate
        eyebrow="Online Examinations"
        title="Remote proctoring for secure online examinations"
        description="Deliver high-stakes exams with identity checks, AI-assisted monitoring, browser controls, and evidence-backed review workflows."
        highlights={highlights}
        metrics={metrics}
        primaryCta={{ label: "Start Free Trial", to: "/signup" }}
        secondaryCta={{ label: "View Documentation", to: "/resources/docs" }}
      />
    </MarketingLayout>
  );
}

export default RemoteProctoring;
