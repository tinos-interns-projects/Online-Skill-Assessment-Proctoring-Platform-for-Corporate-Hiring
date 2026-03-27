import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", role: "admin" });
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => form.email.trim() && form.password.trim().length >= 6, [form.email, form.password]);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    localStorage.setItem("token", "demo-session-token");
    localStorage.setItem(
      "user",
      JSON.stringify({
        email: form.email,
        role: form.role
      })
    );

    setError("");
    navigate(`/${form.role}`);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#ecfeff_0%,#eff6ff_45%,#ffffff_100%)] px-4 py-12">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-2xl shadow-slate-900/10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="bg-slate-950 p-10 text-white">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">SkillAssess Access</p>
          <h1 className="mt-6 text-4xl font-black leading-tight">Secure login for admins, employers, and candidates</h1>
          <p className="mt-4 text-lg text-slate-300">
            Access online examinations, hiring analytics, and live proctoring sessions from one platform.
          </p>
        </div>

        <div className="p-8 sm:p-10">
          <h2 className="text-3xl font-black text-slate-950">Login</h2>
          <p className="mt-2 text-slate-600">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white"
                placeholder="name@company.com"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white"
                placeholder="Enter password"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Login As</label>
              <select
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white"
              >
                <option value="admin">Admin</option>
                <option value="employer">Employer</option>
                <option value="candidate">Candidate</option>
              </select>
            </div>
            {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
            <button
              disabled={!canSubmit}
              className="w-full rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Login
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Link to="/" className="inline-flex text-sm font-semibold text-slate-500 transition hover:text-slate-900">
              Back to landing page
            </Link>
            <Link to="/signup" className="inline-flex text-sm font-semibold text-emerald-700 transition hover:text-emerald-800">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
