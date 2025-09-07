// src/components/CoachesPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  MdEmail,
  MdSports,
  MdSportsSoccer,
  MdSportsBasketball,
  MdSportsTennis,
  MdSportsHockey,
  MdSportsRugby,
  MdPool,
  MdAttachMoney,
  MdPerson,
} from "react-icons/md";
import { GiWaterPolo, GiTennisRacket } from "react-icons/gi";
import { FaRunning } from "react-icons/fa";

const API_BASE =
  process.env.REACT_APP_API_BASE || "https://geotagger-api.fly.dev/api";

const SPORTS = [
  "Soccer",
  "Basketball",
  "Tennis",
  "Squash",
  "Rugby",
  "Hockey",
  "Swimming",
  "Water Polo",
  "Athletics",
];

// map sport -> icon component
const sportIconMap = {
  soccer: MdSportsSoccer,
  basketball: MdSportsBasketball,
  tennis: MdSportsTennis,
  squash: GiTennisRacket, // closest racket-style icon
  rugby: MdSportsRugby,
  hockey: MdSportsHockey,
  swimming: MdPool,
  "water polo": GiWaterPolo,
  athletics: FaRunning,
};

const normalize = (s) => (s ?? "").trim().toLowerCase();

const SportIcon = ({ name, className = "inline-block w-4 h-4 mr-2" }) => {
  const Icon = sportIconMap[normalize(name)] || MdSports;
  return <Icon className={className} aria-hidden="true" />;
};

const CoachesPage = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [error, setError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const sport = searchParams.get("sport") || "";

  useEffect(() => {
    const load = async () => {
      try {
        setError("");
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/Auth/getallusers`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            setError("Unauthorized. Please log in as an Admin.");
            setTimeout(() => navigate("/login"), 1200);
            return;
          }
          const body = await res.text();
          throw new Error(`(${res.status}) ${body || "Failed to load users."}`);
        }

        const data = await res.json();
        setAllUsers(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message || "Failed to load users.");
      }
    };
    load();
  }, [navigate]);

  const normalized = useMemo(
    () =>
      allUsers.map((u) => ({
        id: u.id ?? u.Id,
        name: u.name ?? u.Name ?? "",
        email: u.email ?? u.Email ?? "",
        role: u.role ?? u.Role ?? "",
        sport: u.sport ?? u.Sport ?? "",
        preseasonRate: u.preseasonRate ?? u.PreseasonRate ?? 0,
        gameRate: u.gameRate ?? u.GameRate ?? 0,
        practiceRate: u.practiceRate ?? u.PracticeRate ?? 0,
        createdAt: u.createdAt ?? u.CreatedAt ?? null,
      })),
    [allUsers]
  );

  const filtered = useMemo(() => {
    const rows = normalized.filter((u) => normalize(u.role) !== "admin");
    const wanted = normalize(sport);
    if (!wanted) return rows;
    return rows.filter((u) => normalize(u.sport) === wanted);
  }, [normalized, sport]);

  const handleSportChange = (e) => {
    const val = e.target.value;
    if (val) setSearchParams({ sport: val });
    else setSearchParams({});
  };

  return (
    <div className="mx-auto w-full text-gray-900">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Coaches</h1>
          <p className="text-sm text-gray-500">
            Pick a sport to view all registered coaches in that bracket.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sport}
            onChange={handleSportChange}
            className="border rounded px-3 py-1.5"
          >
            <option value="">All sports</option>
            {SPORTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <button
            className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            onClick={() => navigate(-1)}
            type="button"
          >
            Back
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 mb-3">{error}</p>}

      {/* Sport chips with icons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {SPORTS.map((s) => {
          const active = normalize(s) === normalize(sport);
          return (
            <button
              key={s}
              className={`px-3 py-1.5 rounded border flex items-center ${
                active
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white hover:bg-gray-50"
              }`}
              onClick={() => setSearchParams({ sport: s })}
              type="button"
            >
              <SportIcon name={s} className="w-4 h-4 mr-2" />
              {s}
            </button>
          );
        })}
        <button
          className={`px-3 py-1.5 rounded border ${
            !sport
              ? "bg-emerald-600 text-white border-emerald-600"
              : "bg-white hover:bg-gray-50"
          }`}
          onClick={() => setSearchParams({})}
          type="button"
        >
          All
        </button>
      </div>

      <div className="bg-white rounded-xl shadow p-4 sm:p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto text-sm lg:text-base">
            <thead className="border-b">
              <tr>
                <th className="text-left py-2 pr-4 text-gray-700">
                  <span className="inline-flex items-center gap-2">
                    <MdPerson aria-hidden className="w-4 h-4" />
                    Name
                  </span>
                </th>
                <th className="text-left py-2 pr-4 text-gray-700">
                  <span className="inline-flex items-center gap-2">
                    <MdEmail aria-hidden className="w-4 h-4" />
                    Email
                  </span>
                </th>
                <th className="text-left py-2 pr-4 text-gray-700">
                  <span className="inline-flex items-center gap-2">
                    <MdSports aria-hidden className="w-4 h-4" />
                    Sport
                  </span>
                </th>
                <th className="text-right py-2 pr-4 text-gray-700">
                  <span className="inline-flex items-center gap-2 justify-end w-full">
                    <MdAttachMoney aria-hidden className="w-4 h-4" />
                    Preseason Rate
                  </span>
                </th>
                <th className="text-right py-2 pr-4 text-gray-700">
                  <span className="inline-flex items-center gap-2 justify-end w-full">
                    <MdAttachMoney aria-hidden className="w-4 h-4" />
                    Game Rate
                  </span>
                </th>
                <th className="text-right py-2 pr-4 text-gray-700">
                  <span className="inline-flex items-center gap-2 justify-end w-full">
                    <MdAttachMoney aria-hidden className="w-4 h-4" />
                    Practice Rate
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((u, idx) => (
                <tr key={u.id ?? u.email ?? idx}>
                  <td className="py-3 pr-4">{u.name || "—"}</td>
                  <td className="py-3 pr-4">{u.email || "—"}</td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex items-center">
                      <SportIcon
                        name={u.sport}
                        className="w-4 h-4 mr-2 text-gray-500"
                      />
                      {u.sport || "—"}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {Number(u.preseasonRate).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {Number(u.gameRate).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {Number(u.practiceRate).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-gray-500">
                    No coaches found {sport ? `for ${sport}` : ""}.
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

export default CoachesPage;
