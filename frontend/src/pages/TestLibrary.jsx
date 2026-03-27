import { Link } from "react-router-dom";
import MarketingLayout from "../components/MarketingLayout.jsx";

const categories = [
  { title: "Programming Tests", description: "Frontend, backend, SQL, and full-stack screening packs.", to: "/coding-assessment" },
  { title: "Aptitude Tests", description: "Reasoning, analytical, and verbal aptitude libraries for bulk screening.", to: "/aptitude-tests" },
  { title: "Domain Tests", description: "Role-specific question sets for analytics, support, and product functions.", to: "/hiring" }
];

function TestLibrary() {
  return (
    <MarketingLayout>
      <section className="px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pt-20">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-2xl shadow-slate-900/10 sm:p-10">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Test Library</p>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Ready-made assessment libraries for every evaluation use case</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              Browse reusable test categories and launch structured assessment flows using the same secure platform experience.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {categories.map((category) => (
              <article key={category.title} className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5">
                <h2 className="text-2xl font-bold text-slate-950">{category.title}</h2>
                <p className="mt-4 leading-7 text-slate-600">{category.description}</p>
                <Link to={category.to} className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Open Category
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

export default TestLibrary;
