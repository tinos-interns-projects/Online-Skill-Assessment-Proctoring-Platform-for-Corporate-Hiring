import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import QuestionEngine from "../components/QuestionEngine.jsx";
import SubmissionHandler from "../components/SubmissionHandler.jsx";
import TimerSystem from "../components/TimerSystem.jsx";
import { detectFace, getQuestions, logViolation, submitTest, uploadScreenshot } from "../services/api.js";

const ACTIVE_TAB_KEY = "skillassess-active-exam-tab";

function normalizeQuestion(question, index) {
  return {
    id: question.id ?? `question-${index + 1}`,
    question: question.question || question.question_text,
    options: Array.isArray(question.options) ? question.options : [],
    type: question.type || "mcq",
    answer: question.answer ?? question.correctOption,

    // 🔥 IMPORTANT FIX
    sectionId: question.sectionId,
    sectionType: question.sectionType
  };
}

function TestInterface() { 
  const navigate = useNavigate();
  const { token } = useParams();

  useEffect(() => {
    if (token) {
      console.log("Calling invite API with token:", token);

      fetch(`http://127.0.0.1:8000/api/invite/${token}/`)
        .then(res => res.json())
        .then(data => {
          console.log("Invite API response:", data);

          if (data.error) {
            setError("Invalid invitation link");
            return;
          }

          setAssessment({
            title: data.title,
            scheduledStart: data.scheduledStart,
            scheduledEnd: data.scheduledEnd,
            attemptId: data.attemptId
          });

          loadAssessment(undefined, data.attemptId);


        })
        .catch(err => {
          console.error(err);
          setError("Failed to load invitation");
        });
    }
  }, [token]);


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
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmLabel, setConfirmLabel] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);






  
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

    if (sectionId) {
      // ✅ ONLY use sectionId (IGNORE backend activeSection)
      nextActiveSection = nextSections.find(
        (section) => String(section.id) === String(sectionId)
     );
    } else {
      // ✅ Always start from first section
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

  // 🚫 Block duplicate submit
  if (submittedRef.current || submittingRef.current) {
    console.log("🚫 BLOCKED duplicate submit");
    return;
  }

  // 🚫 Block invalid state
  if (!assessment?.attemptId) {
    console.log("🚫 No attemptId — blocking submit");
    return;
  }

  // 🚫 Block if no active section
  if (!activeSection?.id) {
    console.log("🚫 No active section — blocking submit");
    return;
  }

  submittingRef.current = true;
  setIsSubmitting(true);

    try {
      const response = await submitTest({
        assessmentId: assessment.id,
        testId: assessment.testId,
        attemptId: assessment.attemptId,
        sectionId: activeSection.id, 
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
        sectionId: activeSection.id,
        answers: buildSectionAnswerPayload(),
        timeTaken: Math.max(((activeSection.timeLimitMinutes || assessment.durationMinutes || 20) * 60) - timeLeftRef.current, 0),
        violationsCount: violations,
        autoSubmitted: options.autoSubmitted
      });

      if (response?.status === "section_saved") {
        console.log("SUBMIT RESPONSE:", response);
      }
        

    } catch (submitError) {
      setStatusMessage(submitError.message || "Unable to submit section.");
      setError(submitError.message || "Unable to submit section.");
    } finally {
      sectionSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const confirmAndSubmit = async () => {
    if (hasSubmitted || isSubmitting) return;

    const label = isFinalSection
      ? "submit your test"
      : `submit the ${activeSection?.title || "current"} section`;

    setConfirmLabel(label);
    setShowConfirm(true);
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
      console.log("🎥 Starting camera..."); 
      if (!navigator.mediaDevices?.getUserMedia) {
        console.log("Camera not supported");
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
          console.log("Camera error:", cameraError);
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
        if (!assessment?.attemptId || hasSubmitted) return;
        registerViolation("Warning: tab switching detected.", "tab-switch", "TAB_SWITCH");
      }
    };

    const handleWindowBlur = () => {
      if (!document.hidden) {
        if (!assessment?.attemptId || hasSubmitted) return;
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
  }, []);

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
        if (!submittedRef.current && !submittingRef.current) {
          finalizeWholeAssessment({
            autoSubmitted: true,
            message: "Assessment time ended",
            autoSubmitReason: "timeout"
          });
        }
      }
    }, 1000);

    return () => window.clearInterval(scheduleInterval);
  }, [assessment?.scheduledEnd, hasSubmitted, isSubmitting]);

  useEffect(() => {
    if (
      violations >= 3 &&
      !submittedRef.current &&
      !submittingRef.current &&
      assessment?.attemptId

    ) {
      finalizeWholeAssessment({
        autoSubmitted: true,
        message: "Test auto-submitted due to violations",
        autoSubmitReason: "violations"
      });
    }
  }, [violations, assessment?.attemptId]);


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
if (examNotStarted) {
  return (
    <div style={{
      width: "100%",
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center"
    }}>
      <div style={{ textAlign: "center" }}>
        <h2>Exam not started yet</h2>
        <h3>Starting in {countdown}</h3>
      </div>
    </div>
  );
}

      return (
  <div style={{
    width: "100%",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    padding: "0"
  }}>
    <div style={{ width: "100%" }}>

      {/* Show loading if section not ready */}
      {!activeSection ? (
        <p>Loading test...</p>

      ) : examNotStarted ? (

        <div style={{
          width: "100%",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center"
        }}>
          <h2 style={{ fontSize: "28px", marginBottom: "10px" }}>
            Exam not started yet
          </h2>

          <h3 style={{ fontSize: "20px", color: "#555" }}>
            Starting in {countdown}
          </h3>
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
          onExpire={async () => {
  console.log("⏱ Section time over");

  if (!activeSection?.id) return;
  if (!assessment?.attemptId) return;
  if (examNotStarted) return;
  if (hasSubmitted || isSubmitting) return;
  if (sectionSubmittingRef.current) return;

  // ✅ Submit section
  await submitCurrentSection({
    autoSubmitted: true,
    message: `${activeSection.title} time ended. Moving ahead automatically.`,
  });

  // ✅ Find next section manually
  const currentIndex = sections.findIndex(
    (s) => String(s.id) === String(activeSection.id)
  );

  const nextSection = sections[currentIndex + 1];

  if (nextSection) {
    console.log("➡ Moving to next section:", nextSection.title);

    setActiveSection(nextSection);
    setCurrentQuestion(0);

    // 🔥 IMPORTANT: load new questions
    await loadAssessment(nextSection.id);

  } else {
    console.log("🚀 Last section → submitting full test");

    await finalizeWholeAssessment({
      autoSubmitted: true,
      autoSubmitReason: "section_timeout"
    });
  }
}}
        >
          {({ formattedTime, timeLeft }) => {
            timeLeftRef.current = timeLeft;

            console.log("QUESTIONS:", questions);

            const sectionQuestions = questions.filter((q) => {
              const qType = (q.sectionType || "").toLowerCase().trim();
              const activeType = (activeSection.sectionType || "").toLowerCase().trim();

              return qType === activeType;
            });

            console.log("FIRST QUESTION:", sectionQuestions[0]);
            

            console.log("ACTIVE SECTION:", activeSection);
            console.log("ALL QUESTIONS:", questions);
            console.log("FILTERED QUESTIONS:", sectionQuestions);
            
            console.log("Q sectionType:", questions.map(q => q.sectionType));
            console.log("Active section title:", activeSection?.title);
            console.log("Filtered:", sectionQuestions);

            return (
              <div className="min-h-screen w-full bg-slate-50 p-6">
                {/* 🔥 FIXED WIDTH ISSUE HERE */}
                <div 
                  className="grid w-full gap-6 lg:grid-cols-[1fr_320px]" 
                  style={{ width: "100%" }}
                >

                  {/* LEFT PANEL */}
                  <section className="rounded-[28px] bg-white p-6 shadow-lg">
                    {statusMessage && (
                      <p className="mb-6 text-sm font-semibold text-rose-600">
                        {statusMessage}
                      </p>
                    )}

                    <div className="flex flex-wrap justify-between gap-4 border-b pb-6">
                      <div>
                        <h1 className="text-3xl font-bold">
                          {assessment.title}
                        </h1>
                        <p className="text-sm text-gray-500">
                          {activeSection.title} section
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <div>Q {currentQuestion + 1}/{sectionQuestions.length}</div>
                        <div>Violations: {violations}</div>
                        <div>{formattedTime}</div>
                      </div>
                    </div>

                    {/* ✅ ADD THIS EXACTLY HERE */}
                    <div style={{
                      display: "flex",
                      gap: "10px",
                      marginTop: "15px",
                      marginBottom: "10px"
                    }}>

                      {sections?.map((sec, index) => {
                       const currentIndex = sections.findIndex(
                         (s) => s.id === activeSection?.id
                      );

                       const isActive = activeSection?.id === sec.id;
                       const isAllowed = index === currentIndex; // only current section

                       return (
                         <div
                           key={sec.id}
                           style={{
                             padding: "8px 16px",
                             borderRadius: "8px",
                             cursor: isAllowed ? "pointer" : "not-allowed",
                             background: isActive ? "#111827" : "#e5e7eb",
                             color: isActive ? "#fff" : "#000",
                             fontWeight: "500",
                             opacity: isAllowed ? 1 : 0.5
                           }}
                           onClick={() => {
                             if (isAllowed) {
                               loadAssessment(sec.id);
                             }
                           }}
                         >
                           {sec.title}
                        </div>
                       );
                      })}
                     
               </div>

                    <div className="mt-6">

                    {sectionQuestions.length === 0 ? (
                      <div>No questions for this section</div>
                    ) : (
                      <QuestionEngine
                        questions={sectionQuestions}
                        currentQuestion={currentQuestion}
                        answers={answers}
                        onSelectAnswer={handleSelectAnswer}
                        onQuestionChange={setCurrentQuestion}
                      />
                    )}
                    </div>

                    <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
                     <button
                       style={{
                         padding: "8px 16px",
                         borderRadius: "6px",
                         background: "#e5e7eb",
                         border: "none",
                         cursor: "pointer"
                       }}
                       disabled={currentQuestion === 0}
                       onClick={() =>
                         setCurrentQuestion((c) => Math.max(c - 1, 0))
                       }
                     >
                       Previous
                     </button>

                     <button
                       style={{
                         padding: "8px 16px",
                         borderRadius: "6px",
                         background: "#e5e7eb",
                         border: "none",
                         cursor: "pointer"
                       }}
                       disabled={currentQuestion === sectionQuestions.length - 1}
                       onClick={() =>
                         setCurrentQuestion((c) =>
                           Math.min(c + 1, sectionQuestions.length - 1)
                         )
                       }
                     >
                       Next
                     </button>

                     <button
                       style={{
                         padding: "8px 16px",
                         borderRadius: "6px",
                         background: "#10b981",
                         color: "#fff",
                         border: "none",
                         cursor: "pointer"
                       }}
                       onClick={confirmAndSubmit}
  
                     >
                       {isFinalSection
                         ? "Submit Test"
                         : `Submit ${activeSection?.title}`}
                     </button>
                   </div>

                  </section>

                  {/* RIGHT PANEL */}
                  <aside className="bg-black text-white p-4 rounded-lg">
                    <h2>Monitor Candidate</h2>

                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      style={{ width: "100%", borderRadius: "10px" }}
                    />
                  </aside>

                </div>
              </div>
            );
          }}
        </TimerSystem>
      )}

      {/* MODAL */}
      {showConfirm && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999
        }}>
          <div style={{
            background: "#fff",
            padding: "25px",
            borderRadius: "12px",
            width: "300px",
            textAlign: "center"
          }}>
            <p>Are you sure you want to {confirmLabel}?</p>

            <button
              onClick={async () => {
                setShowConfirm(false);
                await submitCurrentSection({
                  message: isFinalSection
                    ? "Submitting final section..."
                    : `Submitting ${activeSection?.title || "section"}...`
                });
              }}
            >
              Yes
            </button>

            <button onClick={() => setShowConfirm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  </div>
);
}

export default TestInterface;