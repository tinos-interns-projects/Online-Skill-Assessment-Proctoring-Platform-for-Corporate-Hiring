import { useEffect, useRef, useState } from "react";

function WebcamMonitor({ alerts = [], onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("Requesting camera permission...");

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus("Live proctoring active");
      } catch (error) {
        setStatus("Camera unavailable or blocked");
      }
    };

    startCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!onCapture) {
      return undefined;
    }

    const captureFrame = () => {
      if (!videoRef.current || !videoRef.current.videoWidth || !videoRef.current.videoHeight) {
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext("2d");
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      onCapture(canvas.toDataURL("image/jpeg", 0.75));
    };

    const interval = setInterval(captureFrame, 15000);
    return () => clearInterval(interval);
  }, [onCapture]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-panel">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900">Proctoring Monitor</h3>
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-700">{status}</span>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-300 bg-slate-900">
        <video ref={videoRef} autoPlay muted playsInline className="h-44 w-full object-cover" />
      </div>

      <div className="mt-3 space-y-2">
        <h4 className="text-sm font-semibold text-slate-800">Alerts</h4>
        <ul className="max-h-28 space-y-1 overflow-auto text-xs text-slate-600">
          {alerts.length ? (
            alerts.map((alert, index) => (
              <li key={`${alert}-${index}`} className="rounded bg-amber-50 px-2 py-1 text-amber-700">
                {alert}
              </li>
            ))
          ) : (
            <li className="rounded bg-emerald-50 px-2 py-1 text-emerald-700">No violations detected.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default WebcamMonitor;
