import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getCandidateDashboard } from "../services/api.js";

function EmptyState({ message }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const tone = status === "Completed"
    ? "bg-emerald-50 text-emerald-700"
    : status === "Expired"
      ? "bg-rose-50 text-rose-700"
      : status === "Scheduled"
        ? "bg-amber-50 text-amber-700"
        : "bg-sky-50 text-sky-700";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{status}</span>;
}

function formatDateTime(value) {
  if (!value) {
    return "Not scheduled";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function TestCard({ test, action }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-slate-900">{test.title}</p>
        <p className="mt-1 text-sm text-slate-500">
          {test.durationMinutes} mins | {test.questionCount} questions
        </p>
        <p className="mt-1 text-sm text-slate-500">Scheduled: {formatDateTime(test.scheduledStart)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={test.status} />
        {action}
      </div>
    </div>
  );
}

function CandidateDashboard() {
  const location = useLocation();
  const latestResult = location.state?.submissionResult;
  const autoSubmittedMessage = location.state?.autoSubmittedMessage;
  const [assignedTests, setAssignedTests] = useState([]);
  const [expiredTests, setExpiredTests] = useState([]);
  const [completedTests, setCompletedTests] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const dashboardData = await getCandidateDashboard();
        setAssignedTests(dashboardData.assignedTests || []);
        setExpiredTests(dashboardData.expiredTests || []);
        setCompletedTests(dashboardData.completedTests || []);
        setResults(dashboardData.completedTests || []);
      } catch (loadError) {
        setError(loadError.message || "Unable to load candidate dashboard.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const historyItems = useMemo(() => {
    const mapped = results.map((item) => ({
      testName: item.title,
      score: item.score,
      outcome: item.reviewLabel || item.status
    }));

    if (latestResult) {
      return [{ testName: latestResult.testName || "Latest Submission", score: latestResult.score, outcome: autoSubmittedMessage || "Submitted" }, ...mapped];
    }

    return mapped;
  }, [autoSubmittedMessage, latestResult, results]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Candidate Dashboard</p>
            <h1 className="mt-2 text-4xl font-black text-slate-950">Manage tests, history, and score reports</h1>
          </div>
          <Link to="/" className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700">Back to Home</Link>
        </div>

        {error ? <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5"><p className="text-sm font-semibold text-rose-600">{error}</p></section> : null}
        {loading ? <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5"><p className="text-sm text-slate-600">Loading candidate dashboard...</p></section> : null}

        {autoSubmittedMessage ? <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5"><p className="text-sm font-semibold text-rose-600">{autoSubmittedMessage}</p></section> : null}

        {latestResult ? (
          <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
            <h2 className="text-2xl font-bold text-slate-950">Latest Submission</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Score</p><p className="mt-2 text-3xl font-black text-slate-950">{latestResult.score}%</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Correct</p><p className="mt-2 text-3xl font-black text-slate-950">{latestResult.correctAnswers}</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Attempted</p><p className="mt-2 text-3xl font-black text-slate-950">{latestResult.attemptedQuestions}</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Total Questions</p><p className="mt-2 text-3xl font-black text-slate-950">{latestResult.totalQuestions}</p></div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
            <h2 className="text-2xl font-bold text-slate-950">Assigned Tests</h2>
            <div className="mt-6 space-y-4">
              {[...assignedTests, ...expiredTests].length ? [...assignedTests, ...expiredTests].map((test) => (
                <TestCard
                  key={test.id}
                  test={test}
                  action={test.status === "Expired" ? (
                    <button
                      type="button"
                      disabled
                      className="cursor-not-allowed rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500"
                    >
                      Start Test
                    </button>
                  ) : test.status === "Active" || test.status === "In Progress" ? (
                    <Link to="/test" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Start Test</Link>
                  ) : (
                    <span className="text-sm font-medium text-slate-500">Available once the scheduled time begins</span>
                  )}
                />
              )) : <EmptyState message="No assigned tests are available right now." />}
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
              <h2 className="text-2xl font-bold text-slate-950">Test Results</h2>
              <div className="mt-5 space-y-3">
                {completedTests.length ? completedTests.map((test) => (
                  <div key={test.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{test.title}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {test.score ?? 0}% | {test.reviewLabel || test.status}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={test.status} />
                        {test.resultId ? (
                          <Link
                            to="/result"
                            state={{ resultId: test.resultId }}
                            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                          >
                            View Result / Review
                          </Link>
                        ) : (
                          <span className="text-sm font-medium text-slate-500">Result unavailable</span>
                        )}
                      </div>
                    </div>
                  </div>
                )) : <EmptyState message="Completed tests will appear here once submissions are finished." />}
              </div>
            </div>
            {historyItems.length ? (
              <div className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
                <h2 className="text-2xl font-bold text-slate-950">Recent History</h2>
                <div className="mt-5 space-y-3">
                  {historyItems.map((item) => (
                    <div key={`${item.testName}-${item.score}`} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <span className="font-medium text-slate-700">{item.testName}</span>
                      <span className="font-bold text-emerald-700">{item.score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

export default CandidateDashboard;
