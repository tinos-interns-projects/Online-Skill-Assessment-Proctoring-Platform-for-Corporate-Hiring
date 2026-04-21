import { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Link } from "react-router-dom";
import EmployerTemplateConfigurator from "../components/EmployerTemplateConfigurator.jsx";
import EmployerReportDrawer from "../components/EmployerReportDrawer.jsx";
import {
  createEmployerAssignment,
  createEmployerTemplate,
  getAssessments,
  getCandidates,
  getEmployerAssignmentReport,
  getEmployerAssignments,
  getEmployerStats,
  getEmployerTemplates
} from "../services/api.js";

const SIDEBAR_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "tests", label: "Test" },
  { id: "candidates", label: "Candidate" },
  { id: "assignments", label: "Assessments" },
  { id: "results", label: "Results" },
  { id: "reports", label: "Reports" },
  { id: "live", label: "Live Test" },
];

const SIDEBAR_SECONDARY_ITEMS = [
  { id: "home", label: "Back to Home", href: "/" },
  { id: "logout", label: "Logout", href: "/logout/", forceReload: true }
];

function formatScheduledStart(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function DashboardOverview({ summaryCards }) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Overview</p>
        <h1 className="mt-2 text-4xl font-black text-slate-950">Employer Dashboard</h1>
        <p className="mt-3 max-w-3xl text-slate-600">Track testing activity, candidate performance, and live sessions from one structured workspace.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((item) => (
          <div key={item.label} className="rounded-[24px] bg-white p-6 shadow-lg shadow-slate-900/5">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TestsLibrary({ templates = [] }) {
  return (
    <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Tests</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">Saved Tests</h2>
        </div>
        <div className="rounded-full bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
          {templates.length} saved
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {templates.length ? templates.map((template) => (
          <article key={template.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{template.title}</p>
                <p className="mt-1 text-sm text-slate-500">{template.blueprintName} | {template.totalDurationMinutes} mins | {template.difficulty}</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{template.sections.length} sections</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="pb-3 pr-6">Section</th>
                    <th className="pb-3 pr-6">Questions</th>
                    <th className="pb-3">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {template.sections.map((section) => (
                    <tr key={section.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="py-3 pr-6 font-medium text-slate-900">{section.title}</td>
                      <td className="py-3 pr-6 text-slate-600">{section.questionCount}</td>
                      <td className="py-3 text-slate-600">{section.timeLimitMinutes} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        )) : <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-600">No saved tests available yet.</div>}
      </div>
    </section>
  );
}

function CandidatesPanel({ candidates = [] }) {
  return (
    <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Candidates</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">Candidate Directory</h2>
        </div>
        <div className="rounded-full bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">{candidates.length} candidates</div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="pb-3 pr-6">Candidate</th>
              <th className="pb-3 pr-6">Email</th>
              <th className="pb-3 pr-6">Stage</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => (
              <tr key={candidate.id} className="border-b border-slate-100">
                <td className="py-4 pr-6 font-semibold text-slate-900">{candidate.name}</td>
                <td className="py-4 pr-6 text-slate-600">{candidate.email || "N/A"}</td>
                <td className="py-4 pr-6 text-slate-600">{candidate.stage}</td>
                <td className="py-4 text-slate-600">{candidate.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AssignmentForm({
  assignmentForm,
  setAssignmentForm,
  assessments,
  availableTests,
  candidates,
  assigning,
  assignError,
  assignNotice,
  onAssign
}) {
  return (
    <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Assignments</p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">Test Assignment</h2>
      </div>

      {assignNotice ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {assignNotice}
        </div>
      ) : null}

      {assignError ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {assignError}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Select Test</label>
          <select
            value={assignmentForm.selectedTestKey}
            onChange={(event) => {
              const nextSelection = availableTests.find((item) => item.key === event.target.value);
              setAssignmentForm((current) => ({
                ...current,
                selectedTestKey: event.target.value,
                templateId: nextSelection?.templateId ? String(nextSelection.templateId) : "",
                blueprintId: nextSelection?.blueprintId ? String(nextSelection.blueprintId) : current.blueprintId,
                durationMinutes: nextSelection?.durationMinutes ? String(nextSelection.durationMinutes) : current.durationMinutes
              }));
            }}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white"
          >
            <option value="">Select an available test</option>
            {availableTests.map((test) => <option key={test.key} value={test.key}>{test.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Select Blueprint</label>
          <select
            value={assignmentForm.blueprintId}
            onChange={(event) => setAssignmentForm((current) => ({ ...current, blueprintId: event.target.value, templateId: "", selectedTestKey: `blueprint-${event.target.value}` }))}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white"
          >
            <option value="">Select Blueprint</option>
            {assessments.map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.title}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Select Candidate(s)</label>
          <select value={assignmentForm.candidateId} onChange={(event) => setAssignmentForm((current) => ({ ...current, candidateId: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white">
            <option value="">Select Candidate</option>
            {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Start Date & Time</label>
          <DatePicker
            selected={assignmentForm.scheduledStart}
            onChange={(date) => setAssignmentForm((current) => ({ ...current, scheduledStart: date }))}
            showTimeSelect
            timeFormat="hh:mm aa"
            timeIntervals={5}
            dateFormat="dd/MM/yyyy hh:mm aa"
            minDate={new Date()}
            placeholderText="Select Start Date & Time"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white"
            wrapperClassName="block w-full"
          />
        </div>
      </div>

      <div className="mt-4 max-w-xs">
        <label className="mb-2 block text-sm font-semibold text-slate-700">Duration</label>
        <input type="number" min="10" value={assignmentForm.durationMinutes} placeholder="Enter duration" onChange={(event) => setAssignmentForm((current) => ({ ...current, durationMinutes: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white" />
      </div>

      <div className="mt-6">
        <button type="button" onClick={() => void onAssign()} disabled={assigning} className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
          {assigning ? "Assigning..." : "Assign Test"}
        </button>
      </div>
    </section>
  );
}

function CandidateResults({ assignments, loadingReportId, reportNotice, onOpenReport }) {
  return (
    <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Results</p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">Candidate Results</h2>
      </div>

      {reportNotice ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {reportNotice}
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="pb-3 pr-6">Candidate</th>
              <th className="pb-3 pr-6">Test</th>
              <th className="pb-3 pr-6">Status</th>
              <th className="pb-3 pr-6">Assigned At</th>
              <th className="pb-3">View Report</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment) => (
              <tr key={assignment.id} className="border-b border-slate-100 transition hover:bg-slate-50">
                <td className="py-4 pr-6 font-semibold text-slate-900">{assignment.candidate}</td>
                <td className="py-4 pr-6 text-slate-600">{assignment.assessmentName}</td>
                <td className="py-4 pr-6">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{loadingReportId === assignment.id ? "Loading..." : assignment.status}</span>
                </td>
                <td className="py-4 pr-6 text-slate-600">{new Date(assignment.assignedAt).toLocaleString()}</td>
                <td className="py-4">
                  <button
                    type="button"
                    onClick={() => void onOpenReport(assignment.id)}
                    className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    View Report
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ReportsPanel({ candidates, assignments, stats }) {
  const statsMap = Object.fromEntries((stats || []).map((item) => [item.label, item.value]));
  const completedTests = assignments.filter((assignment) => assignment.status === "Completed").length;
  const expiredTests = assignments.filter((assignment) => assignment.status === "Expired").length;
  const reportCards = [
    { label: "Total Candidates", value: candidates.length },
    { label: "Completed Tests", value: completedTests },
    { label: "Expired Tests", value: expiredTests },
    { label: "Average Score", value: statsMap["Avg Score"] || "N/A" },
  ];

  return (
    <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Reports</p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">Reports Analytics</h2>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {reportCards.map((item) => (
          <div key={item.label} className="rounded-[24px] border border-slate-100 bg-slate-50 p-6">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LiveMonitoringTable({ liveMonitoring }) {
  return (
    <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Live Monitoring</p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">Live Test Monitoring</h2>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="pb-3 pr-6">Candidate</th>
              <th className="pb-3 pr-6">Test</th>
              <th className="pb-3 pr-6">Status</th>
              <th className="pb-3 pr-6">Live Score</th>
              <th className="pb-3 pr-6">Warning</th>
              <th className="pb-3">Time Left</th>
            </tr>
          </thead>
          <tbody>
            {liveMonitoring.map((item) => (
              <tr key={`${item.candidate}-${item.test}`} className="border-b border-slate-100">
                <td className="py-4 pr-6 font-semibold text-slate-900">{item.candidate}</td>
                <td className="py-4 pr-6 text-slate-600">{item.test}</td>
                <td className="py-4 pr-6">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{item.status}</span>
                </td>
                <td className="py-4 pr-6 text-slate-600">{item.score}%</td>
                <td className="py-4 pr-6 text-slate-600">{item.warnings}</td>
                <td className="py-4 text-slate-600">{item.timeLeft}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SettingsPanel() {
  return null;
}

function EmployerDashboard() {
  const [activeView, setActiveView] = useState("dashboard");
  const [stats, setStats] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [liveMonitoring, setLiveMonitoring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingReportId, setLoadingReportId] = useState(null);
  const [reportNotice, setReportNotice] = useState("");
  const [assignNotice, setAssignNotice] = useState("");
  const [assignError, setAssignError] = useState("");
  const [assignmentForm, setAssignmentForm] = useState({
    selectedTestKey: "",
    blueprintId: "",
    templateId: "",
    candidateId: "",
    scheduledStart: null,
    durationMinutes: ""
  });

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const [statsData, candidatesData, assessmentsData, templatesData, assignmentsData] = await Promise.all([
          getEmployerStats(),
          getCandidates(),
          getAssessments(),
          getEmployerTemplates(),
          getEmployerAssignments()
        ]);

        setStats(statsData.stats || []);
        setLiveMonitoring(statsData.liveMonitoring || []);
        setCandidates(candidatesData || []);
        setAssessments(assessmentsData || []);
        setTemplates(templatesData || []);
        setAssignments(assignmentsData || []);
      } catch (loadError) {
        setError(loadError.message || "Unable to load employer dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const templateCards = useMemo(
    () => templates.map((template) => ({
      id: template.id,
      title: template.name,
      blueprintName: template.blueprintName,
      difficulty: template.difficulty,
      totalDurationMinutes: template.totalDurationMinutes,
      sections: template.sections || []
    })),
    [templates]
  );

  const availableTests = useMemo(() => {
    const items = [];
    const seen = new Set();

    for (const assessment of assessments) {
      const key = `blueprint-${assessment.id}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      items.push({
        key,
        label: `${assessment.title} (Predefined)`,
        blueprintId: assessment.id,
        templateId: null,
        durationMinutes: assessment.durationMinutes || 60,
      });
    }

    for (const template of templates) {
      const key = `template-${template.id}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      items.push({
        key,
        label: `${template.name} (Custom)`,
        blueprintId: template.blueprintId,
        templateId: template.id,
        durationMinutes: template.totalDurationMinutes || 60,
      });
    }

    return items;
  }, [assessments, templates]);

  const summaryCards = useMemo(() => {
    const statsMap = Object.fromEntries((stats || []).map((item) => [item.label, item.value]));
    const activeCandidates = assignments.filter((assignment) => assignment.status === "Active").length;
    const completedAssessments = assignments.filter((assignment) => assignment.status === "Completed").length;

    return [
      { label: "Total Tests", value: templates.length || assessments.length || statsMap["Assessments Created"] || 0 },
      { label: "Active Candidates", value: activeCandidates || statsMap["Candidates Assigned"] || 0 },
      { label: "Completed Assessments", value: completedAssessments }
    ];
  }, [stats, templates, assessments, assignments]);

  const handleSaveTemplate = async (payload) => {
    setSavingTemplate(true);
    setError("");

    try {
      const created = await createEmployerTemplate(payload);
      setTemplates((current) => [created, ...current]);
      setActiveView("tests");
    } catch (templateError) {
      setError(templateError.message || "Unable to save test.");
      throw templateError;
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleAssign = async () => {
    if (!assignmentForm.blueprintId || !assignmentForm.candidateId || !assignmentForm.scheduledStart) {
      const message = "Please select a start date and time.";
      setAssignError(message);
      setAssignNotice("");
      return;
    }

    const now = new Date();
    if (assignmentForm.scheduledStart && new Date(assignmentForm.scheduledStart) < now) {
      const message = "Cannot assign a test in the past. Please select a future date and time.";
      setAssignError(message);
      setAssignNotice("");
      return;
    }

    setAssigning(true);
    setError("");
    setAssignError("");
    setAssignNotice("");

    try {
      const created = await createEmployerAssignment({
        blueprintId: Number(assignmentForm.blueprintId),
        templateId: assignmentForm.templateId ? Number(assignmentForm.templateId) : null,
        candidateId: Number(assignmentForm.candidateId),
        scheduledStart: formatScheduledStart(assignmentForm.scheduledStart),
        durationMinutes: Number(assignmentForm.durationMinutes)
      });
      setAssignments((current) => [created, ...current]);
      setAssignNotice("Test assigned successfully.");
      setAssignmentForm((current) => ({
        ...current,
        scheduledStart: null,
      }));
    } catch (assignError) {
      setError(assignError.message || "Unable to assign assessment.");
    } finally {
      setAssigning(false);
    }
  };

  const openReport = async (assignmentId) => {
    const assignment = assignments.find((item) => item.id === assignmentId);
    if (!assignment?.reportAvailable) {
      setSelectedReport(null);
      setReportNotice("Test not completed or not submitted yet.");
      return;
    }

    setLoadingReportId(assignmentId);
    setError("");
    setReportNotice("");

    try {
      const report = await getEmployerAssignmentReport(assignmentId);
      setSelectedReport(report);
    } catch (reportError) {
      setError(reportError.message || "Unable to load candidate report.");
    } finally {
      setLoadingReportId(null);
    }
  };

  const renderActiveView = () => {
    switch (activeView) {
      case "dashboard":
        return <DashboardOverview summaryCards={summaryCards} />;
      case "tests":
        return (
          <div className="space-y-8">
            <EmployerTemplateConfigurator assessments={assessments} onSaveTemplate={handleSaveTemplate} saving={savingTemplate} />
            <TestsLibrary templates={templateCards} />
          </div>
        );
      case "candidates":
        return <CandidatesPanel candidates={candidates} />;
      case "assignments":
        return (
          <AssignmentForm
            assignmentForm={assignmentForm}
            setAssignmentForm={setAssignmentForm}
            assessments={assessments}
            availableTests={availableTests}
            candidates={candidates}
            assigning={assigning}
            assignError={assignError}
            assignNotice={assignNotice}
            onAssign={handleAssign}
          />
        );
      case "results":
        return <CandidateResults assignments={assignments} loadingReportId={loadingReportId} reportNotice={reportNotice} onOpenReport={openReport} />;
      case "reports":
        return <ReportsPanel candidates={candidates} assignments={assignments} stats={stats} />;
      case "live":
        return <LiveMonitoringTable liveMonitoring={liveMonitoring} />;
      case "settings":
        return <SettingsPanel />;
      default:
        return <DashboardOverview summaryCards={summaryCards} />;
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-[32px] bg-white p-6 text-slate-900 shadow-[0_10px_25px_rgba(0,0,0,0.08)]">
          <div className="border-b border-slate-200 pb-6">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Employer Workspace</p>
            <h1 className="mt-3 text-2xl font-black text-slate-950">Assessment Hub</h1>
            <p className="mt-3 text-sm text-slate-500">Navigate tests, assignments, results, and live monitoring from one control panel.</p>
          </div>

          <nav className="mt-6">
            <div className="space-y-3">
              {SIDEBAR_ITEMS.map((item) => {
                const active = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveView(item.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      active
                        ? "border-emerald-500 bg-slate-100 text-emerald-600"
                        : "border-slate-200 bg-slate-100 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span>{item.label}</span>
                    {active ? <span className="text-xs uppercase tracking-[0.18em]">Open</span> : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 border-t border-slate-200 pt-6 space-y-3">
              {SIDEBAR_SECONDARY_ITEMS.map((item) => {
                if (item.href) {
                  if (item.forceReload) {
                    return (
                      <a
                        key={item.id}
                        href={item.href}
                        className="flex w-full items-center justify-between rounded-full bg-slate-950 px-5 py-3 text-left text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        <span>{item.label}</span>
                      </a>
                    );
                  }
                  return (
                    <Link
                      key={item.id}
                      to={item.href}
                      className="flex w-full items-center justify-between rounded-full border border-slate-300 bg-white px-5 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                    >
                      <span>{item.label}</span>
                    </Link>
                  );
                }
                return null;
              })}
            </div>
          </nav>
        </aside>

        <main className="space-y-6">
          {loading ? <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5"><p className="text-sm text-slate-600">Loading employer dashboard...</p></section> : renderActiveView()}
        </main>
      </div>

      <EmployerReportDrawer report={selectedReport} onClose={() => setSelectedReport(null)} />
    </div>
  );
}

export default EmployerDashboard;
