import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api.js";

function CandidateSignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    passoutYear: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return Object.values(form).every((value) => String(value).trim()) && form.password.length >= 6;
  }, [form]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await api.register({ ...form, role: "candidate" });
      localStorage.setItem("token", response.token || "mock-token-candidate");
      localStorage.setItem(
        "user",
        JSON.stringify(response.user || { name: form.fullName, email: form.email, role: "candidate" })
      );
      navigate("/candidate");
    } catch (submissionError) {
      setError("Unable to create candidate account right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#ecfeff_0%,#eff6ff_45%,#ffffff_100%)] px-4 py-12">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-2xl shadow-slate-900/10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="bg-slate-950 p-10 text-white">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Candidate Signup</p>
          <h1 className="mt-6 text-4xl font-black leading-tight">Create your candidate profile</h1>
          <p className="mt-4 text-lg text-slate-300">
            Register for skill assessments and secure proctored test sessions.
          </p>
        </div>

        <div className="p-8 sm:p-10">
          <h2 className="text-3xl font-black text-slate-950">Candidate Sign Up</h2>
          <p className="mt-2 text-slate-600">Fill in your candidate and login details to continue</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Name</label>
              <input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
              <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Phone Number</label>
              <input value={form.phoneNumber} onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Passout Year</label>
              <input value={form.passoutYear} onChange={(event) => setForm((current) => ({ ...current, passoutYear: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
              <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white" />
            </div>
            {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
            <button disabled={!canSubmit || submitting} className="w-full rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? "Creating Account..." : "Create Candidate Account"}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Link to="/signup" className="inline-flex text-sm font-semibold text-slate-500 transition hover:text-slate-900">Choose different role</Link>
            <Link to="/login" className="inline-flex text-sm font-semibold text-emerald-700 transition hover:text-emerald-800">Login instead</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CandidateSignup;
