import { useEffect, useState } from "react";
import { getCandidates } from "../../services/api.js";

function Candidates() {
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    const loadCandidates = async () => {
      try {
        setCandidates(await getCandidates());
      } catch (error) {
        setCandidates([]);
      }
    };

    loadCandidates();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Candidates</p>
        <h2 className="mt-2 text-4xl font-black text-slate-950">View all candidates</h2>
      </div>

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {candidates.map((candidate) => (
            <div key={candidate.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <p className="font-semibold text-slate-900">{candidate.name}</p>
              <p className="mt-1 text-sm text-slate-500">{candidate.email}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                <span>{candidate.stage}</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{candidate.status}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Candidates;
