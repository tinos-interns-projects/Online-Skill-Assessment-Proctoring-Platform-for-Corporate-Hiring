import MarketingLayout from "../components/MarketingLayout.jsx";

const docs = [
  { title: "Platform Setup", description: "Create workspaces, invite teams, and configure secure hiring workflows." },
  { title: "Assessment Operations", description: "Build tests, assign candidates, monitor live sessions, and review submissions." },
  { title: "Reporting & Governance", description: "Analyze scorecards, review violations, and share results with stakeholders." }
];

function Documentation() {
  return (
    <MarketingLayout>
      <section className="px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pt-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Documentation</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Documentation for platform setup and assessment operations</h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Learn how to configure assessments, manage users, and interpret testing and monitoring data.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {docs.map((doc) => (
              <article key={doc.title} className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5">
                <h2 className="text-2xl font-bold text-slate-950">{doc.title}</h2>
                <p className="mt-4 leading-7 text-slate-600">{doc.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

export default Documentation;
