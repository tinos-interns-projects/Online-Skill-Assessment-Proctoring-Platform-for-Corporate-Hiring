import { BrowserRouter, Route, Routes } from "react-router-dom";
import ScrollToHash from "./components/ScrollToHash.jsx";
import ProtectedRoute from "./components/ProtectedRoute.js";
import LandingPage from "./pages/LandingPage.jsx";
import Login from "./pages/Login.jsx";
import RoleSelection from "./pages/RoleSelection.jsx";
import CandidateSignup from "./pages/CandidateSignup.jsx";
import EmployerSignup from "./pages/EmployerSignup.jsx";
import RemoteProctoring from "./pages/RemoteProctoring.jsx";
import CodingAssessment from "./pages/CodingAssessment.jsx";
import AptitudeTests from "./pages/AptitudeTests.jsx";
import HiringAssessments from "./pages/HiringAssessments.jsx";
import EmployeeSkillTesting from "./pages/EmployeeSkillTesting.jsx";
import TestLibrary from "./pages/TestLibrary.jsx";
import Pricing from "./pages/Pricing.jsx";
import Blog from "./pages/Blog.jsx";
import Documentation from "./pages/Documentation.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import EmployerDashboard from "./pages/EmployerDashboard.jsx";
import CandidateDashboard from "./pages/CandidateDashboard.jsx";
import TestInterface from "./pages/TestInterface.jsx";
import ResultPage from "./pages/ResultPage.jsx";
import AdminHome from "./pages/admin/Dashboard.jsx";
import AdminEmployers from "./pages/admin/Employers.jsx";
import AdminCandidates from "./pages/admin/Candidates.jsx";
import AdminAssessments from "./pages/admin/Assessments.jsx";
import AdminReports from "./pages/admin/Reports.jsx";
import AdminSettings from "./pages/admin/Settings.jsx";

function App() {
  return (
    <BrowserRouter>
      <ScrollToHash />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<RoleSelection />} />
        <Route path="/signup/candidate" element={<CandidateSignup />} />
        <Route path="/signup/employer" element={<EmployerSignup />} />
        <Route path="/proctoring" element={<RemoteProctoring />} />
        <Route path="/coding-assessment" element={<CodingAssessment />} />
        <Route path="/aptitude-tests" element={<AptitudeTests />} />
        <Route path="/hiring" element={<HiringAssessments />} />
        <Route path="/skill-testing" element={<EmployeeSkillTesting />} />
        <Route path="/test-library" element={<TestLibrary />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/resources/blog" element={<Blog />} />
        <Route path="/resources/docs" element={<Documentation />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminHome />} />
          <Route path="employers" element={<AdminEmployers />} />
          <Route path="candidates" element={<AdminCandidates />} />
          <Route path="assessments" element={<AdminAssessments />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route
          path="/employer"
          element={
            <ProtectedRoute allowedRole="employer">
              <EmployerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/candidate"
          element={
            <ProtectedRoute allowedRole="candidate">
              <CandidateDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/test"
          element={
            <ProtectedRoute allowedRole="candidate">
              <TestInterface />
            </ProtectedRoute>
          }
        />
        <Route
          path="/result"
          element={
            <ProtectedRoute allowedRole="candidate">
              <ResultPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
