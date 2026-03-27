import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    role: "employer",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    return form.name.trim() && form.company.trim() && form.email.trim() && form.password.length >= 6 && form.confirmPassword.length >= 6;
  }, [form]);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.email.includes("@")) {
      setError("Enter a valid work email address.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    navigate(form.role === "candidate" ? "/candidate" : "/employer");
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#ecfeff_0%,#eff6ff_45%,#ffffff_100%)] px-4 py-12">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-2xl shadow-slate-900/10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="bg-slate-950 p-10 text-white">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">SkillAssess Signup</p>
          <h1 className="mt-6 text-4xl font-black leading-tight">Create your assessment workspace in minutes</h1>
          <p className="mt-4 text-lg text-slate-300">
            Configure hiring assessments, online examinations, and learning programs from one secure dashboard.
          </p>
        </div>

        <div className="p-8 sm:p-10">
          <h2 className="text-3xl font-black text-slate-950">Sign Up</h2>
          <p className="mt-2 text-slate-600">Set up your account and launch your first evaluation flow</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white"
                placeholder="Maya Patel"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Company</label>
              <input
                value={form.company}
                onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white"
                placeholder="Northstar Labs"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Work Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white"
                placeholder="name@company.com"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Role</label>
              <select
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white"
              >
                <option value="employer">Employer</option>
                <option value="candidate">Candidate</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white"
                placeholder="Create password"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Confirm Password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white"
                placeholder="Confirm password"
              />
            </div>
            {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
            <button
              disabled={!canSubmit}
              className="w-full rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Create Account
            </button>
          </form>

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

export default Signup;
