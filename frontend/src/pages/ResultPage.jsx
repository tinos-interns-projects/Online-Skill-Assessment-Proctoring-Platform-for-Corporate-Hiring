import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getResults } from "../services/api.js";

function ResultPage() {
  const location = useLocation();
  const initialResult = location.state?.submissionResult || null;
  const autoSubmittedMessage = location.state?.autoSubmittedMessage || "";
  const resultId = location.state?.resultId;
  const [result, setResult] = useState(initialResult);
  const [loading, setLoading] = useState(!initialResult);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadResult = async () => {
      if (initialResult) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await getResults(resultId ? { result_id: resultId } : { latest: 1 });
        setResult(response);
      } catch (loadError) {
        setError(loadError.message || "Unable to load result.");
      } finally {
        setLoading(false);
      }
    };

    loadResult();
  }, [initialResult, resultId]);

  if (loading) {
    return <p className="p-6 text-sm text-slate-600">Loading result...</p>;
  }

  if (error || !result) {
    return <p className="p-6 text-sm text-rose-600">{error || "Result is not available right now."}</p>;
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
          {autoSubmittedMessage ? <p className="mb-6 text-sm font-semibold text-rose-600">{autoSubmittedMessage}</p> : null}
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Result</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">{result.testName}</h1>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Score</p><p className="mt-2 text-3xl font-black text-slate-950">{result.score}%</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Correct Answers</p><p className="mt-2 text-3xl font-black text-slate-950">{result.correctAnswers}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Wrong Answers</p><p className="mt-2 text-3xl font-black text-slate-950">{result.wrongAnswers}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Violations</p><p className="mt-2 text-3xl font-black text-slate-950">{result.violations}</p></div>
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
          <h2 className="text-2xl font-bold text-slate-950">Explanation for Wrong Answers</h2>
          <div className="mt-6 space-y-4">
            {result.explanations?.length ? (
              result.explanations.map((item) => (
                <div key={item.questionId} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="font-semibold text-slate-900">{item.question}</p>
                  <p className="mt-3 text-sm text-slate-600">Your answer: {item.submittedAnswer || "Not answered"}</p>
                  <p className="mt-1 text-sm text-slate-600">Correct answer: {item.correctAnswer || "See explanation"}</p>
                  <p className="mt-3 text-sm font-medium text-slate-700">{item.explanation}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <p className="text-sm text-slate-600">No wrong answers to explain.</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/candidate" className="rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white">Back to Dashboard</Link>
            <Link to="/test" className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700">Retake View</Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ResultPage;
