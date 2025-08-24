import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const AdminUserClaims = () => {
  const { email } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `https://geotagger-api.fly.dev/api/GeoTag?email=${encodeURIComponent(email)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`(${res.status}) ${body || "Failed to load claims."}`);
      }
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Error loading claims.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const handleProcessPayment = async () => {
    if (!window.confirm("Mark payment processed and clear all claims for this user?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `https://geotagger-api.fly.dev/api/GeoTag/clear?email=${encodeURIComponent(email)}`,
        { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message || "Failed to clear claims.");
      alert("Claims cleared.");
      navigate("/admin");
    } catch (e) {
      setError(e.message || "Error clearing claims.");
    }
  };

  const netTotal = rows.reduce((s, r) => s + (r.rate ?? r.Rate ?? 0), 0);

  return (
    <div className="mx-auto w-full text-gray-900">
      <div className="flex items-center gap-4 mb-4">
        <button className="text-blue-400 hover:underline" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1 className="text-2xl font-semibold break-words">Claims — {email}</h1>
      </div>

      {error && <p className="text-red-400 mb-3">{error}</p>}

      <div className="bg-white rounded-xl shadow p-4 sm:p-6">
        {/* Top action bar for wide screens */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div className="text-sm text-gray-600">
            {rows.length} session{rows.length === 1 ? "" : "s"} • Total:&nbsp;
            <span className="font-semibold text-gray-900">
              {netTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <button
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
            onClick={handleProcessPayment}
            disabled={rows.length === 0}
          >
            Payment processed — clear claims
          </button>
        </div>

        {loading ? (
          <p>Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto text-sm lg:text-base">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 pr-4 text-gray-700">Date</th>
                  <th className="text-left py-2 pr-4 text-gray-700">Session</th>
                  <th className="text-right py-2 pr-4 text-gray-700">Rate</th>
                  <th className="text-left py-2 pr-4 text-gray-700">Address</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r, idx) => (
                  <tr key={r.id ?? r.Id ?? idx}>
                    <td className="py-3 pr-4">
                      {new Date(r.createdAt ?? r.CreatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4">{r.sessionType ?? r.SessionType}</td>
                    <td className="py-3 pr-4 text-right">
                      {(r.rate ?? r.Rate ?? 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 pr-4">{r.address ?? r.Address}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-gray-500">
                      No claims for this user.
                    </td>
                  </tr>
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr>
                    <td className="py-3 pr-4 font-semibold">Total</td>
                    <td />
                    <td className="py-3 pr-4 font-semibold text-right">
                      {netTotal.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUserClaims;
