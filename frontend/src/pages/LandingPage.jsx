import { Link } from "react-router-dom";
import MarketingLayout from "../components/MarketingLayout.jsx";
import Hero from "../components/Hero.jsx";
import Features from "../components/Features.jsx";
import CTASection from "../components/CTASection.jsx";

const snapshotCards = [
  { label: "Assessments delivered", value: "250K+", note: "Across hiring, certification, and learning use cases." },
  { label: "Live monitoring coverage", value: "99.2%", note: "AI-assisted session review with evidence capture." },
  { label: "Time to deploy", value: "2 days", note: "Reusable libraries and templates accelerate launches." }
];

const assessmentTypes = [
  { title: "Remote Proctoring", description: "Enable browser-based monitoring, identity checks, and violation tracking for secure high-stakes testing.", to: "/proctoring" },
  { title: "Coding Assessments", description: "Evaluate practical programming skills with role-based question sets and auto-evaluation workflows.", to: "/coding-assessment" },
  { title: "Aptitude Tests", description: "Measure reasoning, quantitative aptitude, and communication readiness with standardized test libraries.", to: "/aptitude-tests" }
];

const pricingPlans = [
  { name: "Growth", price: "$299/mo", note: "For growing teams running structured screening and campus drives." },
  { name: "Scale", price: "$799/mo", note: "For enterprise hiring teams with proctoring, analytics, and integrations." },
  { name: "Enterprise", price: "Custom", note: "For large programs needing governance, SSO, and dedicated success support." }
];

function LandingPage() {
  return (
    <MarketingLayout>
      <Hero />
      <Features />

      <section id="snapshot" className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[32px] bg-slate-950 p-8 text-white shadow-2xl shadow-slate-900/20 sm:p-10">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Platform Snapshot</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Operate a complete assessment lifecycle from one workspace</h2>
              <p className="mt-4 text-lg text-slate-300">
                Monitor candidate sessions, launch new assessments, and track outcome quality without leaving the same platform.
              </p>
            </div>
            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              {snapshotCards.map((card) => (
                <div key={card.label} className="rounded-[28px] bg-white/10 p-6">
                  <p className="text-sm text-slate-300">{card.label}</p>
                  <p className="mt-3 text-3xl font-black text-white">{card.value}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{card.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="assessment-types" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Assessment Types</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Choose the right evaluation flow for hiring, learning, and certification programs
            </h2>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {assessmentTypes.map((item) => (
              <article key={item.title} className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5">
                <h3 className="text-2xl font-bold text-slate-950">{item.title}</h3>
                <p className="mt-4 leading-7 text-slate-600">{item.description}</p>
                <Link to={item.to} className="mt-6 inline-flex rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950">
                  Explore
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="pb-20 pt-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Pricing</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Flexible plans for startups, hiring teams, and enterprise assessment programs
            </h2>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div key={plan.name} className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">{plan.name}</p>
                <p className="mt-5 text-4xl font-black text-slate-950">{plan.price}</p>
                <p className="mt-4 leading-7 text-slate-600">{plan.note}</p>
                <Link to="/pricing" className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                  View Plan
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </MarketingLayout>
  );
}

export default LandingPage;
