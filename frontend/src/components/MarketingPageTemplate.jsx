import { Link } from "react-router-dom";

function MarketingPageTemplate({ eyebrow, title, description, highlights, metrics, primaryCta, secondaryCta }) {
  return (
    <section className="px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pt-20">
      <div className="mx-auto max-w-7xl space-y-10">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-2xl shadow-slate-900/10 sm:p-10">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">{eyebrow}</p>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{title}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">{description}</p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              {primaryCta ? (
                <Link to={primaryCta.to} className="rounded-full bg-slate-950 px-7 py-3 text-sm font-semibold text-white shadow-xl shadow-slate-950/20 transition hover:bg-slate-800">
                  {primaryCta.label}
                </Link>
              ) : null}
              {secondaryCta ? (
                <Link to={secondaryCta.to} className="rounded-full border border-slate-300 bg-white px-7 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950">
                  {secondaryCta.label}
                </Link>
              ) : null}
            </div>
          </div>

          <div className="rounded-[32px] bg-slate-950 p-8 text-white shadow-2xl shadow-slate-900/20 sm:p-10">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Platform Outcomes</p>
            <div className="mt-7 space-y-4">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl bg-white/10 p-4">
                  <p className="text-sm text-slate-300">{metric.label}</p>
                  <p className="mt-3 text-3xl font-black text-white">{metric.value}</p>
                  <p className="mt-2 text-sm text-slate-300">{metric.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {highlights.map((item, index) => (
            <article key={item.title} className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white">
                0{index + 1}
              </div>
              <h2 className="mt-6 text-2xl font-bold text-slate-950">{item.title}</h2>
              <p className="mt-4 leading-7 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default MarketingPageTemplate;
