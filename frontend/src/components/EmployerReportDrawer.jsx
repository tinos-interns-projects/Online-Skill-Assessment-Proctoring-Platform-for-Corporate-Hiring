function EmployerReportDrawer({ report, onClose }) {
  if (!report) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 px-4 py-8">
      <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Candidate Report</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">{report.test.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
            Close
          </button>
        </div>

        <div className="grid flex-1 gap-6 overflow-y-auto px-6 py-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <section className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-lg font-bold text-slate-950">Candidate Information</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">Candidate: {report.candidate.name}</div>
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">Email: {report.candidate.email || "N/A"}</div>
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">Exam Date: {new Date(report.test.examDateTime).toLocaleString()}</div>
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">Duration: {report.test.durationMinutes} mins</div>
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-lg font-bold text-slate-950">Performance Metrics</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-white px-4 py-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Total Score</p><p className="mt-2 text-2xl font-black text-slate-950">{report.performance.totalScore}</p></div>
                <div className="rounded-2xl bg-white px-4 py-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Accuracy</p><p className="mt-2 text-2xl font-black text-slate-950">{report.performance.accuracy}%</p></div>
                <div className="rounded-2xl bg-white px-4 py-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Attempted</p><p className="mt-2 text-2xl font-black text-slate-950">{report.performance.attemptedQuestions}</p></div>
                <div className="rounded-2xl bg-white px-4 py-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Correct</p><p className="mt-2 text-2xl font-black text-slate-950">{report.performance.correctAnswers}</p></div>
                <div className="rounded-2xl bg-white px-4 py-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Wrong</p><p className="mt-2 text-2xl font-black text-slate-950">{report.performance.wrongAnswers}</p></div>
                <div className="rounded-2xl bg-white px-4 py-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Unattempted</p><p className="mt-2 text-2xl font-black text-slate-950">{report.performance.unattemptedQuestions}</p></div>
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-lg font-bold text-slate-950">Coding Performance</h3>
              <div className="mt-4 space-y-4">
                {report.codingPerformance.length ? report.codingPerformance.map((item) => (
                  <article key={item.questionId} className="rounded-2xl bg-white p-4">
                    <p className="font-semibold text-slate-900">{item.question}</p>
                    <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">{item.codeSubmitted || "No code submitted."}</pre>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">Output: {item.output || "N/A"}</div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">Passed: {item.testCasesPassed}/{item.totalTestCases}</div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">Score: {item.score}</div>
                    </div>
                  </article>
                )) : <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">No coding answers submitted.</div>}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-lg font-bold text-slate-950">Section Performance</h3>
              <div className="mt-4 space-y-3">
                {report.sectionPerformance.map((item) => (
                  <div key={item.sectionType} className="rounded-2xl bg-white px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="text-sm font-semibold text-emerald-700">{item.percentage}%</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{item.correctAnswers}/{item.totalQuestions} correct</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-lg font-bold text-slate-950">Proctoring Violations</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-white px-4 py-4 text-sm text-slate-700">Total violations: {report.proctoring.totalViolations}</div>
                <div className="rounded-2xl bg-white px-4 py-4 text-sm text-slate-700">
                  Auto-submitted due to violations: {report.proctoring.autoSubmittedDueToViolations ? "Yes" : "No"}
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {report.proctoring.violationTypes.length ? report.proctoring.violationTypes.map((item) => (
                  <div key={item.activity_type} className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
                    {item.activity_type}: {item.count}
                  </div>
                )) : <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">No violations recorded.</div>}
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-lg font-bold text-slate-950">Webcam Evidence</h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {report.proctoring.webcamEvidence.length ? report.proctoring.webcamEvidence.map((item, index) => (
                  <div key={`${item.url}-${index}`} className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
                    <img src={item.url} alt="Violation evidence" className="h-28 w-full object-cover" />
                    <p className="px-3 py-2 text-[11px] text-slate-500">{new Date(item.timestamp).toLocaleString()}</p>
                  </div>
                )) : <div className="col-span-2 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">No webcam evidence available.</div>}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployerReportDrawer;
