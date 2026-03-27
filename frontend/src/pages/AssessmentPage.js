import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import WebcamMonitor from "../components/WebcamMonitor";
import api from "../services/api";

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function AssessmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    const loadAssessment = async () => {
      try {
        const assessments = await api.getAssessments();
        const current = assessments.find((item) => String(item.id) === String(id)) || assessments.find((item) => item.questions?.length) || assessments[0];
        setAssessment(current || null);
        setTimeLeft(((current?.durationMinutes || 30) * 60));
      } catch (error) {
        setAssessment(null);
      }
    };

    loadAssessment();
  }, [id]);

  useEffect(() => {
    if (!assessment || submittedRef.current) {
      return undefined;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1 && !submittedRef.current) {
          submittedRef.current = true;
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [assessment]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        setAlerts((prev) => [`Tab switch detected at ${new Date().toLocaleTimeString()}`, ...prev].slice(0, 8));
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const liveScore = useMemo(() => {
    if (!assessment?.questions?.length) {
      return 0;
    }

    let correct = 0;
    assessment.questions.forEach((question) => {
      if (answers[question.id] === question.correctOption) {
        correct += 1;
      }
    });

    return Math.round((correct / assessment.questions.length) * 100);
  }, [assessment, answers]);

  const handleAnswer = (questionId, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async (autoSubmitted = false) => {
    if (!assessment || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    const total = assessment.questions.length;
    const correct = assessment.questions.reduce((sum, question) => sum + (answers[question.id] === question.correctOption ? 1 : 0), 0);

    navigate("/candidate/results", {
      state: {
        result: {
          assessmentId: assessment.id,
          title: assessment.title,
          score: total ? Math.round((correct / total) * 100) : 0,
          correct,
          totalQuestions: total,
          attempted: Object.keys(answers).length,
          violations: alerts
        },
        autoSubmitted
      }
    });
    setIsSubmitting(false);
  };

  if (!assessment) {
    return <p className="p-6 text-sm text-slate-600">Loading assessment...</p>;
  }

  return (
    <div className="grid gap-6 p-4 sm:p-6 xl:grid-cols-[1fr_320px]">
      <section className="space-y-4 rounded-xl bg-white p-5 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{assessment.title}</h1>
            <p className="text-sm text-slate-500">Skill: {assessment.skill}</p>
          </div>
          <div className="rounded-lg bg-slate-900 px-4 py-2 text-lg font-bold text-white">{formatTime(timeLeft)}</div>
        </div>

        <div className="rounded-lg bg-brand-50 p-3">
          <p className="text-sm font-semibold text-brand-700">Live Score Progress: {liveScore}%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-100"><div className="h-full bg-brand-600 transition-all" style={{ width: `${liveScore}%` }} /></div>
        </div>

        <div className="space-y-4">
          {assessment.questions.map((question, index) => (
            <article key={question.id} className="rounded-lg border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900">Q{index + 1}. {question.question}</h2>
              <div className="mt-3 grid gap-2">
                {question.options.map((option, optionIndex) => (
                  <label key={`${question.id}-${optionIndex}`} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${answers[question.id] === optionIndex ? "border-brand-500 bg-brand-50 text-brand-800" : "border-slate-200 hover:border-slate-300"}`}>
                    <input type="radio" name={`question-${question.id}`} checked={answers[question.id] === optionIndex} onChange={() => handleAnswer(question.id, optionIndex)} />
                    {option}
                  </label>
                ))}
              </div>
            </article>
          ))}
        </div>

        <button onClick={() => handleSubmit(false)} disabled={isSubmitting} className="w-full rounded-lg bg-accent-500 px-4 py-3 font-semibold text-white transition hover:bg-accent-600 disabled:opacity-70">{isSubmitting ? "Submitting..." : "Submit Test"}</button>
      </section>

      <section><WebcamMonitor alerts={alerts} onCapture={() => {}} /></section>
    </div>
  );
}

export default AssessmentPage;

