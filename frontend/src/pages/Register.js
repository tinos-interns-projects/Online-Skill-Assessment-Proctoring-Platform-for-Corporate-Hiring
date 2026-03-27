import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "candidate" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.register(form);
      const token = response.data?.token;
      const user = response.data?.user;

      localStorage.setItem("token", token || `demo-token-${Date.now()}`);
      localStorage.setItem("user", JSON.stringify(user || { name: form.name, email: form.email, role: form.role }));
      navigate(`/${(user?.role || form.role)}/dashboard`);
    } catch (apiError) {
      setError("Backend unavailable: account saved in demo mode.");
      localStorage.setItem("token", `demo-token-${Date.now()}`);
      localStorage.setItem("user", JSON.stringify({ name: form.name, email: form.email, role: form.role }));
      navigate(`/${form.role}/dashboard`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-65px)] max-w-xl items-center px-4 py-8">
      <section className="w-full rounded-2xl bg-white p-8 shadow-panel">
        <h1 className="text-3xl font-bold text-slate-900">Create Account</h1>
        <p className="mt-2 text-sm text-slate-500">Register as an admin or candidate to access the portal</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            Full Name
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={onChange}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-brand-500 focus:ring"
              placeholder="Your name"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Role
            <select
              name="role"
              value={form.role}
              onChange={onChange}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-brand-500 focus:ring"
            >
              <option value="candidate">Candidate</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-brand-500 focus:ring"
              placeholder="name@company.com"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={onChange}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-brand-500 focus:ring"
              placeholder="Create a strong password"
            />
          </label>

          {error && <p className="text-xs text-amber-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white transition hover:bg-slate-700 disabled:opacity-70"
          >
            {loading ? "Creating..." : "Register"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}

export default Register;
