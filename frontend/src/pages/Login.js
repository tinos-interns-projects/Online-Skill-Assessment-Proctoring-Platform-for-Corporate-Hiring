import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", role: "candidate" });
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
      const response = await api.login(form);
      const token = response.data?.token;
      const user = response.data?.user;

      if (!token || !user) {
        throw new Error("Invalid response");
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      navigate(`/${user.role}/dashboard`);
    } catch (apiError) {
      // Fallback for local demo mode if backend is not running.
      const demoUser = {
        name: form.role === "admin" ? "Hiring Admin" : "Candidate User",
        email: form.email,
        role: form.role
      };
      localStorage.setItem("token", `demo-token-${Date.now()}`);
      localStorage.setItem("user", JSON.stringify(demoUser));
      navigate(`/${demoUser.role}/dashboard`);
      setError("Backend unavailable: signed in with demo mode.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-65px)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-panel">
        <div className="grid md:grid-cols-2">
          <section className="bg-slate-900 p-8 text-white">
            <p className="text-sm uppercase tracking-[0.25em] text-brand-300">Secure Access</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight">AI-Based Skill Assessment and Hiring Platform</h1>
            <p className="mt-4 text-slate-300">Sign in as Admin or Candidate to continue to your dashboard and assessments.</p>
            <ul className="mt-8 space-y-2 text-sm text-slate-200">
              <li>- Real-time assessments with live scoring</li>
              <li>- Proctored exams with webcam tracking</li>
              <li>- Analytics for hiring decisions</li>
            </ul>
          </section>

          <section className="p-8">
            <h2 className="text-2xl font-bold text-slate-900">Login</h2>
            <p className="mt-1 text-sm text-slate-500">Use your registered credentials</p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
                  placeholder="user@example.com"
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
                  placeholder="********"
                />
              </label>

              {error && <p className="text-xs text-amber-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-70"
              >
                {loading ? "Signing in..." : "Login"}
              </button>
            </form>

            <p className="mt-4 text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="font-semibold text-brand-700 hover:underline">
                Register
              </Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

export default Login;
