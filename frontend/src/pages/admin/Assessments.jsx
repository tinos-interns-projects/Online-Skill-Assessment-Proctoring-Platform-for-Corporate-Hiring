import { useEffect, useState } from "react";
import { getAssessments, getResults } from "../../services/api.js";

function Assessments() {
  const [assessments, setAssessments] = useState([]);
  const [monitoring, setMonitoring] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [assessmentData, resultData] = await Promise.all([getAssessments(), getResults()]);
        setAssessments(assessmentData || []);
        setMonitoring((assessmentData || []).map((item) => ({ id: item.id, name: item.title, blueprint: item.skill, candidates: resultData.filter((result) => result.title === item.title).length, start: "Backend loaded", status: resultData.some((result) => result.title === item.title) ? "Completed" : "Scheduled" })));
      } catch (error) {
        setAssessments([]);
        setMonitoring([]);
      }
    };

    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Assessments</p>
        <h2 className="mt-2 text-4xl font-black text-slate-950">View all assessments</h2>
      </div>

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
        <h3 className="text-2xl font-bold text-slate-950">Assessment Library</h3>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {assessments.map((assessment) => (
            <div key={assessment.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <p className="font-semibold text-slate-900">{assessment.title}</p>
              <p className="mt-1 text-sm text-slate-500">{assessment.skill}</p>
              <p className="mt-3 text-sm text-slate-600">{assessment.durationMinutes} mins | {assessment.questionCount} questions</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
        <h3 className="text-2xl font-bold text-slate-950">Assessment Monitoring</h3>
        <div className="mt-6 space-y-4">
          {monitoring.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.blueprint}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{item.status}</span>
              </div>
              <p className="mt-4 text-sm text-slate-600">Starts {item.start} | {item.candidates} assigned candidates</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Assessments;
