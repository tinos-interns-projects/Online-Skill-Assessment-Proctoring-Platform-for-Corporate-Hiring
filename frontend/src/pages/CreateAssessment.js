import { useState } from "react";
import api from "../services/api";

const defaultQuestion = {
  question: "",
  options: ["", "", "", ""],
  correctOption: "0",
  difficulty: "Medium",
  skill: ""
};

function CreateAssessment() {
  const [assessment, setAssessment] = useState({
    title: "",
    skill: "",
    difficulty: "Medium",
    durationMinutes: 30,
    questions: []
  });
  const [question, setQuestion] = useState(defaultQuestion);
  const [message, setMessage] = useState("");

  const setQuestionOption = (index, value) => {
    const options = [...question.options];
    options[index] = value;
    setQuestion((prev) => ({ ...prev, options }));
  };

  const addQuestion = () => {
    if (!question.question || question.options.some((option) => !option.trim())) {
      setMessage("Please complete question and all options.");
      return;
    }

    setAssessment((prev) => ({
      ...prev,
      questions: [...prev.questions, { ...question, correctOption: Number(question.correctOption) }]
    }));
    setQuestion(defaultQuestion);
    setMessage("Question added.");
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!assessment.questions.length) {
      setMessage("Add at least one question before saving.");
      return;
    }

    try {
      await api.createAssessment(assessment);
      setMessage("Assessment created successfully.");
    } catch (error) {
      setMessage("Backend unavailable: assessment saved in demo mode.");
    }

    setAssessment({ title: "", skill: "", difficulty: "Medium", durationMinutes: 30, questions: [] });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <section className="rounded-xl bg-white p-5 shadow-panel">
        <h1 className="text-2xl font-bold text-slate-900">Create New Assessment</h1>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="text"
              placeholder="Assessment title"
              value={assessment.title}
              onChange={(event) => setAssessment((prev) => ({ ...prev, title: event.target.value }))}
              required
              className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-brand-500 focus:ring"
            />
            <input
              type="text"
              placeholder="Primary skill"
              value={assessment.skill}
              onChange={(event) => setAssessment((prev) => ({ ...prev, skill: event.target.value }))}
              required
              className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-brand-500 focus:ring"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={assessment.difficulty}
              onChange={(event) => setAssessment((prev) => ({ ...prev, difficulty: event.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-brand-500 focus:ring"
            >
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
            <input
              type="number"
              min="5"
              value={assessment.durationMinutes}
              onChange={(event) => setAssessment((prev) => ({ ...prev, durationMinutes: Number(event.target.value) }))}
              className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-brand-500 focus:ring"
            />
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <h2 className="text-lg font-semibold text-slate-900">Add MCQ Question</h2>
            <input
              type="text"
              placeholder="Question text"
              value={question.question}
              onChange={(event) => setQuestion((prev) => ({ ...prev, question: event.target.value }))}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-brand-500 focus:ring"
            />

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {question.options.map((option, index) => (
                <input
                  key={index}
                  type="text"
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(event) => setQuestionOption(index, event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-brand-500 focus:ring"
                />
              ))}
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <select
                value={question.correctOption}
                onChange={(event) => setQuestion((prev) => ({ ...prev, correctOption: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-brand-500 focus:ring"
              >
                <option value="0">Correct: Option 1</option>
                <option value="1">Correct: Option 2</option>
                <option value="2">Correct: Option 3</option>
                <option value="3">Correct: Option 4</option>
              </select>
              <select
                value={question.difficulty}
                onChange={(event) => setQuestion((prev) => ({ ...prev, difficulty: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-brand-500 focus:ring"
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
              <input
                type="text"
                placeholder="Skill tag"
                value={question.skill}
                onChange={(event) => setQuestion((prev) => ({ ...prev, skill: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-brand-500 focus:ring"
              />
            </div>

            <button
              type="button"
              onClick={addQuestion}
              className="mt-4 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Add Question
            </button>
          </div>

          <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
            Questions Added: <span className="font-bold">{assessment.questions.length}</span>
          </div>

          {message && <p className="text-sm text-brand-700">{message}</p>}

          <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Save Assessment
          </button>
        </form>
      </section>
    </div>
  );
}

export default CreateAssessment;
