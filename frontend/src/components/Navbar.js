import { Link, useLocation, useNavigate } from "react-router-dom";

const roleLabels = {
  admin: "Admin",
  candidate: "Candidate"
};

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to={token ? `/${user.role}/dashboard` : "/login"} className="text-lg font-bold text-slate-900">
          SkillSphere <span className="text-brand-600">AI</span>
        </Link>

        <div className="flex items-center gap-3">
          {token ? (
            <>
              <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase text-brand-700">
                {roleLabels[user.role] || "User"}
              </span>
              <span className="hidden text-sm text-slate-600 sm:block">{user.name || user.email}</span>
              <button
                onClick={logout}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Logout
              </button>
            </>
          ) : (
            location.pathname !== "/login" && (
              <Link to="/login" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                Sign In
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
