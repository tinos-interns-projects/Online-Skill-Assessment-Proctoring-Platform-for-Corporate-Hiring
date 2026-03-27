function isAnswered(value, type) {
  if (type === "mcq") {
    return typeof value === "number";
  }

  return typeof value === "string" && value.trim().length > 0;
}

function QuestionEngine({ questions, currentQuestion, answers, onSelectAnswer, onQuestionChange }) {
  const activeQuestion = questions[currentQuestion];

  if (!activeQuestion) {
    return null;
  }

  const activeType = activeQuestion.type || "mcq";
  const activeAnswer = answers[activeQuestion.id];

  const renderQuestionInput = () => {
    if (activeType === "coding") {
      return (
        <textarea
          value={typeof activeAnswer === "string" ? activeAnswer : ""}
          onChange={(event) => onSelectAnswer(activeQuestion.id, event.target.value)}
          placeholder="Write your code here..."
          className="min-h-[360px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 font-mono text-sm text-slate-700 outline-none transition focus:border-slate-300"
        />
      );
    }

    if (activeType === "descriptive") {
      return (
        <textarea
          value={typeof activeAnswer === "string" ? activeAnswer : ""}
          onChange={(event) => onSelectAnswer(activeQuestion.id, event.target.value)}
          placeholder="Write your answer here..."
          className="min-h-[220px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 outline-none transition focus:border-slate-300"
        />
      );
    }

    return (
      <div className="space-y-3">
        {(activeQuestion.options || []).map((option, index) => {
          const selected = activeAnswer === index;

          return (
            <button
              key={`${activeQuestion.id}-${index}`}
              type="button"
              onClick={() => onSelectAnswer(activeQuestion.id, index)}
              className={`flex w-full items-center rounded-2xl border px-4 py-4 text-left text-sm font-medium transition ${
                selected
                  ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
          Question {currentQuestion + 1} of {questions.length}
        </p>
        <h2 className="mt-3 text-2xl font-bold text-slate-950">{activeQuestion.question}</h2>
        <div className="mt-3 inline-flex rounded-full bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          {activeType === "coding" ? "Coding Question" : activeType === "descriptive" ? "Descriptive Question" : "Multiple Choice"}
        </div>
        <div className="mt-6">{renderQuestionInput()}</div>
      </div>

      <aside className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Question Navigation</p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {questions.map((question, index) => {
            const answered = isAnswered(answers[question.id], question.type || "mcq");
            const active = index === currentQuestion;

            return (
              <button
                key={question.id}
                type="button"
                onClick={() => onQuestionChange(index)}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-slate-950 bg-slate-950 text-white"
                    : answered
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

export default QuestionEngine;
