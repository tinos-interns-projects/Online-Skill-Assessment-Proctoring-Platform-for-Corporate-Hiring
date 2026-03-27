import { useEffect, useState } from "react";
import { getEmployers } from "../../services/api.js";

function Employers() {
  const [employers, setEmployers] = useState([]);

  useEffect(() => {
    const loadEmployers = async () => {
      try {
        setEmployers(await getEmployers());
      } catch (error) {
        setEmployers([]);
      }
    };

    loadEmployers();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Employers</p>
        <h2 className="mt-2 text-4xl font-black text-slate-950">View all employers</h2>
      </div>

      <section className="rounded-[28px] bg-white p-6 shadow-lg shadow-slate-900/5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="pb-3 pr-6">Name</th>
                <th className="pb-3 pr-6">Company</th>
                <th className="pb-3 pr-6">Email</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {employers.map((employer) => (
                <tr key={employer.id} className="border-b border-slate-100">
                  <td className="py-4 pr-6 font-semibold text-slate-900">{employer.name}</td>
                  <td className="py-4 pr-6 text-slate-600">{employer.company}</td>
                  <td className="py-4 pr-6 text-slate-600">{employer.email}</td>
                  <td className="py-4"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{employer.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Employers;
