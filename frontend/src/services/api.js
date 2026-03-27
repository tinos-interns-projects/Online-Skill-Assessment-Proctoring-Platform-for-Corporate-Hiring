const BASE_URL = "http://127.0.0.1:8000/api";

function buildUrl(endpoint, query = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

async function request(endpoint, options = {}) {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {})
  };

  const response = await fetch(buildUrl(endpoint, options.query), {
    method: options.method || "GET",
    headers,
    body: options.body ? (isFormData ? options.body : JSON.stringify(options.body)) : undefined
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message = data?.detail || data?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export const getQuestions = (params = {}) => request("/questions/", { query: params });
export const submitTest = (payload) => request("/submit/", { method: "POST", body: payload });
export const getResults = (params = {}) => request("/results/", { query: params });
export const uploadScreenshot = (payload) => request("/upload-screenshot/", { method: "POST", body: payload });
export const detectFace = (payload) => request("/detect-face/", { method: "POST", body: payload });
export const logViolation = (payload) => request("/log-violation/", { method: "POST", body: payload });

export const getEmployerStats = () => request("/employer/stats/");
export const getCandidates = () => request("/candidates/");
export const getEmployers = () => request("/employers/");
export const getAssessments = () => request("/assessments/");
export const createAssessment = (payload) => request("/assessments/", { method: "POST", body: payload });
export const deleteAssessment = (assessmentId) => request(`/assessments/${assessmentId}/`, { method: "DELETE" });
export const getAnalytics = () => request("/analytics/");

export async function register(payload) {
  return {
    token: `mock-token-${payload.role || "user"}`,
    user: {
      name: payload.fullName || payload.employerName || payload.companyName || "User",
      email: payload.email || payload.companyEmail || "",
      phoneNumber: payload.phoneNumber || "",
      passoutYear: payload.passoutYear || "",
      role: payload.role || "candidate"
    }
  };
}

export async function checkProctoringStatus() {
  try {
    return await request("/proctoring/check/");
  } catch (error) {
    return { multipleFaces: false, suspiciousActivity: false };
  }
}

const api = {
  BASE_URL,
  getQuestions,
  submitTest,
  getResults,
  uploadScreenshot,
  detectFace,
  logViolation,
  getEmployerStats,
  getCandidates,
  getEmployers,
  getAssessments,
  createAssessment,
  deleteAssessment,
  getAnalytics,
  register,
  checkProctoringStatus,
};

export default api;
