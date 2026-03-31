function isAnswered(question, value) {
  if ((question.type || "mcq") === "mcq") {
    return typeof value === "number";
  }

  return typeof value === "string" && value.trim().length > 0;
}

function buildSubmissionResult(questions, answers, metadata = {}) {
  const gradableQuestions = questions.filter((question) => (question.type || "mcq") === "mcq");
  const correctAnswers = gradableQuestions.reduce((count, question) => {
    const expectedAnswer = question.answer ?? question.correctOption;
    return count + (answers[question.id] === expectedAnswer ? 1 : 0);
  }, 0);

  const attemptedQuestions = questions.reduce((count, question) => count + (isAnswered(question, answers[question.id]) ? 1 : 0), 0);
  const totalQuestions = questions.length;
  const score = gradableQuestions.length ? Math.round((correctAnswers / gradableQuestions.length) * 100) : 0;

  return {
    testName: metadata.testName,
    totalQuestions,
    attemptedQuestions,
    correctAnswers,
    mcqQuestions: gradableQuestions.length,
    subjectiveQuestions: totalQuestions - gradableQuestions.length,
    answers,
    score,
    submittedAt: new Date().toISOString()
  };
}

function SubmissionHandler({ questions, answers, onSubmit, disabled, metadata, label = "Submit Test" }) {
  const attemptedQuestions = questions.reduce((count, question) => count + (isAnswered(question, answers[question.id]) ? 1 : 0), 0);

  const handleSubmit = () => {
    const result = buildSubmissionResult(questions, answers, metadata);
    onSubmit?.(result);
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleSubmit}
      className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {label} ({attemptedQuestions}/{questions.length})
    </button>
  );
}

export { buildSubmissionResult };
export default SubmissionHandler;
