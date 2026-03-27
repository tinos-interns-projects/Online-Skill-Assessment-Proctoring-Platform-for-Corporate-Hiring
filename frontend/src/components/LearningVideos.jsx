import { useEffect, useState } from "react";
import api from "../services/api.js";

function LearningVideos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadVideos = async () => {
      const response = await api.getVideos();
      if (isActive) {
        setVideos(response || []);
        setLoading(false);
      }
    };

    loadVideos();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">Learning Videos</h2>
          <p className="mt-2 text-slate-600">Watch backend-provided tutorials before your next assessment.</p>
        </div>
        {loading ? <span className="rounded-full bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">Loading</span> : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {videos.map((video) => (
          <article key={video.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <h3 className="text-xl font-bold text-slate-950">{video.title}</h3>
            <p className="mt-2 text-sm text-slate-500">{video.description}</p>
            <video controls width="400" className="mt-4 w-full rounded-2xl border border-slate-200 bg-black">
              <source src={video.url} />
            </video>
          </article>
        ))}
      </div>
    </section>
  );
}

export default LearningVideos;
