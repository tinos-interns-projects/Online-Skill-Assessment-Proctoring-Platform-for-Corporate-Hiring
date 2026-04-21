import { useEffect, useRef, useState } from "react";

function formatTime(timeLeft) {
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const seconds = String(timeLeft % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function TimerSystem({ durationSeconds, isRunning = true, onExpire, children }) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const hasExpiredRef = useRef(false);

useEffect(() => {
  if (!isRunning) return;

  // Prevent running when duration is invalid
  if (durationSeconds <= 0) return;

  // Prevent multiple expire calls
  if (hasExpiredRef.current) return;

  if (timeLeft <= 0) {
    hasExpiredRef.current = true;
    onExpire?.();
    return;
  }

  const timer = window.setTimeout(() => {
    setTimeLeft((current) => Math.max(current - 1, 0));
  }, 1000);

  return () => window.clearTimeout(timer);
}, [isRunning, onExpire, timeLeft, durationSeconds]);


  const payload = { timeLeft, formattedTime: formatTime(timeLeft) };

  if (typeof children === "function") {
    return children(payload);
  }

  return <span>{payload.formattedTime}</span>;
}

export default TimerSystem;
