import { useEffect, useState } from "react";
import { getAnalytics, getAssessments, getCandidates, getResults } from "../../services/api.js";

function Dashboard() {
  const [stats, setStats] = useState([]);
  const [analytics, setAnalytics] = useState({ sectionScores: [] });
  const [monitoring, setMonitoring] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [assessments, candidates, results, analyticsData] = await Promise.all([
          getAssessments(),
          getCandidates(),
          getResults(),
          getAnalytics()
        ]);

        setStats([
          { label: "Assessments", value: assessments.length, change: "Loaded from backend" },
          { label: "Candidates", value: candidates.length, change: "Live directory" },
          { label: "Results", value: results.length, change: "Completed attempts" },
          { label: "Skill Areas", value: analyticsData.sectionScores?.length || 0, change: "Analytics summary" }
        ]);
        setAnalytics(analyticsData || { sectionScores: [] });
        setMonitoring((assessments || []).slice(0, 4).map((item) => ({ id: item.id, name: item.title, blueprint: item.skill, candidates: results.filter((result) => result.title === item.title).length, status: results.some((result) => result.title === item.title) ? "Live" : "Scheduled" })));
      } catch (error) {
        setStats([]);
        setAnalytics({ sectionScores: [] });
        setMonitoring([]);
      }
    };

    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Dashboard</p>
        <h2 className="mt-2 text-4xl font-black text-slate-950">System analytics and platform health</h2>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="rounded-[24px] bg-white p-6 shadow-lg shadow-slate-900/5">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{item.value}</p>
            <p className="mt-2 text-sm text-slate-500">{item.change}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
          <h3 className="text-2xl font-bold text-slate-950">Platform Analytics</h3>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-5"><p className="text-sm text-slate-500">Completion Signals</p><p className="mt-2 text-3xl font-black text-slate-950">{analytics.total_attempts || 0}</p></div>
            <div className="rounded-2xl bg-slate-50 p-5"><p className="text-sm text-slate-500">Average Skills Tracked</p><p className="mt-2 text-3xl font-black text-slate-950">{analytics.sectionScores?.length || 0}</p></div>
            <div className="rounded-2xl bg-slate-50 p-5"><p className="text-sm text-slate-500">Top Candidate Score</p><p className="mt-2 text-3xl font-black text-slate-950">{analytics.rankings?.[0]?.score || 0}%</p></div>
            <div className="rounded-2xl bg-slate-50 p-5"><p className="text-sm text-slate-500">Trend Points</p><p className="mt-2 text-3xl font-black text-slate-950">{analytics.trend?.length || 0}</p></div>
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
          <h3 className="text-2xl font-bold text-slate-950">Assessment Monitoring</h3>
          <div className="mt-6 space-y-4">
            {monitoring.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">{item.name}</p>
                <p className="mt-1 text-sm text-slate-500">{item.blueprint}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                  <span>{item.candidates} candidates</span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
