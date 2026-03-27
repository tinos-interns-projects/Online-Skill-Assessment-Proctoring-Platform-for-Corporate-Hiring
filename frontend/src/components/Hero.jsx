function scrollToSection(targetId) {
  const target = document.getElementById(targetId);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-16 mx-auto h-72 max-w-5xl rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 text-center sm:px-6 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="mx-auto max-w-3xl">
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-4 py-1 text-sm font-semibold text-emerald-700 shadow-sm">
            AI-Powered Assessment and Proctoring
          </span>
          <h1 className="mt-8 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Online Skill Assessment Platform
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
            Conduct customized online assessments with secure AI-based proctoring and analytics.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={() => scrollToSection("contact")}
              className="rounded-full bg-slate-950 px-7 py-3 text-sm font-semibold text-white shadow-xl shadow-slate-950/20 transition hover:bg-slate-800"
            >
              Get a Free Trial
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("features")}
              className="rounded-full border border-slate-300 bg-white px-7 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            >
              Explore Features
            </button>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-[28px] border border-white/70 bg-white/90 p-7 text-left shadow-2xl shadow-slate-900/10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                Live Session
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                React + Aptitude Assessment
              </span>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Candidates Monitored</p>
                <p className="mt-2 text-3xl font-black text-slate-950">1,280+</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Fraud Alerts</p>
                <p className="mt-2 text-3xl font-black text-slate-950">Real-time</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Completion Rate</p>
                <p className="mt-2 text-3xl font-black text-slate-950">94%</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] bg-slate-950 p-7 text-left text-white shadow-2xl shadow-slate-900/20">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-300">Platform Snapshot</p>
            <div className="mt-7 space-y-5">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-slate-300">Proctoring Confidence</p>
                <div className="mt-3 h-2 rounded-full bg-white/10">
                  <div className="h-2 w-[88%] rounded-full bg-emerald-400" />
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-slate-300">Assessment Customization</p>
                <div className="mt-3 h-2 rounded-full bg-white/10">
                  <div className="h-2 w-[92%] rounded-full bg-sky-400" />
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-slate-300">Hiring Insight Depth</p>
                <div className="mt-3 h-2 rounded-full bg-white/10">
                  <div className="h-2 w-[84%] rounded-full bg-cyan-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
