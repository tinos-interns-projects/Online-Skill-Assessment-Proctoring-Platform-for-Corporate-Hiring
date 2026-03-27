import MarketingLayout from "../components/MarketingLayout.jsx";

const posts = [
  { title: "How to scale secure hiring assessments", description: "Design a high-volume assessment funnel without sacrificing integrity or candidate experience." },
  { title: "Why proctoring data matters", description: "Use monitoring evidence to support fair review workflows and stronger compliance." },
  { title: "Building skill-first hiring programs", description: "Move from resume-first screening to evidence-based evaluation models." }
];

function Blog() {
  return (
    <MarketingLayout>
      <section className="px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pt-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Resources</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Insights for modern assessment and hiring teams</h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Explore strategy, playbooks, and case-study style content for assessment-led hiring programs.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {posts.map((post) => (
              <article key={post.title} className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5">
                <h2 className="text-2xl font-bold text-slate-950">{post.title}</h2>
                <p className="mt-4 leading-7 text-slate-600">{post.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

export default Blog;
