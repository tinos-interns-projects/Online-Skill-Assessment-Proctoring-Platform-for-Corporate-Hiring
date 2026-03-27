import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AssessmentBuilder from "../components/AssessmentBuilder.jsx";
import { createAssessment, deleteAssessment, getAssessments, getCandidates, getEmployerStats, getResults } from "../services/api.js";

function EmployerDashboard() {
  const [stats, setStats] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [results, setResults] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [liveMonitoring, setLiveMonitoring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignmentCreated, setAssignmentCreated] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [deletingAssessmentId, setDeletingAssessmentId] = useState(null);
  const [form, setForm] = useState({ blueprint: "", candidate: "", start: "2026-03-20 10:00", duration: "45" });

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const [statsData, candidatesData, resultsData, assessmentsData] = await Promise.all([
          getEmployerStats(),
          getCandidates(),
          getResults({ summary: 1 }),
          getAssessments()
        ]);

        setStats(statsData.stats || []);
        setLiveMonitoring(statsData.liveMonitoring || []);
        setCandidates(candidatesData || []);
        setResults(resultsData || []);
        setAssessments(assessmentsData || []);
      } catch (loadError) {
        setError(loadError.message || "Unable to load employer dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  useEffect(() => {
    if (!assessments.length && !candidates.length) {
      return;
    }

    setForm((current) => ({
      ...current,
      blueprint: current.blueprint || assessments[0]?.title || "",
      candidate: current.candidate || candidates[0]?.name || ""
    }));
  }, [assessments, candidates]);

  const assessmentCards = useMemo(
    () => assessments.map((item) => ({
      id: item.id,
      title: item.title,
      skill: item.skill,
      durationMinutes: item.durationMinutes,
      questionCount: item.questionCount,
      difficulty: item.difficulty
    })),
    [assessments]
  );

  const handleAssign = () => {
    if (!form.blueprint || !form.candidate) {
      setError("Select both a blueprint and a candidate before assigning a test.");
      return;
    }

    setAssignments((current) => [
      {
        id: `${form.blueprint}-${form.candidate}-${Date.now()}`,
        blueprint: form.blueprint,
        candidate: form.candidate,
        start: form.start,
        duration: form.duration
      },
      ...current
    ]);
    setAssignmentCreated(true);
    setError("");
  };

  const handleAssessmentCreate = async (assessment) => {
    try {
      const created = await createAssessment({
        title: assessment.title,
        skill: assessment.skill,
        difficulty: assessment.difficulty,
        durationMinutes: assessment.durationMinutes,
        questions: []
      });

      setAssessments((current) => [created, ...current]);
      setError("");
    } catch (createError) {
      setError(createError.message || "Unable to create assessment.");
    }
  };

  const handleAssessmentDelete = async (assessment) => {
    try {
      setDeletingAssessmentId(assessment.id);
      await deleteAssessment(assessment.id);
      setAssessments((current) => current.filter((item) => item.id !== assessment.id));
      return true;
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete assessment.");
      return false;
    } finally {
      setDeletingAssessmentId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Employer Dashboard</p>
            <h1 className="mt-2 text-4xl font-black text-slate-950">Create assessments and review candidate outcomes</h1>
          </div>
          <Link to="/" className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700">Back to Home</Link>
        </div>

        {error ? <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5"><p className="text-sm font-semibold text-rose-600">{error}</p></section> : null}
        {loading ? <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5"><p className="text-sm text-slate-600">Loading employer dashboard...</p></section> : null}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {stats.map((item) => (
            <div key={item.label} className="rounded-[24px] bg-white p-6 shadow-lg shadow-slate-900/5">
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{item.value}</p>
            </div>
          ))}
        </div>

        <AssessmentBuilder initialAssessments={assessmentCards} onCreate={handleAssessmentCreate} onDelete={handleAssessmentDelete} deletingAssessmentId={deletingAssessmentId} />

        <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
          <h2 className="text-2xl font-bold text-slate-950">Assign Test</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Select Blueprint</label>
              <select value={form.blueprint} onChange={(event) => setForm((current) => ({ ...current, blueprint: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white">
                {assessments.map((item) => <option key={item.id}>{item.title}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Select Candidate</label>
              <select value={form.candidate} onChange={(event) => setForm((current) => ({ ...current, candidate: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white">
                {candidates.map((item) => <option key={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Set Start Time</label>
              <input value={form.start} onChange={(event) => setForm((current) => ({ ...current, start: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Set Duration</label>
              <input value={form.duration} onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white" />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button type="button" onClick={handleAssign} className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Assign Test</button>
            {assignmentCreated ? <p className="text-sm font-semibold text-emerald-700">Assignment created successfully.</p> : null}
          </div>
          {assignments.length ? (
            <div className="mt-6 space-y-3">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                  {assignment.candidate} assigned to {assignment.blueprint} at {assignment.start} for {assignment.duration} mins.
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
            <h2 className="text-2xl font-bold text-slate-950">View Results</h2>
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

          <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
            <h2 className="text-2xl font-bold text-slate-950">Monitor Candidate Session</h2>
            <div className="mt-6 space-y-4">
              {liveMonitoring.map((item) => (
                <div key={`${item.candidate}-${item.test}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.candidate}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.test}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{item.status}</span>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white px-4 py-3">Warnings: {item.warnings}</div>
                    <div className="rounded-2xl bg-white px-4 py-3">Score: {item.score}%</div>
                    <div className="rounded-2xl bg-white px-4 py-3">Time Left: {item.timeLeft}</div>
                  </div>
                  <div className="mt-4 rounded-2xl bg-white p-4">
                    <p className="text-sm font-semibold text-slate-700">Violation Logs</p>
                    <div className="mt-3 space-y-2">
                      {item.violationLogs?.length ? item.violationLogs.map((log, index) => (
                        <div key={`${log.type}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          {log.type} | {new Date(log.timestamp).toLocaleString()}
                        </div>
                      )) : <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">No violations logged.</div>}
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl bg-white p-4">
                    <p className="text-sm font-semibold text-slate-700">Candidate Webcam Screenshots</p>
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      {item.screenshots?.length ? item.screenshots.map((shot, index) => (
                        <div key={`${shot.url}-${index}`} className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                          <img src={shot.url} alt="Candidate webcam capture" className="h-24 w-full object-cover" />
                          <p className="px-2 py-2 text-[11px] text-slate-500">{new Date(shot.timestamp).toLocaleTimeString()}</p>
                        </div>
                      )) : <div className="col-span-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">No screenshots captured yet.</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default EmployerDashboard;
