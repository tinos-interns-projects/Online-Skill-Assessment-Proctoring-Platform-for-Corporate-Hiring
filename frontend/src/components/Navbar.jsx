import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const navigationGroups = [
  {
    label: "Online Examinations",
    sectionId: "assessment-types",
    items: [
      { label: "Remote Proctoring", to: "/proctoring" },
      { label: "Coding Assessments", to: "/coding-assessment" },
      { label: "Aptitude Tests", to: "/aptitude-tests" },
      { label: "Technical Interviews", to: "/coding-assessment" }
    ]
  },
  {
    label: "Hiring & L&D",
    sectionId: "features",
    items: [
      { label: "Hiring Assessments", to: "/hiring" },
      { label: "Employee Skill Testing", to: "/skill-testing" },
      { label: "Campus Hiring", to: "/hiring" }
    ]
  },
  {
    label: "Test Library",
    sectionId: "assessment-types",
    items: [
      { label: "Programming Tests", to: "/coding-assessment" },
      { label: "Aptitude Tests", to: "/aptitude-tests" },
      { label: "Domain Tests", to: "/test-library" }
    ]
  },
  {
    label: "Pricing",
    sectionId: "pricing",
    items: [
      { label: "Platform Plans", to: "/pricing" },
      { label: "Enterprise Plans", to: "/pricing" }
    ]
  },
  {
    label: "Resources",
    sectionId: "contact",
    items: [
      { label: "Blog", to: "/resources/blog" },
      { label: "Case Studies", to: "/resources/blog" },
      { label: "Documentation", to: "/resources/docs" }
    ]
  }
];

function Navbar() {
  const [openMenu, setOpenMenu] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  const navigateToSection = (sectionId) => {
    setOpenMenu(null);

    if (location.pathname === "/") {
      const target = document.getElementById(sectionId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    navigate({ pathname: "/", hash: `#${sectionId}` });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/#hero" className="text-xl font-black tracking-tight text-slate-950">
          Skill<span className="text-emerald-600">Assess</span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {navigationGroups.map((group) => (
            <div
              key={group.label}
              className="relative"
              onMouseEnter={() => setOpenMenu(group.label)}
              onMouseLeave={() => setOpenMenu((current) => (current === group.label ? null : current))}
            >
              <button
                type="button"
                onClick={() => navigateToSection(group.sectionId)}
                onFocus={() => setOpenMenu(group.label)}
                className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
              >
                {group.label}
              </button>

              {openMenu === group.label ? (
                <div className="absolute left-0 top-full mt-3 w-64 rounded-[24px] border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/10">
                  {group.items.map((item) => (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={() => setOpenMenu(null)}
                      className="flex rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
            Login
          </Link>
          <Link
            to="/signup"
            className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600"
          >
            Request a Demo
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
