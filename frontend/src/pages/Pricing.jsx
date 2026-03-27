import MarketingLayout from "../components/MarketingLayout.jsx";

const plans = [
  { name: "Growth", price: "$299/mo", features: ["Assessment builder", "Candidate dashboards", "Standard analytics"] },
  { name: "Scale", price: "$799/mo", features: ["AI proctoring", "Bulk assignment", "Advanced reporting"] },
  { name: "Enterprise", price: "Custom", features: ["SSO", "Dedicated success", "Enterprise governance"] }
];

function Pricing() {
  return (
    <MarketingLayout>
      <section className="px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pt-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Pricing</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Plans built for secure, scalable assessment programs</h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Choose the plan that matches your hiring volume, governance requirements, and learning workflows.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.name} className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">{plan.name}</p>
                <p className="mt-5 text-4xl font-black text-slate-950">{plan.price}</p>
                <div className="mt-5 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

export default Pricing;
