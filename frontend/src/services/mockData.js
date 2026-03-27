export const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "employer", label: "Employer" },
  { value: "candidate", label: "Candidate" }
];

export const adminStats = [
  { label: "Users", value: 248, change: "+14 this week", tone: "cyan" },
  { label: "Questions", value: 1240, change: "+86 added", tone: "emerald" },
  { label: "Tests", value: 64, change: "12 active now", tone: "amber" },
  { label: "Results", value: 1936, change: "91% completion", tone: "violet" },
  { label: "Violations", value: 37, change: "6 require review", tone: "rose" }
];

export const adminUsers = [
  { id: 1, name: "Maya Patel", role: "Employer", company: "Northstar Labs", status: "Active", email: "maya@northstar.ai" },
  { id: 2, name: "Aditya Rao", role: "Candidate", company: "Applied", status: "Invited", email: "aditya.rao@mail.com" },
  { id: 3, name: "Sarah Kim", role: "Employer", company: "BlueForge", status: "Active", email: "sarah@blueforge.io" },
  { id: 4, name: "Riya Sharma", role: "Candidate", company: "Applied", status: "Flagged", email: "riya.sharma@mail.com" },
  { id: 5, name: "Leo Martin", role: "Candidate", company: "Applied", status: "Completed", email: "leo.martin@mail.com" }
];

export const skills = ["React", "JavaScript", "Python", "SQL", "Data Structures", "Communication"];

export const topics = [
  { id: 1, name: "Hooks", skill: "React", questions: 84 },
  { id: 2, name: "Async Programming", skill: "JavaScript", questions: 56 },
  { id: 3, name: "ORM", skill: "Python", questions: 43 },
  { id: 4, name: "Joins", skill: "SQL", questions: 37 }
];

export const questions = [
  {
    id: "Q-101",
    topic: "Hooks",
    skill: "React",
    difficulty: "Medium",
    question: "Which hook is used to run side effects after render?",
    options: ["useMemo", "useEffect", "useRef", "useId"],
    answer: 1
  },
  {
    id: "Q-102",
    topic: "Async Programming",
    skill: "JavaScript",
    difficulty: "Hard",
    question: "What does Promise.all return if one promise rejects?",
    options: ["Resolved values", "Pending promise", "Rejected promise", "Array with null"],
    answer: 2
  },
  {
    id: "Q-103",
    topic: "Joins",
    skill: "SQL",
    difficulty: "Medium",
    question: "Which join returns matching rows from both tables only?",
    options: ["LEFT JOIN", "INNER JOIN", "FULL JOIN", "CROSS JOIN"],
    answer: 1
  },
  {
    id: "Q-104",
    topic: "Data Structures",
    skill: "JavaScript",
    difficulty: "Easy",
    question: "Which data structure follows FIFO?",
    options: ["Stack", "Queue", "Tree", "Graph"],
    answer: 1
  }
];

export const blueprints = [
  { id: "BP-01", name: "Frontend Engineer L1", skill: "React", duration: 45, questions: 20, antiCheat: "Strict" },
  { id: "BP-02", name: "Full Stack Screening", skill: "JavaScript", duration: 60, questions: 30, antiCheat: "Moderate" },
  { id: "BP-03", name: "Data Analyst SQL", skill: "SQL", duration: 35, questions: 18, antiCheat: "Strict" }
];

export const tests = [
  { id: "T-2026-11", name: "React Hiring Sprint", blueprint: "Frontend Engineer L1", candidates: 18, start: "2026-03-10 14:00", status: "Live" },
  { id: "T-2026-12", name: "SQL Hiring Sprint", blueprint: "Data Analyst SQL", candidates: 9, start: "2026-03-11 10:00", status: "Scheduled" },
  { id: "T-2026-13", name: "Graduate Screening", blueprint: "Full Stack Screening", candidates: 41, start: "2026-03-12 09:30", status: "Scheduled" }
];

export const results = [
  { id: 1, candidate: "Asha Nair", test: "React Hiring Sprint", score: 91, accuracy: 88, correct: 22, wrong: 3, unattempted: 0, status: "Passed" },
  { id: 2, candidate: "Daniel Roy", test: "React Hiring Sprint", score: 76, accuracy: 74, correct: 18, wrong: 5, unattempted: 2, status: "Review" },
  { id: 3, candidate: "Ishaan Verma", test: "SQL Hiring Sprint", score: 84, accuracy: 82, correct: 16, wrong: 2, unattempted: 0, status: "Passed" }
];

