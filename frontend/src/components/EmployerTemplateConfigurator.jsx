import { useEffect, useMemo, useState } from "react";

const SECTION_TITLES = {
  aptitude: "Aptitude",
  verbal: "Verbal",
  numerical: "Numerical",
  logical: "Logical",
  coding: "Coding",
};
const CONFIG_SECTION_TYPES = ["aptitude", "verbal", "numerical", "logical", "coding"];

function getBlueprintSkill(assessment) {
  return assessment?.skill || assessment?.primarySkill || "General";
}

function getBlueprintDifficulty(assessment) {
  return assessment?.defaultDifficulty || assessment?.difficulty || "Medium";
}

function buildSectionRows(assessment) {
  const sectionsByType = Object.fromEntries(
    (assessment?.sections || []).map((section, index) => [
      section.sectionType,
      {
        id: section.id || `${section.sectionType}-${index}`,
        title: section.title || SECTION_TITLES[section.sectionType] || "Section",
        sectionType: section.sectionType,
        order: section.order || index + 1,
        timeLimitMinutes: section.timeLimitMinutes || 15,
        questionCount: section.questionCount || 0
      }
    ])
  );

  // Keep the UI predictable by always exposing the full configurable section set.
  return CONFIG_SECTION_TYPES.map((sectionType, index) => ({
    id: sectionsByType[sectionType]?.id || `${sectionType}-${index}`,
    title: sectionsByType[sectionType]?.title || SECTION_TITLES[sectionType],
    sectionType,
    order: sectionsByType[sectionType]?.order || index + 1,
    timeLimitMinutes: sectionsByType[sectionType]?.timeLimitMinutes || 15,
    questionCount: sectionsByType[sectionType]?.questionCount || 0
  }));
}

function normalizeSectionOrder(value, fallbackOrder) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isNaN(parsed) ? fallbackOrder : parsed;
}

function buildSectionsForSubmit(sections) {
  return [...sections]
    .map((section, index) => ({
      ...section,
      order: normalizeSectionOrder(section.order, index + 1),
      originalIndex: index,
    }))
    .sort((left, right) => {
      if (left.order === right.order) {
        return left.originalIndex - right.originalIndex;
      }
      return left.order - right.order;
    });
}

function EmployerTemplateConfigurator({ assessments = [], onSaveTemplate, saving = false }) {
  const [form, setForm] = useState({
    name: "",
    blueprintId: "",
    primarySkill: "",
    difficulty: "",
    totalDurationMinutes: "60",
    sections: buildSectionRows()
  });
  const [message, setMessage] = useState("");

  const selectedAssessment = useMemo(
    () => assessments.find((assessment) => String(assessment.id) === String(form.blueprintId)) || null,
    [assessments, form.blueprintId]
  );

  useEffect(() => {
    if (!selectedAssessment) {
      return;
    }

    // Keep the form aligned with the selected admin-created blueprint.
    setForm((current) => ({
      ...current,
      blueprintId: current.blueprintId || "",
      primarySkill: current.primarySkill || getBlueprintSkill(selectedAssessment),
      difficulty: current.difficulty || getBlueprintDifficulty(selectedAssessment),
      sections: buildSectionRows(selectedAssessment),
      totalDurationMinutes: current.totalDurationMinutes || String(selectedAssessment.durationMinutes || 60)
    }));
  }, [selectedAssessment]);

  const updateSection = (index, field, value) => {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, [field]: value } : section
      )
    }));
  };

  const handleBlueprintChange = (value) => {
    const nextAssessment = assessments.find((assessment) => String(assessment.id) === String(value));
    setForm((current) => ({
      ...current,
      blueprintId: value,
      primarySkill: getBlueprintSkill(nextAssessment),
      difficulty: getBlueprintDifficulty(nextAssessment),
      totalDurationMinutes: String(nextAssessment?.durationMinutes || current.totalDurationMinutes || 60),
      sections: buildSectionRows(nextAssessment)
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.blueprintId) {
      setMessage("Test name and blueprint are required.");
      return;
    }

    try {
      const orderedSections = buildSectionsForSubmit(form.sections);
      await onSaveTemplate?.({
        name: form.name.trim(),
        blueprintId: Number(form.blueprintId),
        difficulty: form.difficulty || "Medium",
        totalDurationMinutes: Number(form.totalDurationMinutes),
        sections: orderedSections.map((section) => ({
          title: section.title,
          sectionType: section.sectionType,
          order: section.order,
          questionCount: Number(section.questionCount),
          timeLimitMinutes: Number(section.timeLimitMinutes)
        }))
      });
      setMessage("Test saved successfully.");
      setForm((current) => ({
        ...current,
        name: ""
      }));
    } catch (error) {
      setMessage(error.message || "Unable to save test.");
    }
  };

  return (
    <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Tests</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">Test Management</h2>
          <p className="mt-2 max-w-3xl text-slate-600">Configure reusable employer tests with the existing blueprint and section configuration already available in the platform.</p>
        </div>
        <div className="rounded-full bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
          {assessments.length} blueprints available
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Test Name</label>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white"
              placeholder="Frontend Hiring Test"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Select Blueprint</label>
            <select
            value={form.blueprintId}
            onChange={(event) => handleBlueprintChange(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white"
          >
            <option value="">Select Blueprint</option>
            {assessments.map((assessment) => (
              <option key={assessment.id} value={assessment.id}>{assessment.title}</option>
            ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Primary Skill</label>
            <input
              value={form.primarySkill}
              onChange={(event) => setForm((current) => ({ ...current, primarySkill: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Difficulty</label>
            <select
              value={form.difficulty}
              onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white"
            >
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Total Duration</label>
            <input
              type="number"
              min="10"
              value={form.totalDurationMinutes}
              onChange={(event) => setForm((current) => ({ ...current, totalDurationMinutes: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400 focus:bg-white"
            />
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Section Configuration</p>
                <p className="mt-2 text-sm text-slate-500">Configure Aptitude, Verbal, Numerical, Logical, and Coding with section title, question count, and duration while preserving the existing test flow.</p>
              </div>
              <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                {form.sections.length} sections
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="pb-3 pr-6">Section Title</th>
                    <th className="pb-3 pr-6">Order</th>
                    <th className="pb-3 pr-6">Questions</th>
                    <th className="pb-3">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {form.sections.length ? form.sections.map((section, index) => (
                    <tr key={section.id} className="border-b border-slate-100">
                      <td className="py-4 pr-6">
                        <input
                          value={section.title}
                          onChange={(event) => updateSection(index, "title", event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-400"
                        />
                      </td>
                      <td className="py-4 pr-6">
                        <input
                          type="number"
                          min="1"
                          value={section.order}
                          onChange={(event) => updateSection(index, "order", event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400"
                        />
                      </td>
                      <td className="py-4 pr-6">
                        <input
                          type="number"
                          min="0"
                          value={section.questionCount}
                          onChange={(event) => updateSection(index, "questionCount", event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400"
                        />
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="1"
                            value={section.timeLimitMinutes}
                            onChange={(event) => updateSection(index, "timeLimitMinutes", event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400"
                          />
                          <span className="text-sm font-semibold text-slate-500">min</span>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="py-6 text-center text-sm text-slate-500">
                        Select a blueprint to load the standard section configuration.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
        </div>

        {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Test"}
        </button>
      </form>
    </section>
  );
}

export default EmployerTemplateConfigurator;
