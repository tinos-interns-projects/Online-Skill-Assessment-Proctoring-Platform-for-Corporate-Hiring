import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import QuestionEngine from "../components/QuestionEngine.jsx";
import SubmissionHandler from "../components/SubmissionHandler.jsx";
import TimerSystem from "../components/TimerSystem.jsx";
import { detectFace, getQuestions, logViolation, submitTest, uploadScreenshot } from "../services/api.js";

const ACTIVE_TAB_KEY = "skillassess-active-exam-tab";

function normalizeQuestion(question, index) {
  const fallbackType = Array.isArray(question?.options) && question.options.length ? "mcq" : "descriptive";
  const type = question?.type || fallbackType;

  return {
    ...question,
    id: question?.id ?? `question-${index + 1}`,
    type,
    question: question?.question || `Question ${index + 1}`,
    options: type === "mcq" ? (Array.isArray(question?.options) ? question.options : []) : [],
    answer: question?.answer ?? question?.correctOption
  };
}

function TestInterface() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const submittedRef = useRef(false);
  const submittingRef = useRef(false);
  const violationTimestampsRef = useRef({});
  const timeLeftRef = useRef(0);
  const tabIdRef = useRef(`exam-tab-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [violations, setViolations] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const assessmentDurationSeconds = useMemo(() => assessment?.remainingSeconds || (assessment?.durationMinutes || 20) * 60, [assessment]);

  const handleSelectAnswer = (questionId, value) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const moveToNextQuestion = () => {
    setCurrentQuestion((current) => Math.min(current + 1, Math.max(questions.length - 1, 0)));
  };

  const sendViolationToBackend = async (activityType) => {
    if (!assessment?.attemptId) {
      return;
    }

    try {
      await logViolation({ attemptId: assessment.attemptId, activityType });
    } catch (logError) {
      // Keep the exam running even if logging fails.
    }
  };

  const registerViolation = (message, key = message, activityType = "GENERAL_VIOLATION") => {
    if (submittedRef.current) {
      return;
    }

    const now = Date.now();
    const lastSeen = violationTimestampsRef.current[key] || 0;
    if (now - lastSeen < 1500) {
      setStatusMessage(message);
      return;
    }

    violationTimestampsRef.current[key] = now;
    setViolations((current) => current + 1);
    setStatusMessage(message);
    moveToNextQuestion();
    void sendViolationToBackend(activityType);
  };

  const captureFrameData = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      return null;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  };

  const finalizeSubmission = async (options = {}) => {
    if (submittedRef.current || submittingRef.current || !assessment) {
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setStatusMessage(options.autoSubmitted ? options.message || "Submitting test..." : "Submitting test...");

    try {
      const response = await submitTest({
        assessmentId: assessment.id,
        testId: assessment.testId,
        attemptId: assessment.attemptId,
        answers,
        timeTaken: Math.max(assessmentDurationSeconds - timeLeftRef.current, 0),
        violationsCount: violations,
      });

      submittedRef.current = true;
      setHasSubmitted(true);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const activeTab = localStorage.getItem(ACTIVE_TAB_KEY);
      if (activeTab) {
        try {
          const parsed = JSON.parse(activeTab);
          if (parsed.id === tabIdRef.current) {
            localStorage.removeItem(ACTIVE_TAB_KEY);
          }
        } catch (storageError) {
          localStorage.removeItem(ACTIVE_TAB_KEY);
        }
      }

      navigate("/result", {
        state: {
          resultId: response.resultId,
          submissionResult: response,
          autoSubmittedMessage: options.autoSubmitted ? options.message : "",
        }
      });
    } catch (submitError) {
      setStatusMessage(submitError.message || "Unable to submit test.");
      setError(submitError.message || "Unable to submit test.");
      submittedRef.current = false;
      setHasSubmitted(false);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const confirmAndSubmit = async () => {
    if (hasSubmitted || isSubmitting) {
      return;
    }

    const confirmed = window.confirm("Are you sure you want to submit your test?");
    if (!confirmed) {
      return;
    }

    await finalizeSubmission();
  };

  useEffect(() => {
    const loadQuestions = async () => {
      setLoading(true);
      setError("");
      setStatusMessage("");

      try {
        const response = await getQuestions();
        const nextQuestions = (response?.questions || []).map(normalizeQuestion);

        setAssessment({
          id: response?.assessmentId ?? null,
          title: response?.title || "Assessment",
          durationMinutes: response?.durationMinutes || 20,
          remainingSeconds: response?.remainingSeconds || (response?.durationMinutes || 20) * 60,
          scheduledStart: response?.scheduledStart || null,
          scheduledEnd: response?.scheduledEnd || null,
          attemptId: response?.attemptId || null,
          testId: response?.testId || null,
          observationMessage: response?.observationMessage || "You are under camera observation",
        });
        setQuestions(nextQuestions);
        setCurrentQuestion(0);
        setAnswers({});
        timeLeftRef.current = response?.remainingSeconds || (response?.durationMinutes || 20) * 60;
        setStatusMessage(response?.observationMessage || "You are under camera observation");
      } catch (loadError) {
        setError(loadError.message || "Unable to load questions.");
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        registerViolation("Warning: camera access is unavailable.", "camera-unavailable", "CAMERA_UNAVAILABLE");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraReady(true);

        stream.getVideoTracks().forEach((track) => {
          track.onended = () => registerViolation("Warning: camera was turned off.", "camera-ended", "CAMERA_OFF");
        });
      } catch (cameraError) {
        registerViolation("Warning: camera access is unavailable.", "camera-error", "CAMERA_ERROR");
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        registerViolation("Warning: tab switching detected.", "tab-switch", "TAB_SWITCH");
      }
    };

    const handleWindowBlur = () => {
      if (!document.hidden) {
        registerViolation("Warning: window focus lost.", "window-blur", "WINDOW_BLUR");
      }
    };

    const handleBlockedClipboardAction = (event) => {
      event.preventDefault();
      registerViolation(`Warning: ${event.type} is not allowed during the test.`, `clipboard-${event.type}`, event.type.toUpperCase());
      window.alert(`${event.type.charAt(0).toUpperCase()}${event.type.slice(1)} is disabled during the test.`);
    };

    const handleContextMenu = (event) => {
      event.preventDefault();
      registerViolation("Warning: right click is disabled during the test.", "context-menu", "RIGHT_CLICK");
    };

    const heartbeat = () => {
      const now = Date.now();

      try {
        const current = localStorage.getItem(ACTIVE_TAB_KEY);
        if (current) {
          const parsed = JSON.parse(current);
          if (parsed.id !== tabIdRef.current && now - parsed.timestamp < 4000) {
            registerViolation("Warning: multiple tabs detected.", "multi-tab", "MULTIPLE_TABS");
          }
        }
      } catch (storageError) {
        // Ignore malformed local storage and overwrite it below.
      }

      localStorage.setItem(ACTIVE_TAB_KEY, JSON.stringify({ id: tabIdRef.current, timestamp: now }));
    };

    const handleStorage = (event) => {
      if (event.key !== ACTIVE_TAB_KEY || !event.newValue) {
        return;
      }

      try {
        const parsed = JSON.parse(event.newValue);
        if (parsed.id !== tabIdRef.current && Date.now() - parsed.timestamp < 4000) {
          registerViolation("Warning: multiple tabs detected.", "multi-tab", "MULTIPLE_TABS");
        }
      } catch (storageError) {
        // Ignore malformed storage values.
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("copy", handleBlockedClipboardAction);
    document.addEventListener("paste", handleBlockedClipboardAction);
    document.addEventListener("cut", handleBlockedClipboardAction);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("storage", handleStorage);

    heartbeat();
    const heartbeatInterval = window.setInterval(heartbeat, 2000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("copy", handleBlockedClipboardAction);
      document.removeEventListener("paste", handleBlockedClipboardAction);
      document.removeEventListener("cut", handleBlockedClipboardAction);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("storage", handleStorage);
      window.clearInterval(heartbeatInterval);

      const current = localStorage.getItem(ACTIVE_TAB_KEY);
      if (!current) {
        return;
      }

      try {
        const parsed = JSON.parse(current);
        if (parsed.id === tabIdRef.current) {
          localStorage.removeItem(ACTIVE_TAB_KEY);
        }
      } catch (storageError) {
        localStorage.removeItem(ACTIVE_TAB_KEY);
      }
    };
  }, [questions.length, assessment?.attemptId]);

  useEffect(() => {
    if (!assessment?.attemptId || !cameraReady || hasSubmitted) {
      return undefined;
    }

    const screenshotInterval = window.setInterval(async () => {
      const imageData = captureFrameData();
      if (!imageData) {
        return;
      }

      try {
        await uploadScreenshot({ attemptId: assessment.attemptId, imageData });
      } catch (uploadError) {
        setStatusMessage((current) => current || "Unable to upload webcam screenshot right now.");
      }
    }, 10000);

    return () => window.clearInterval(screenshotInterval);
  }, [assessment?.attemptId, cameraReady, hasSubmitted]);

  useEffect(() => {
    if (!assessment?.attemptId || !cameraReady || hasSubmitted) {
      return undefined;
    }

    const faceInterval = window.setInterval(async () => {
      const imageData = captureFrameData();
      if (!imageData) {
        return;
      }

      try {
        const response = await detectFace({ attemptId: assessment.attemptId, imageData });
        if (response?.violation) {
          const key = response.reason === "multiple_faces" ? "multiple-faces" : "no-face";
          const type = response.reason === "multiple_faces" ? "MULTIPLE_FACES" : "NO_FACE";
          registerViolation(response.message || "Warning: face violation detected.", key, type);
        }
      } catch (faceError) {
        setStatusMessage((current) => current || "Unable to run face monitoring right now.");
      }
    }, 5000);

    return () => window.clearInterval(faceInterval);
  }, [assessment?.attemptId, cameraReady, hasSubmitted]);

  useEffect(() => {
    if (!assessment?.scheduledEnd || hasSubmitted || isSubmitting) {
      return undefined;
    }

    const scheduleInterval = window.setInterval(() => {
      if (Date.now() >= new Date(assessment.scheduledEnd).getTime()) {
        void finalizeSubmission({
          autoSubmitted: true,
          message: "Exam ended"
        });
      }
    }, 1000);

    return () => window.clearInterval(scheduleInterval);
  }, [assessment?.scheduledEnd, hasSubmitted, isSubmitting]);

  useEffect(() => {
    if (violations >= 3 && !submittedRef.current && questions.length) {
      void finalizeSubmission({
        autoSubmitted: true,
        message: "Test auto-submitted due to violations"
      });
    }
  }, [violations, questions.length]);

  if (loading) {
    return <p className="p-6 text-sm text-slate-600">Loading assessment...</p>;
  }

  if (error || !assessment || !questions.length) {
    return <p className="p-6 text-sm text-rose-600">{error || "No assessment is available right now."}</p>;
  }

  return (
    <TimerSystem
      durationSeconds={assessmentDurationSeconds}
      isRunning={!hasSubmitted && !isSubmitting}
      onExpire={() =>
        void finalizeSubmission({
          autoSubmitted: true,
          message: "Exam ended"
        })
      }
    >
      {({ formattedTime, timeLeft }) => {
        timeLeftRef.current = timeLeft;

        return (
          <div className="min-h-screen bg-slate-50 px-4 py-10">
            <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_320px]">
              <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
                {statusMessage ? <p className="mb-6 text-sm font-semibold text-rose-600">{statusMessage}</p> : null}

                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Test Interface</p>
                    <h1 className="mt-2 text-3xl font-black text-slate-950">{assessment.title}</h1>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-full bg-slate-50 px-5 py-2 text-sm font-semibold text-slate-700">
                      Question {currentQuestion + 1}/{questions.length}
                    </div>
                    <div className="rounded-full bg-slate-50 px-5 py-2 text-sm font-semibold text-slate-700">Violations: {violations}</div>
                    <div className="rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white">{formattedTime}</div>
                  </div>
                </div>

                <div className="mt-8">
                  <QuestionEngine
                    questions={questions}
                    currentQuestion={currentQuestion}
                    answers={answers}
                    onSelectAnswer={handleSelectAnswer}
                    onQuestionChange={setCurrentQuestion}
                  />
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={currentQuestion === 0 || isSubmitting}
                    onClick={() => setCurrentQuestion((current) => Math.max(current - 1, 0))}
                    className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentQuestion === questions.length - 1 || isSubmitting}
                    onClick={() => setCurrentQuestion((current) => Math.min(current + 1, questions.length - 1))}
                    className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                  <SubmissionHandler
                    questions={questions}
                    answers={answers}
                    onSubmit={confirmAndSubmit}
                    disabled={hasSubmitted || isSubmitting}
                    metadata={{ testName: assessment.title }}
                  />
                </div>
              </section>

              <aside className="rounded-[28px] bg-slate-950 p-6 text-white shadow-lg shadow-slate-900/15">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-bold">Monitor Candidate Session</h2>
                  <div className="h-24 w-24 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                  </div>
                </div>
                <div className="mt-5 flex h-64 items-center justify-center rounded-[24px] border border-white/10 bg-white/5 text-center text-sm text-slate-300">{cameraReady ? "Webcam monitoring active" : "Requesting camera access"}</div>
                <p className="mt-4 text-sm text-slate-300">{assessment.observationMessage || "You are under camera observation"}</p>
                <p className="mt-4 text-sm text-slate-300">AI proctoring observes tab switches, multiple tabs, face visibility, camera status, restricted clipboard actions, right-click attempts, and focus changes.</p>
                <Link to="/candidate" className="mt-6 inline-flex rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white">Exit Test</Link>
              </aside>
            </div>
          </div>
        );
      }}
    </TimerSystem>
  );
}

export default TestInterface;
