import { useEffect, useMemo, useState } from "react";

function AssessmentBuilder({ initialAssessments = [], onCreate, onDelete, deletingAssessmentId = null }) {
  const [form, setForm] = useState({
    title: "",
    skill: "React",
    durationMinutes: "45",
    questionCount: "20",
    difficulty: "Medium"
  });
  const [assessments, setAssessments] = useState(initialAssessments);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setAssessments(initialAssessments);
  }, [initialAssessments]);

  const totalAssessments = useMemo(() => assessments.length, [assessments]);

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      setMessage("Assessment title is required.");
      return;
    }

    const nextAssessment = {
      id: `A-${Date.now()}`,
      title: form.title.trim(),
      skill: form.skill,
      durationMinutes: Number(form.durationMinutes),
      questionCount: Number(form.questionCount),
      difficulty: form.difficulty
    };

    const nextItems = [nextAssessment, ...assessments];
    setAssessments(nextItems);
    setMessage(`Assessment '${nextAssessment.title}' created successfully.`);
    onCreate?.(nextAssessment, nextItems);
    setForm({
      title: "",
      skill: form.skill,
      durationMinutes: form.durationMinutes,
      questionCount: form.questionCount,
      difficulty: form.difficulty
    });
  };

  const handleDelete = async (assessment) => {
    const confirmed = window.confirm(`Delete assessment '${assessment.title}'?`);
    if (!confirmed) {
      return;
    }

    const deleted = await onDelete?.(assessment);
    if (deleted) {
      setAssessments((current) => current.filter((item) => item.id !== assessment.id));
      setMessage(`Assessment '${assessment.title}' deleted successfully.`);
    }
  };

  return (
    <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">Create Test</h2>
          <p className="mt-2 text-slate-600">Configure assessments and publish them to hiring or learning workflows.</p>
        </div>
        <div className="rounded-full bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
          {totalAssessments} assessments ready
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Assessment Name</label>
          <input value={form.title} onChange={(event) => handleChange("title", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white" placeholder="Frontend Engineer L2" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Skill</label>
          <select value={form.skill} onChange={(event) => handleChange("skill", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white">
            <option>React</option>
            <option>JavaScript</option>
            <option>SQL</option>
            <option>Python</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Duration</label>
          <input value={form.durationMinutes} onChange={(event) => handleChange("durationMinutes", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white" placeholder="45" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Questions</label>
          <input value={form.questionCount} onChange={(event) => handleChange("questionCount", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white" placeholder="20" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Difficulty</label>
          <select value={form.difficulty} onChange={(event) => handleChange("difficulty", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white">
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
        </div>
        <div className="md:col-span-2 xl:col-span-5">
          <button className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Save Assessment</button>
        </div>
      </form>

      {message ? <p className="mt-4 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {assessments.map((assessment) => (
          <div key={assessment.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{assessment.title}</p>
                <p className="mt-1 text-sm text-slate-500">{assessment.skill} | {assessment.durationMinutes} mins | {assessment.questionCount} questions</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{assessment.difficulty}</span>
                <button
                  type="button"
                  disabled={deletingAssessmentId === assessment.id}
                  onClick={() => void handleDelete(assessment)}
                  className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingAssessmentId === assessment.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default AssessmentBuilder;
