import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../services/api";

function ResultsPage() {
  const location = useLocation();
  const [results, setResults] = useState([]);

  useEffect(() => {
    const routedResult = location.state?.result;
    if (routedResult) {
      setResults([routedResult]);
      return;
    }

    const loadResults = async () => {
      try {
        setResults(await api.getResults());
      } catch (error) {
        setResults([]);
      }
    };

    loadResults();
  }, [location.state]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <section className="rounded-xl bg-white p-5 shadow-panel">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Assessment Results</h1>
          <Link to="/candidate/dashboard" className="text-sm font-semibold text-brand-700 hover:underline">Back to Dashboard</Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {results.map((result, index) => (
            <article key={`${result.assessmentId || result.id}-${index}`} className="rounded-lg border border-slate-200 p-4">
              <h2 className="text-lg font-bold text-slate-900">{result.title || "Assessment"}</h2>
              <p className="mt-2 text-sm text-slate-600">Score: <span className="font-bold text-brand-700">{result.score}%</span></p>
              <p className="text-sm text-slate-600">Attempted: {result.attempted || 0}</p>
              <p className="text-sm text-slate-600">Total Questions: {result.totalQuestions || 0}</p>
              {result.violations?.length ? <p className="mt-2 text-xs text-amber-700">Proctoring Alerts: {result.violations.length}</p> : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default ResultsPage;
