import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  const { token } = useParams();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const submittedRef = useRef(false);
  const submittingRef = useRef(false);
  const sectionSubmittingRef = useRef(false);
  const violationTimestampsRef = useRef({});
  const timeLeftRef = useRef(0);
  const tabIdRef = useRef(`exam-tab-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const startTimeRef = useRef(Date.now());
  const [assessment, setAssessment] = useState(null);
  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
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
  const [examStatus, setExamStatus] = useState(null);
  const [examNotStarted, setExamNotStarted] = useState(false);
  const [scheduledStart, setScheduledStart] = useState(null);
  const [countdown, setCountdown] = useState(null);
  
  useEffect(() => {
    if (!examNotStarted) return;
    if (!scheduledStart) return;

    const interval = setInterval(() => {
      const diff = new Date(scheduledStart) - new Date();

      if (diff <= 0) {
        clearInterval(interval);
        setExamNotStarted(false);
        loadAssessment();
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      setCountdown(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(interval);

  }, [scheduledStart, examNotStarted]);


  const activeSectionDurationSeconds = useMemo(() => {
    if (!activeSection) return 0;

    // ✅ ONLY section time
    return (activeSection.timeLimitMinutes || 20) * 60;
  }, [activeSection]);
  

  const isFinalSection = useMemo(() => {
    if (!activeSection || !sections.length) {
      return true;
    }

    const activeIndex = sections.findIndex((section) => String(section.id) === String(activeSection.id));
    return activeIndex === sections.length - 1;
  }, [activeSection, sections]);

  const handleSelectAnswer = (questionId, value) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const moveToNextQuestion = () => {
    setCurrentQuestion((current) => Math.min(current + 1, Math.max(questions.length - 1, 0)));
  };

  const buildSectionAnswerPayload = () =>
    questions.reduce((payload, question) => {
      if (Object.prototype.hasOwnProperty.call(answers, question.id)) {
        payload[question.id] = answers[question.id];
      }
      return payload;
    }, {});

  const loadAssessment = async (sectionId) => {
    console.log("Invite token:", token);

    const response = await getQuestions({
      token,
    ...(sectionId ? { section_id: sectionId } : {})
    });


    console.log("API RESPONSE:", response);

    // HANDLE EXAM NOT STARTED
    if (response?.status === "not_started") {

      setExamNotStarted(true);
      setScheduledStart(response.scheduledStart);

      setStatusMessage("Exam not started yet. Waiting for start time...");

      return;
    }

    const nextQuestions = (response?.questions || []).map(normalizeQuestion);
    const nextSections = response?.sections || [];
    let nextActiveSection = null;

    // ✅ If loading next section → use sectionId
    if (sectionId) {
      nextActiveSection =
        response?.activeSection ||
        nextSections.find((section) => String(section.id) === String(sectionId));
    } else {
    // ✅ First time → always start from first section
        nextActiveSection = nextSections[0] || null;
    }

    setAssessment({
      id: response?.assessmentId ?? null,
      title: response?.title || "Assessment",
      durationMinutes: response?.durationMinutes || 20,
      remainingSeconds: response?.remainingSeconds || (response?.durationMinutes || 20) * 60,
      overallRemainingSeconds: response?.overallRemainingSeconds || response?.remainingSeconds || 0,
      scheduledStart: response?.scheduledStart || null,
      scheduledEnd: response?.scheduledEnd || null,
      attemptId: response?.attemptId || null,
      testId: response?.testId || null,
      observationMessage: response?.observationMessage || "You are under camera observation"
    });
    setSections(nextSections);
    setActiveSection(nextActiveSection);
    setQuestions(nextQuestions);
    setCurrentQuestion(0);
    timeLeftRef.current = nextActiveSection?.remainingSeconds || response?.remainingSeconds || 0;
    setStatusMessage(response?.observationMessage || "You are under camera observation");
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

    // ✅ Ignore first 5 seconds after exam start
    if (now - startTimeRef.current < 5000) {
      return;
    }

    const lastSeen = violationTimestampsRef.current[key] || 0;

    // ✅ Increase cooldown to prevent spam
    if (now - lastSeen < 5000) {
      return;
    }

    violationTimestampsRef.current[key] = now;
    setViolations((prev) => {
      const newCount = prev + 1;

      if (newCount >= 3) {
        setStatusMessage("Too many violations!");
      }

      return newCount;
     });
    setStatusMessage(message);
    
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


  const finalizeWholeAssessment = async (options = {}) => {

  // ✅ ONLY duplicate protection here
  if (submittedRef.current || submittingRef.current) {
    console.log("⛔ BLOCKED duplicate submit");
    return;
  }

  // ✅ separate validation
  if (!assessment?.attemptId) return;

  submittingRef.current = true;
  setIsSubmitting(true);

    try {
      const response = await submitTest({
        assessmentId: assessment.id,
        testId: assessment.testId,
        attemptId: assessment.attemptId,
        answers,
        timeTaken: Math.max(assessment.durationSeconds - timeLeftRef.current, 0),
        violationsCount: violations,
        autoSubmitted: options.autoSubmitted || false,
        autoSubmitReason: options.autoSubmitReason || ""
      });

      submittedRef.current = true;
      setHasSubmitted(true);

      navigate("/result", { state: response });

    } catch (error) {
      console.error("Submit failed", error);
      setStatusMessage("Submission failed. Try again.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const submitCurrentSection = async (options = {}) => {
    console.log("🚨 SUBMIT CALLED", {
      activeSection,
      attemptId: assessment?.attemptId,
      timeLeft: timeLeftRef.current
    });
    

    
    if (
      submittedRef.current ||
      sectionSubmittingRef.current ||
      !assessment?.attemptId ||
      !activeSection?.id
    ) {
      return;
    }

    sectionSubmittingRef.current = true;
    setIsSubmitting(true);
    setStatusMessage(options.message || `Submitting ${activeSection.title || "section"}...`);

    try {
      const response = await submitTest({
        assessmentId: assessment.id,
        testId: assessment.testId,
        attemptId: assessment.attemptId,
        sectionId: activeSection?.id,
        answers: buildSectionAnswerPayload(),
        timeTaken: Math.max(((activeSection.timeLimitMinutes || assessment.durationMinutes || 20) * 60) - timeLeftRef.current, 0),
        violationsCount: violations,
        autoSubmitted: options.autoSubmitted
      });

      if (response?.status === "section_saved" && response?.nextSectionId) {
        setActiveSection(null);
        setQuestions([]);
        setCurrentQuestion(0);
        await loadAssessment(response.nextSectionId);
        setStatusMessage(options.message || `${activeSection.title} submitted. Moving to the next section.`);
        return;
      }

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
          autoSubmittedMessage: options.autoSubmitted ? options.message : ""
        }
      });
    } catch (submitError) {
      setStatusMessage(submitError.message || "Unable to submit section.");
      setError(submitError.message || "Unable to submit section.");
    } finally {
      sectionSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const confirmAndSubmit = async () => {
    if (hasSubmitted || isSubmitting) {
      return;
    }

    const label = isFinalSection ? "submit your test" : `submit the ${activeSection?.title || "current"} section`;
    const confirmed = window.confirm(`Are you sure you want to ${label}?`);
    if (!confirmed) {
      return;
    }

    await submitCurrentSection({
      message: isFinalSection ? "Submitting final section..." : `Submitting ${activeSection?.title || "section"}...`
    });
  };

  useEffect(() => {
    const loadQuestions = async () => {
      setLoading(true);
      setError("");
      setStatusMessage("");

      try {
        await loadAssessment();
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

    //heartbeat();
    //const heartbeatInterval = window.setInterval(heartbeat, 2000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("copy", handleBlockedClipboardAction);
      document.removeEventListener("paste", handleBlockedClipboardAction);
      document.removeEventListener("cut", handleBlockedClipboardAction);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("storage", handleStorage);
      

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

    //const screenshotInterval = window.setInterval(async () => {
      //const imageData = captureFrameData();
      //if (!imageData) {
       // return;
      //}

      //try {
        //await uploadScreenshot({ attemptId: assessment.attemptId, imageData });
      //} catch (uploadError) {
        //setStatusMessage((current) => current || "Unable to upload webcam screenshot right now.");
      //}
    //}, 10000);

    //return () => window.clearInterval(screenshotInterval);
  }, [assessment?.attemptId, cameraReady, hasSubmitted]);

  useEffect(() => {
    if (!assessment?.attemptId || !cameraReady || hasSubmitted) {
      return undefined;
    }

    //const faceInterval = window.setInterval(async () => {
      //const imageData = captureFrameData();
      //if (!imageData) {
        //return;
      //}

      //try {
        //const response = await detectFace({ attemptId: assessment.attemptId, imageData });
        //if (response?.violation) {
          //const key = response.reason === "multiple_faces" ? "multiple-faces" : "no-face";
          //const type = response.reason === "multiple_faces" ? "MULTIPLE_FACES" : "NO_FACE";
          //registerViolation(response.message || "Warning: face violation detected.", key, type);
        //}
      //} catch (faceError) {
        //setStatusMessage((current) => current || "Unable to run face monitoring right now.");
      //}
    //}, 5000);

    //return () => window.clearInterval(faceInterval);
  }, [assessment?.attemptId, cameraReady, hasSubmitted]);

  useEffect(() => {
    if (!assessment?.scheduledEnd || hasSubmitted || isSubmitting) {
      return undefined;
    }

    const scheduleInterval = window.setInterval(() => {
      if (Date.now() >= new Date(assessment.scheduledEnd).getTime()) {
        void finalizeWholeAssessment({
          autoSubmitted: true,
          message: "Assessment time ended",
          autoSubmitReason: "timeout"
        });
      }
    }, 1000);

    return () => window.clearInterval(scheduleInterval);
  }, [assessment?.scheduledEnd, hasSubmitted, isSubmitting]);

  useEffect(() => {
    if (
      violations >= 3 &&
      !submittedRef.current &&
      !submittingRef.current &&
      assessment?.attemptId &&
      activeSection?.id
    ) {
      finalizeWholeAssessment({
        autoSubmitted: true,
        message: "Test auto-submitted due to violations",
        autoSubmitReason: "violations"
      });
    }
  }, [violations]);


  // Loading
  if (loading) {
    return <p className="p-6 text-sm text-slate-600">Loading assessment...</p>;
  }

  // Error 
  if (error) {
    return <p className="p-6 text-sm text-rose-600">{error}</p>;
  }

  if (!assessment) {
    return <p className="p-6 text-sm">Loading assessment...</p>;
  }

  // ✅ HANDLE EXAM NOT STARTED
  if (!questions.length && assessment?.scheduledStart) {
    const startTime = new Date(assessment.scheduledStart).getTime();
    const now = Date.now();

    if (now < startTime) {
      const seconds = Math.floor((startTime - now) / 1000);

      return (
        <div style={{ textAlign: "center", marginTop: "150px" }}>
          <h2>Exam not started yet</h2>
          <h3>Starting in {seconds} seconds</h3>
        </div>
      );
    }
  }

  // fallback
  if (!questions.length) {
    return <p>No questions available</p>;
  }


 return (
  <>
    {/* Show loading if section not ready */}
    {!activeSection ? (
      <p>Loading test...</p>
    ) : examNotStarted ? (
      <div style={{ textAlign: "center", marginTop: "150px" }}>
        <h2>Exam not started yet</h2>
        <h3>Starting in {countdown}</h3>
      </div>
    ) : (
      <TimerSystem
        key={activeSection.id}
        durationSeconds={activeSectionDurationSeconds}
        isRunning={
          !hasSubmitted &&
          !isSubmitting &&
          !examNotStarted &&
          activeSection?.id &&
          assessment?.attemptId &&
          activeSectionDurationSeconds > 0
        }

        onExpire={() => {
          console.log("⛔ onExpire triggered");

          if (!activeSection?.id) return;
          if (!assessment?.attemptId) return;
          if (examNotStarted) return;
          if (hasSubmitted || isSubmitting) return;

          // ✅ prevents auto loop
          if (sectionSubmittingRef.current) return;

          if (timeLeftRef.current <= 0) return;

          submitCurrentSection({
              autoSubmitted: true,
              message: `${activeSection.title} time ended. Moving ahead automatically.`,
          });
        }}
      >
        {({ formattedTime, timeLeft }) => {
          timeLeftRef.current = timeLeft;

          return (
            <div className="min-h-screen bg-slate-50 px-4 py-10">
              <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_320px]">
                <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
                  {statusMessage && (
                    <p className="mb-6 text-sm font-semibold text-rose-600">
                      {statusMessage}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">
                        Test Interface
                      </p>
                      <h1 className="mt-2 text-3xl font-black text-slate-950">
                        {assessment.title}
                      </h1>
                      <p className="mt-3 text-sm font-semibold text-slate-500">
                        {activeSection.title} section
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="rounded-full bg-slate-50 px-5 py-2 text-sm font-semibold text-slate-700">
                        Question {currentQuestion + 1}/{questions.length}
                      </div>
                      <div className="rounded-full bg-slate-50 px-5 py-2 text-sm font-semibold text-slate-700">
                        Violations: {violations}
                      </div>
                      <div className="rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white">
                        {formattedTime}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {sections.map((section) => (
                      <div
                        key={section.id}
                        className={`rounded-2xl border px-4 py-3 text-sm ${
                          String(section.id) === String(activeSection.id)
                            ? "border-slate-950 bg-slate-950 text-white"
                            : section.completed
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        <p className="font-semibold">{section.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.15em]">
                          {section.completed
                            ? "Completed"
                            : section.locked
                            ? "Locked"
                            : "In Progress"}
                        </p>
                      </div>
                    ))}
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
                      onClick={() =>
                        setCurrentQuestion((c) => Math.max(c - 1, 0))
                      }
                      className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      disabled={
                        currentQuestion === questions.length - 1 ||
                        isSubmitting
                      }
                      onClick={() =>
                        setCurrentQuestion((c) =>
                          Math.min(c + 1, questions.length - 1)
                        )
                      }
                      className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                    >
                      Next
                    </button>

                    <SubmissionHandler
                      questions={questions}
                      answers={answers}
                      onSubmit={confirmAndSubmit}
                      disabled={hasSubmitted || isSubmitting}
                      metadata={{ testName: assessment.title }}
                      label={
                        isFinalSection
                          ? "Submit Test"
                          : `Submit ${activeSection.title}`
                      }
                    />
                  </div>
                </section>

                <aside className="rounded-[28px] bg-slate-950 p-6 text-white shadow-lg">
                  <h2 className="text-xl font-bold">Monitor Candidate</h2>
                  <p className="mt-4 text-sm text-slate-300">
                    Active Section:{" "}
                    <span className="font-semibold text-white">
                      {activeSection.title}
                    </span>
                  </p>

                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{
                      width: "100%",
                      borderRadius: "12px",
                      marginTop: "12px"
                    }}
                  />
                </aside>
              </div>
            </div>
          );
        }}
      </TimerSystem>
    )}
  </>
);
}

export default TestInterface;