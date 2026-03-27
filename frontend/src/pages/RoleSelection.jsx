import { Link } from "react-router-dom";

function RoleSelection() {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#ecfeff_0%,#eff6ff_45%,#ffffff_100%)] px-4 py-12">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-2xl shadow-slate-900/10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="bg-slate-950 p-10 text-white">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">SkillAssess Signup</p>
          <h1 className="mt-6 text-4xl font-black leading-tight">Choose your role to continue</h1>
          <p className="mt-4 text-lg text-slate-300">
            Select the right onboarding flow for exam preparation or assessment management.
          </p>
        </div>

        <div className="p-8 sm:p-10">
          <h2 className="text-3xl font-black text-slate-950">Role Selection</h2>
          <p className="mt-2 text-slate-600">Choose whether you are signing up as a candidate or an employer</p>

          <div className="mt-8 grid gap-5">
            <Link to="/signup/candidate" className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 transition hover:-translate-y-1 hover:shadow-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Candidate</p>
              <h3 className="mt-4 text-2xl font-bold text-slate-950">Prepare for assessments and start tests</h3>
              <p className="mt-3 text-slate-600">Access tests, learning videos, and score reports from your candidate workspace.</p>
            </Link>
            <Link to="/signup/employer" className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 transition hover:-translate-y-1 hover:shadow-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Employer</p>
              <h3 className="mt-4 text-2xl font-bold text-slate-950">Create assessments and monitor candidates</h3>
              <p className="mt-3 text-slate-600">Launch hiring workflows, assign tests, and review outcomes in your employer dashboard.</p>
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Link to="/login" className="inline-flex text-sm font-semibold text-slate-500 transition hover:text-slate-900">
              Already have an account?
            </Link>
            <Link to="/" className="inline-flex text-sm font-semibold text-emerald-700 transition hover:text-emerald-800">
              Back to landing page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoleSelection;
