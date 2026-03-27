import { Link, NavLink, Outlet } from "react-router-dom";

const navigationItems = [
  { label: "Dashboard", to: "/admin" },
  { label: "Employers", to: "/admin/employers" },
  { label: "Candidates", to: "/admin/candidates" },
  { label: "Assessments", to: "/admin/assessments" },
  { label: "Reports", to: "/admin/reports" },
  { label: "Settings", to: "/admin/settings" }
];

function AdminDashboard() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Admin Workspace</p>
          <h1 className="mt-3 text-3xl font-black text-slate-950">Platform Control</h1>
          <div className="mt-6 space-y-3">
            {navigationItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.to === "/admin"}
                className="flex rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/" className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700">
              Back to Home
            </Link>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.href = "/login";
              }}
              className="rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white"
            >
              Logout
            </button>
          </div>
        </aside>

        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  );
}

export default AdminDashboard;
