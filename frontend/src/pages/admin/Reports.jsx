import { useEffect, useState } from "react";
import { getAnalytics, getResults } from "../../services/api.js";

function Reports() {
  const [analytics, setAnalytics] = useState({ rankings: [], sectionScores: [], trend: [], total_attempts: 0 });
  const [results, setResults] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [analyticsData, resultsData] = await Promise.all([getAnalytics(), getResults()]);
        setAnalytics(analyticsData || { rankings: [], sectionScores: [], trend: [], total_attempts: 0 });
        setResults(resultsData || []);
      } catch (error) {
        setAnalytics({ rankings: [], sectionScores: [], trend: [], total_attempts: 0 });
        setResults([]);
      }
    };

    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Reports</p>
        <h2 className="mt-2 text-4xl font-black text-slate-950">System analytics and reports</h2>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] bg-white p-6 shadow-lg shadow-slate-900/5"><p className="text-sm text-slate-500">Attempts</p><p className="mt-3 text-3xl font-black text-slate-950">{analytics.total_attempts || 0}</p></div>
        <div className="rounded-[24px] bg-white p-6 shadow-lg shadow-slate-900/5"><p className="text-sm text-slate-500">Average Skill Buckets</p><p className="mt-3 text-3xl font-black text-slate-950">{analytics.sectionScores?.length || 0}</p></div>
        <div className="rounded-[24px] bg-white p-6 shadow-lg shadow-slate-900/5"><p className="text-sm text-slate-500">Top Score</p><p className="mt-3 text-3xl font-black text-slate-950">{analytics.rankings?.[0]?.score || 0}%</p></div>
        <div className="rounded-[24px] bg-white p-6 shadow-lg shadow-slate-900/5"><p className="text-sm text-slate-500">Trend Points</p><p className="mt-3 text-3xl font-black text-slate-950">{analytics.trend?.length || 0}</p></div>
      </div>

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
        <h3 className="text-2xl font-bold text-slate-950">Result Breakdown</h3>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="pb-3 pr-6">Candidate</th>
                <th className="pb-3 pr-6">Assessment</th>
                <th className="pb-3 pr-6">Score</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="py-4 pr-6 font-semibold text-slate-900">{row.candidate}</td>
                  <td className="py-4 pr-6 text-slate-600">{row.test}</td>
                  <td className="py-4 pr-6 text-slate-900">{row.score}%</td>
                  <td className="py-4"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Reports;
