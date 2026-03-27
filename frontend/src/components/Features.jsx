const features = [
  {
    title: "AI Proctoring",
    description: "Secure webcam monitoring, tab-switch detection, and cheating alerts."
  },
  {
    title: "Custom Assessments",
    description: "Create job-specific assessments and test blueprints."
  },
  {
    title: "Analytics Dashboard",
    description: "View candidate performance reports and hiring insights."
  }
];

function Features() {
  return (
    <section id="features" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Core Features</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Build secure, scalable assessments with enterprise-ready workflows
          </h2>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="group rounded-[28px] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 transition hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white">
                0{index + 1}
              </div>
              <h3 className="mt-6 text-2xl font-bold text-slate-950">{feature.title}</h3>
              <p className="mt-4 leading-7 text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;
