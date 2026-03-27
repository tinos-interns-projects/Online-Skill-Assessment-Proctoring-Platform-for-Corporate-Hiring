import { Link } from "react-router-dom";

function CTASection() {
  return (
    <section id="contact" className="pb-20 pt-6">
      <div id="trial" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[32px] bg-slate-950 px-6 py-14 text-center text-white shadow-2xl shadow-slate-900/20 sm:px-10">
          <h2 className="mx-auto max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
            Holistic Online Assessment Tools for Academic Institutes and Corporates
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300">
            Conduct Online Exams | Virtual Assessments | Hire and Develop Talent
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex rounded-full bg-emerald-500 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600"
            >
              Start Free Trial
            </Link>
            <Link
              to="/resources/docs"
              className="inline-flex rounded-full border border-white/20 bg-white/5 px-7 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Talk to Sales
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CTASection;
