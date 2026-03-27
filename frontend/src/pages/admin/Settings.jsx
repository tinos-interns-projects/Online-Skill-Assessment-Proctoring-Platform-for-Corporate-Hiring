function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Settings</p>
        <h2 className="mt-2 text-4xl font-black text-slate-950">Manage platform settings</h2>
      </div>

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Platform Name</label>
            <input defaultValue="SkillAssess" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Support Email</label>
            <input defaultValue="support@skillassess.ai" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Default Session Length</label>
            <input defaultValue="45 minutes" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Proctoring Mode</label>
            <input defaultValue="Strict" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white" />
          </div>
        </div>
        <button className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
          Save Settings
        </button>
      </section>
    </div>
  );
}

export default Settings;
