import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import api from "../services/api";

function AnalyticsPage() {
  const [analytics, setAnalytics] = useState({ rankings: [], sectionScores: [], trend: [] });

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setAnalytics(await api.getAnalytics());
      } catch (error) {
        setAnalytics({ rankings: [], sectionScores: [], trend: [] });
      }
    };

    loadAnalytics();
  }, []);

  const topRankings = useMemo(() => analytics.rankings || [], [analytics.rankings]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <section className="rounded-xl bg-white p-5 shadow-panel">
        <h1 className="text-2xl font-bold text-slate-900">Candidate Performance Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">Section-wise scores, ranking visibility, and weekly performance trend</p>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-xl bg-white p-5 shadow-panel">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Section-wise Score Breakdown</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.sectionScores || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="section" /><YAxis /><Tooltip /><Legend /><Bar dataKey="avgScore" fill="#14b8a6" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-xl bg-white p-5 shadow-panel">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Performance Trend</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.trend || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="week" /><YAxis /><Tooltip /><Line type="monotone" dataKey="avg" stroke="#ea580c" strokeWidth={3} /></LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-panel">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Top Rankings</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700"><tr><th className="px-3 py-2">Rank</th><th className="px-3 py-2">Candidate</th><th className="px-3 py-2">Score</th></tr></thead>
            <tbody>
              {topRankings.map((candidate, index) => (
                <tr key={candidate.name} className="border-b border-slate-200"><td className="px-3 py-2 font-semibold">#{index + 1}</td><td className="px-3 py-2">{candidate.name}</td><td className="px-3 py-2 text-brand-700">{candidate.score}%</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default AnalyticsPage;
