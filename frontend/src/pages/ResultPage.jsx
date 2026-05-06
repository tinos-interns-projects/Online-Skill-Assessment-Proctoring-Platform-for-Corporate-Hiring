import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getResults } from "../services/api.js";

function ResultPage() {
  const location = useLocation();

  const initialResult = location.state?.submissionResult || null;
  const autoSubmittedMessage =
    location.state?.autoSubmittedMessage || "";

  const resultId = location.state?.resultId;

  const [result, setResult] = useState(initialResult);
  const [loading, setLoading] = useState(!initialResult);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadResult = async () => {
      if (initialResult) return;

      setLoading(true);
      setError("");

      try {
        const response = await getResults(
          resultId
            ? { result_id: resultId }
            : { latest: 1 }
        );

        setResult(response);
      } catch (loadError) {
        setError(
          loadError.message || "Unable to load result."
        );
      } finally {
        setLoading(false);
      }
    };

    loadResult();
  }, [initialResult, resultId]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-100">
        <p className="text-lg font-semibold text-slate-600">
          Loading result...
        </p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-100">
        <p className="text-lg font-semibold text-rose-600">
          {error || "Result is not available right now."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}
        <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">

          {/* AUTO SUBMITTED */}
          {(result.autoSubmitted || autoSubmittedMessage) && (
            <div className="mb-5 rounded-2xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-600">
              {autoSubmittedMessage ||
                "Test Auto Submitted Due To Violations"}
            </div>
          )}

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">
                Assessment Result
              </p>

              <h1 className="mt-2 text-3xl font-black text-slate-950">
                {result.test}
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Candidate:{" "}
                <span className="font-semibold text-slate-800">
                  {result.candidate}
                </span>
              </p>
            </div>

            <div className="rounded-3xl bg-slate-950 px-8 py-6 text-center text-white">
              <p className="text-sm uppercase tracking-wider text-slate-300">
                Total Score
              </p>

              <h2 className="mt-2 text-5xl font-black">
                {result.score}
              </h2>

              <p className="mt-1 text-sm text-slate-300">
                out of {result.total}
              </p>
            </div>

          </div>
        </section>

        {/* SUMMARY */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">

          <div className="rounded-3xl bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-500">
              Total Questions
            </p>

            <h3 className="mt-3 text-4xl font-black text-slate-950">
              {result.total}
            </h3>
          </div>

          <div className="rounded-3xl bg-emerald-50 p-6 shadow-lg">
            <p className="text-sm text-slate-500">
              Correct Answers
            </p>

            <h3 className="mt-3 text-4xl font-black text-emerald-600">
              {result.correct}
            </h3>
          </div>

          <div className="rounded-3xl bg-rose-50 p-6 shadow-lg">
            <p className="text-sm text-slate-500">
              Wrong Answers
            </p>

            <h3 className="mt-3 text-4xl font-black text-rose-600">
              {result.wrong}
            </h3>
          </div>

          <div className="rounded-3xl bg-yellow-50 p-6 shadow-lg">
            <p className="text-sm text-slate-500">
              Unattempted
            </p>

            <h3 className="mt-3 text-4xl font-black text-yellow-600">
              {result.unattempted}
            </h3>
          </div>

          <div className="rounded-3xl bg-slate-50 p-6 shadow-lg">
            <p className="text-sm text-slate-500">
              Accuracy
            </p>

            <h3 className="mt-3 text-4xl font-black text-slate-950">
              {result.accuracy}%
            </h3>
          </div>

        </section>

        {/* VIOLATIONS */}
        <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">

          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-950">
              Violation Report
            </h2>

            <span className="rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-600">
              {result.violations?.length || 0} Violations
            </span>
          </div>

          <div className="mt-5 space-y-3">

            {result.violations?.length ? (
              result.violations.map((violation, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-red-100 bg-red-50 p-4"
                >
                  <p className="font-semibold text-red-700">
                    {typeof violation === "string"
                      ? violation
                      : violation.type || "Violation Detected"}
                  </p>

                  {violation.timestamp && (
                    <p className="mt-1 text-sm text-red-500">
                      {violation.timestamp}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <p className="text-sm text-slate-600">
                  No violations detected.
                </p>
              </div>
            )}

          </div>
        </section>

        {/* SECTION RESULTS */}
        <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">

          <h2 className="text-2xl font-bold text-slate-950">
            Section Wise Result
          </h2>

          <div className="mt-6 space-y-4">

            {result.sectionResults?.length ? (
              result.sectionResults.map((section, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-5"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">
                      {section.name}
                    </h3>

                    <span className="rounded-full bg-blue-100 px-4 py-1 text-sm font-semibold text-blue-600">
                      {section.score}%
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">

                    <div>
                      <p className="text-sm text-slate-500">
                        Correct
                      </p>

                      <p className="text-xl font-black text-emerald-600">
                        {section.correct}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">
                        Wrong
                      </p>

                      <p className="text-xl font-black text-rose-600">
                        {section.wrong}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">
                        Unattempted
                      </p>

                      <p className="text-xl font-black text-yellow-600">
                        {section.unattempted}
                      </p>
                    </div>

                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <p className="text-sm text-slate-600">
                  No section wise result available.
                </p>
              </div>
            )}

          </div>
        </section>

        {/* EXPLANATIONS */}
        <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">

          <h2 className="text-2xl font-bold text-slate-950">
            Explanation for Wrong Answers
          </h2>

          <div className="mt-6 space-y-4">

            {result.explanations?.length ? (
              result.explanations.map((item) => (
                <div
                  key={item.questionId}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-5"
                >
                  <p className="font-semibold text-slate-900">
                    {item.question}
                  </p>

                  <p className="mt-3 text-sm text-slate-600">
                    Your answer:{" "}
                    {item.submittedAnswer || "Not answered"}
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    Correct answer:{" "}
                    {item.correctAnswer || "See explanation"}
                  </p>

                  <p className="mt-3 text-sm font-medium text-slate-700">
                    {item.explanation}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <p className="text-sm text-slate-600">
                  No wrong answers to explain.
                </p>
              </div>
            )}

          </div>

          {/* BUTTONS */}
          <div className="mt-8 flex flex-wrap gap-3">

            <Link
              to="/candidate"
              className="rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white"
            >
              Back to Dashboard
            </Link>

            <Link
              to="/test"
              className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700"
            >
              Review Test
            </Link>

          </div>

        </section>

      </div>
    </div>
  );
}

export default ResultPage;