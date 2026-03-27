import { NavLink } from "react-router-dom";

const candidateLinks = [
  { label: "Dashboard", to: "/candidate/dashboard" },
  { label: "Assessment", to: "/candidate/assessment/1" },
  { label: "Results", to: "/candidate/results" }
];

const adminLinks = [
  { label: "Dashboard", to: "/admin/dashboard" },
  { label: "Create Assessment", to: "/admin/create-assessment" },
  { label: "Analytics", to: "/admin/analytics" }
];

function Sidebar({ role }) {
  const links = role === "admin" ? adminLinks : candidateLinks;

  return (
    <aside className="h-full min-h-[calc(100vh-65px)] w-full border-r border-slate-200 bg-white lg:w-72">
      <div className="p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Navigation</p>
        <nav className="space-y-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `block rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  isActive ? "bg-brand-600 text-white" : "text-slate-700 hover:bg-slate-100"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}

export default Sidebar;