export const webcamCaptures = [
  { id: 1, candidate: "Daniel Roy", time: "2026-03-10 14:12:33", event: "TAB_SWITCH", image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80" },
  { id: 2, candidate: "Daniel Roy", time: "2026-03-10 14:14:07", event: "NO_FACE", image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80" },
  { id: 3, candidate: "Asha Nair", time: "2026-03-10 14:19:19", event: "MULTIPLE_FACE", image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=400&q=80" }
];

export const employerStats = [
  { label: "Assessments Created", value: 18 },
  { label: "Candidates Assigned", value: 92 },
  { label: "Live Tests", value: 7 },
  { label: "Avg Score", value: "82%" }
];

export const candidates = [
  { id: 11, name: "Asha Nair", email: "asha.nair@mail.com", stage: "Interview" },
  { id: 12, name: "Daniel Roy", email: "daniel.roy@mail.com", stage: "Screening" },
  { id: 13, name: "Farah Khan", email: "farah.k@mail.com", stage: "Applied" }
];

export const liveMonitoring = [
  { candidate: "Asha Nair", test: "React Hiring Sprint", status: "In Progress", score: 78, warnings: 0, timeLeft: "18m 20s" },
  { candidate: "Daniel Roy", test: "React Hiring Sprint", status: "Under Review", score: 69, warnings: 3, timeLeft: "12m 02s" },
  { candidate: "Farah Khan", test: "SQL Hiring Sprint", status: "Completed", score: 87, warnings: 1, timeLeft: "00m 00s" }
];

export const assignedTests = [
  { id: 301, name: "React Hiring Sprint", skill: "React", duration: 45, questions: 25, startTime: "2026-03-10 14:00", status: "Live", score: null },
  { id: 302, name: "JavaScript Fundamentals", skill: "JavaScript", duration: 30, questions: 15, startTime: "2026-03-12 11:00", status: "Scheduled", score: null },
  { id: 303, name: "SQL Hiring Sprint", skill: "SQL", duration: 35, questions: 18, startTime: "2026-03-08 10:00", status: "Completed", score: 84 }
];

export const candidateResultSummary = {
  candidateName: "Daniel Roy",
  testName: "React Hiring Sprint",
  score: 76,
  accuracy: 74,
  correctAnswers: 18,
  wrongAnswers: 5,
  unattemptedQuestions: 2,
  percentile: 68,
  outcome: "Shortlisted with review"
};

export const proctoringViolations = ["TAB_SWITCH", "MULTIPLE_FACE", "NO_FACE"];

export const webcamEvidence = [
  { id: 1, timestamp: "2026-03-10 14:12:33", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80" },
  { id: 2, timestamp: "2026-03-10 14:14:07", image: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=400&q=80" },
  { id: 3, timestamp: "2026-03-10 14:15:41", image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80" }
];

export const testQuestions = [
  {
    id: 1,
    question: "What is the main purpose of React state?",
    options: [
      "To persist data in the database",
      "To store mutable data that drives UI updates",
      "To style components",
      "To route pages"
    ],
    answer: 1
  },
  {
    id: 2,
    question: "Which Tailwind utility applies a flex container?",
    options: ["items-center", "grid", "flex", "justify-between"],
    answer: 2
  },
  {
    id: 3,
    question: "Which API is typically used to access the webcam in the browser?",
    options: ["navigator.bluetooth", "navigator.mediaDevices.getUserMedia", "window.captureVideo", "document.camera"],
    answer: 1
  },
  {
    id: 4,
    question: "What should happen when a user switches tabs during a proctored test?",
    options: [
      "Nothing",
      "The app should log a proctoring warning",
      "The test should always delete answers",
      "The browser should close"
    ],
    answer: 1
  }
];

export const analyticsSummary = {
  completionRate: 91,
  flaggedSessions: 8,
  averageScore: 79,
  passRate: 63
};

export const analyticsTrend = [
  { week: "Week 1", scores: 68, warnings: 12 },
  { week: "Week 2", scores: 73, warnings: 9 },
  { week: "Week 3", scores: 78, warnings: 7 },
  { week: "Week 4", scores: 81, warnings: 6 }
];

export const analyticsBySkill = [
  { skill: "React", average: 84 },
  { skill: "JavaScript", average: 79 },
  { skill: "SQL", average: 76 },
  { skill: "Python", average: 72 }
];

export const analyticsViolationSplit = [
  { name: "TAB_SWITCH", value: 18 },
  { name: "NO_FACE", value: 11 },
  { name: "MULTIPLE_FACE", value: 8 }
];

export const mockAssessments = assignedTests.map((test) => ({
  id: test.id,
  title: test.name,
  durationMinutes: test.duration,
  skill: test.skill,
  difficulty: "Medium",
  questions: testQuestions.map((question) => ({
    ...question,
    correctOption: question.answer
  }))
}));

export const mockResults = results.map((result) => ({
  assessmentId: result.id,
  title: result.test,
  score: result.score,
  totalQuestions: result.correct + result.wrong + result.unattempted,
  attempted: result.correct + result.wrong,
  sectionBreakdown: analyticsBySkill.map((item) => ({
    section: item.skill,
    score: item.average
  }))
}));

export const mockMonitorData = liveMonitoring.map((item) => ({
  candidate: item.candidate,
  assessment: item.test,
  status: item.status,
  elapsed: item.timeLeft
}));

export const mockAnalytics = {
  rankings: results
    .map((result) => ({
      name: result.candidate,
      score: result.score
    }))
    .sort((left, right) => right.score - left.score),
  sectionScores: analyticsBySkill.map((item) => ({
    section: item.skill,
    avgScore: item.average
  })),
  trend: analyticsTrend.map((item) => ({
    week: item.week,
    avg: item.scores
  }))
};
