import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const AdminPage = () => {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("https://localhost:7047/api/GeoTag/claimants", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`(${res.status}) ${body || "Failed to load claimants."}`);
        }
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message || "Error loading admins view.");
      }
    };
    load();
  }, []);

  return (
    <div className="mx-auto w-full text-gray-900">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-4">
        <h1 className="text-2xl font-semibold">Admin — Claims Overview</h1>
        <p className="text-sm text-gray-300">
          Tip: Click "View claims" to review and clear after payment.
        </p>
      </div>

      {error && <p className="text-red-400 mb-3">{error}</p>}

      <div className="bg-white rounded-xl shadow p-4 sm:p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto text-sm lg:text-base">
            <thead className="border-b">
              <tr>
                <th className="text-left py-2 pr-4 text-gray-700">Name</th>
                <th className="text-left py-2 pr-4 text-gray-700">Email</th>
                <th className="text-right py-2 pr-4 text-gray-700">Sessions</th>
                <th className="text-right py-2 pr-4 text-gray-700">Net Total</th>
                <th className="py-2 text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r, idx) => {
                const email = r.email ?? r.Email ?? "";
                const name = r.name ?? r.Name ?? "";
                const totalSessions = r.totalSessions ?? r.TotalSessions ?? 0;
                const netTotal = r.netTotal ?? r.NetTotal ?? 0;

                return (
                  <tr key={email || idx}>
                    <td className="py-3 pr-4">{name || "—"}</td>
                    <td className="py-3 pr-4">{email || "—"}</td>
                    <td className="py-3 pr-4 text-right">{totalSessions}</td>
                    <td className="py-3 pr-4 text-right">
                      {Number(netTotal).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3">
                      <button
                        className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                        onClick={() =>
                          navigate(`/admin/claims/${encodeURIComponent(email)}`)
                        }
                        disabled={!email}
                      >
                        View claims
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-gray-500">
                    No claims yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
