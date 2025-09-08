import React, { useState, useEffect, useCallback, useRef } from "react";
import { saveAs } from "file-saver";
import { jwtDecode } from "jwt-decode";
import ExcelJS from "exceljs";

/** Simple toast component */
const Toast = ({ show, message, type = "success", onClose }) => {
  if (!show) return null;
  const base =
    "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm flex items-start gap-3";
  const look =
    type === "success"
      ? "bg-green-600 text-white"
      : type === "error"
      ? "bg-red-600 text-white"
      : "bg-gray-800 text-white";
  return (
    <div className={`${base} ${look}`}>
      <span className="mt-0.5">✔</span>
      <div className="pr-6">{message}</div>
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-2 right-2 opacity-80 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
};

const GeoTagPage = () => {
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [error, setError] = useState("");
  const [sessionType, setSessionType] = useState("Practice");
  const [hasTaggedToday, setHasTaggedToday] = useState(false);

  // toast + tags state
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [tags, setTags] = useState([]);

  // Default coordinates if geolocation fails
  const defaultLocation = { latitude: 25.7566, longitude: 28.1914 };
  const currentLocation = location || defaultLocation;

  // --------- helpers ----------
  const getEmailFromToken = () => {
    const cached = localStorage.getItem("email");
    if (cached) return cached;

    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const decoded = jwtDecode(token);
      const email =
        decoded.email ||
        decoded.sub ||
        decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ||
        decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/email"];
      if (email) localStorage.setItem("email", email);
      return email || null;
    } catch {
      return null;
    }
  };

  const getDisplayNameFromToken = () => {
    const cached = localStorage.getItem("displayName");
    if (cached) return cached;

    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const d = jwtDecode(token);
      const name =
        d.name ||
        d.given_name ||
        d["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ||
        (d.email || d.sub || "").split("@")[0] ||
        null;

      if (name) localStorage.setItem("displayName", name);
      return name;
    } catch {
      return null;
    }
  };

  const safeFile = (s) => (s || "claims").replace(/[\\/:*?"<>|]+/g, "-").trim();

  const dateKey = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  // weekday label like "Tuesday"
  const weekday = (iso) =>
    new Date(iso).toLocaleDateString(undefined, { weekday: "long" });

  // simple year-week key (Sun-start; good enough for grouping)
  const weekKey = (iso) => {
    const d = new Date(iso);
    const year = d.getFullYear();
    const week = Math.ceil(
      ((d - new Date(year, 0, 1)) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7
    );
    return `${year}-W${String(week).padStart(2, "0")}`;
  };

  /** central fetch for user's tags; updates hasTaggedToday + tags list */
  const loadUserTags = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const email = localStorage.getItem("email") || getEmailFromToken();
      if (!email) {
        setTags([]);
        setHasTaggedToday(false);
        return { already: false, list: [] };
      }

      const url = `https://geotagger-api.fly.dev/api/GeoTag?email=${encodeURIComponent(email)}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        setTags([]);
        setHasTaggedToday(false);
        return { already: false, list: [] };
      }

      const list = await res.json();
      setTags(Array.isArray(list) ? list : []);
      const today = dateKey(new Date());
      const already = (Array.isArray(list) ? list : []).some(
        (t) => dateKey(new Date(t.createdAt)) === today
      );
      setHasTaggedToday(already);
      return { already, list };
    } catch {
      setTags([]);
      setHasTaggedToday(false);
      return { already: false, list: [] };
    }
  }, []);

  // Maintain a short-lived toast
  const showToast = (message, type = "success", ms = 3200) => {
    setToast({ show: true, message, type });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, ms);
  };

  // Fetch IP address
  const fetchIpAddress = async () => {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      setIpAddress(data.ip);
    } catch (error) {
      console.error("Failed to fetch IP address:", error);
      setError("Failed to fetch IP address.");
    }
  };

  // --------- Google Map (no flicker) ----------
  // Refs for single map & marker instances
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Create the map once
  const initMap = useCallback(() => {
    if (!window.google || !window.google.maps) return;
    if (mapRef.current) return; // already inited

    mapRef.current = new window.google.maps.Map(document.getElementById("map"), {
      center: { lat: currentLocation.latitude, lng: currentLocation.longitude },
      zoom: 12,
    });

    markerRef.current = new window.google.maps.Marker({
      position: { lat: currentLocation.latitude, lng: currentLocation.longitude },
      map: mapRef.current,
      title: "Location",
    });
  }, []); // no deps → runs only once when script is ready

  // When currentLocation changes, just move marker & pan (no re-init)
  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      const pos = { lat: currentLocation.latitude, lng: currentLocation.longitude };
      markerRef.current.setPosition(pos);
      mapRef.current.panTo(pos);
    }
  }, [currentLocation]);

  // One-time startup: fetch IP/tags, load Maps script once, then init map
  useEffect(() => {
    fetchIpAddress();
    loadUserTags();

    const onReady = () => initMap();

    if (window.google && window.google.maps) {
      onReady();
      return;
    }

    const scriptId = "google-maps-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src =
        "https://maps.googleapis.com/maps/api/js?key=AIzaSyCOCu38e9cnVI6yjtBUTuwBVtyOBuvlMIg&libraries=places";
      script.async = true;
      script.defer = true;
      script.onerror = () => setError("Failed to load Google Maps API.");
      script.onload = onReady;
      document.head.appendChild(script);
    } else {
      onReady();
    }
  }, []); // run once

  const fetchGeoTag = async () => {
    // Block multiple tags in the same local day
    const { already } = await loadUserTags();
    if (already) {
      setError("You’ve already tagged a session today. Try again tomorrow.");
      showToast("You’ve already tagged today.", "error");
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      showToast("Geolocation is not supported.", "error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        setError("");

        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=AIzaSyCOCu38e9cnVI6yjtBUTuwBVtyOBuvlMIg`
          );
          const data = await response.json();

          if (data.status === "OK" && data.results.length > 0) {
            const formattedAddress = data.results[0].formatted_address;
            setAddress(formattedAddress);

            const ok = await tagLocationInDatabase(
              latitude,
              longitude,
              formattedAddress
            );
            if (ok) {
              setHasTaggedToday(true);
              await loadUserTags();
              showToast("Tagged successfully for the day.");
              // No initMap() here — marker moves via the effect on currentLocation
            }
          } else {
            setAddress("Address not found");
          }
        } catch (err) {
          console.error("Error fetching address", err);
          setError("Failed to fetch address");
          showToast("Failed to fetch address.", "error");
        }
      },
      () => {
        setError("Unable to retrieve your location. Showing default location.");
        setLocation(defaultLocation);
        showToast("Unable to retrieve location.", "error");
      }
    );
  };

  const tagLocationInDatabase = async (latitude, longitude, address) => {
    try {
      const token = localStorage.getItem("token");
      const email = getEmailFromToken();

      if (!email) {
        const msg = "Could not determine user email from token. Please log in again.";
        setError(msg);
        showToast(msg, "error");
        return false;
      }

      const response = await fetch("https://geotagger-api.fly.dev/api/GeoTag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          latitude,
          longitude,
          address,
          sessionType,
          ipAddress,
          email,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        console.log("Tag saved successfully", result);
        return true;
      } else {
        console.error("Failed to save tag", result);
        const msg = result?.message || "Failed to save tag";
        setError(msg);
        showToast(msg, "error");
        return false;
      }
    } catch (error) {
      console.error("Error sending data to server", error);
      const msg = "Error sending data to server";
      setError(msg);
      showToast(msg, "error");
      return false;
    }
  };

  const downloadClaimsAsExcel = async () => {
    try {
      const token = localStorage.getItem("token");
      const email = localStorage.getItem("email") || getEmailFromToken();
      if (!email) {
        const msg = "User email not found. Please log in again.";
        setError(msg);
        showToast(msg, "error");
        return;
      }

      const url = `https://geotagger-api.fly.dev/api/GeoTag?email=${encodeURIComponent(email)}`;
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        const problem = await response.json().catch(() => ({}));
        throw new Error((problem && problem.title) || "Failed to fetch claims.");
      }

      const tags = await response.json();

      // ---- Stats ----
      const counts = {
        Preseason: tags.filter((t) => t.sessionType === "Preseason").length,
        Practice: tags.filter((t) => t.sessionType === "Practice").length,
        Game: tags.filter((t) => t.sessionType === "Game").length,
      };
      const totalSessions = tags.length;
      const netTotal = tags.reduce((sum, t) => sum + (t.rate || 0), 0);

      // ---- Create Workbook ----
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Claims");

      const thinGray = { style: "thin", color: { argb: "FFCCCCCC" } };
      const borderBlack = (weight) => ({ style: weight, color: { argb: "FF000000" } });

      function boxRange(ws, fromCol, fromRow, toCol, toRow) {
        for (let r = fromRow; r <= toRow; r++) {
          for (let c = fromCol; c <= toCol; c++) {
            const cell = ws.getCell(r, c);
            const isTop = r === fromRow;
            const isBottom = r === toRow;
            const isLeft = c === fromCol;
            const isRight = c === toCol;
            cell.border = {
              top: isTop ? borderBlack("medium") : borderBlack("thin"),
              left: isLeft ? borderBlack("medium") : borderBlack("thin"),
              bottom: isBottom ? borderBlack("medium") : borderBlack("thin"),
              right: isRight ? borderBlack("medium") : borderBlack("thin"),
            };
          }
        }
      }

      ws.mergeCells("A1:D1");
      ws.getCell("A1").value = "PBHS eTag Claims Report";
      ws.getCell("A1").font = { size: 16, bold: true };
      ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

      try {
        const imgResp = await fetch(require("../assets/pbhs.png"));
        const imgBlob = await imgResp.blob();
        const imgBuf = await imgBlob.arrayBuffer();
        const imgId = wb.addImage({ buffer: imgBuf, extension: "png" });
        ws.getRow(2).height = 35;
        ws.getRow(3).height = 35;
        ws.addImage(imgId, {
          tl: { col: 1.7, row: 1.4 },
          ext: { width: 260, height: 140 },
          editAs: "oneCell",
        });
      } catch (e) {
        console.warn("Could not insert PBHS logo", e);
      }

      const headerRow = 8;
      let rowIdx = headerRow;

      ws.getRow(rowIdx).values = ["Date", "Session Type", "Rate", "Address"];
      ws.getRow(rowIdx).font = { bold: true };
      ws.getRow(rowIdx).alignment = { vertical: "middle" };
      ws.getRow(rowIdx).eachCell((c) => {
        c.border = { top: thinGray, left: thinGray, bottom: thinGray, right: thinGray };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
      });

      tags
        .slice()
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .forEach((t) => {
          rowIdx += 1;
          ws.getRow(rowIdx).values = [
            new Date(t.createdAt).toLocaleDateString(),
            t.sessionType,
            t.rate || 0,
            t.address,
          ];
          ws.getRow(rowIdx).eachCell((c, colNumber) => {
            c.border = { top: thinGray, left: thinGray, bottom: thinGray, right: thinGray };
            if (colNumber === 3) {
              c.numFmt = "#,##0.00";
              c.alignment = { horizontal: "right" };
            }
          });
        });

      rowIdx += 1;
      ws.getRow(rowIdx).values = ["Total", "", netTotal, ""];
      ws.getRow(rowIdx).font = { bold: true };
      ws.getRow(rowIdx).eachCell((c, colNumber) => {
        c.border = { top: thinGray, left: thinGray, bottom: thinGray, right: thinGray };
        if (colNumber === 3) {
          c.numFmt = "#,##0.00";
          c.alignment = { horizontal: "right" };
        }
      });

      const tableEndRow = rowIdx;
      boxRange(ws, 1, headerRow, 4, tableEndRow);

      rowIdx += 2;
      const summaryTitleRow = rowIdx;
      ws.getCell(`A${summaryTitleRow}`).value = "Summary";
      ws.getCell(`A${summaryTitleRow}`).font = { bold: true };
      rowIdx += 1;

      const summaryRows = [
        ["Total Sessions", totalSessions],
        ["Preseason Days", counts.Preseason],
        ["Practice Days", counts.Practice],
        ["Game Days", counts.Game],
        ["Net Total (All Claims)", netTotal],
      ];

      summaryRows.forEach(([label, val]) => {
        ws.getRow(rowIdx).values = [label, val];
        if (String(label).toLowerCase().startsWith("net total")) {
          ws.getCell(`B${rowIdx}`).numFmt = "#,##0.00";
        }
        rowIdx += 1;
      });

      const summaryEndRow = rowIdx - 1;
      boxRange(ws, 1, summaryTitleRow, 2, summaryEndRow);

      ws.columns = [
        { key: "date", width: 14 },
        { key: "type", width: 18 },
        { key: "rate", width: 12 },
        { key: "addr", width: 60 },
      ];

      const displayName =
        getDisplayNameFromToken() || (email ? email.split("@")[0] : "claims");
      const today = new Date();
      const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(today.getDate()).padStart(2, "0")}`;
      const fileName = `${safeFile(displayName)}-claims-${ymd}.xlsx`;

      const out = await wb.xlsx.writeBuffer();
      saveAs(new Blob([out]), fileName);
    } catch (error) {
      console.error("Error downloading claims", error);
      const msg = (error && error.message) || "Error downloading claims.";
      setError(msg);
      showToast(msg, "error");
    }
  };

  /** logout */
  const handleLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("email");
      localStorage.removeItem("displayName");
    } finally {
      if (window.location && window.location.pathname !== "/login") {
        window.location.href = "/login";
      } else {
        window.location.reload();
      }
    }
  };

  // Group tags by week (compact view)
  const groupedByWeek = tags
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .reduce((acc, t) => {
      const key = weekKey(t.createdAt);
      (acc[key] = acc[key] || []).push(t);
      return acc;
    }, {});

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Toast */}
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      />

      {/* Header + Logout */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-700 flex items-center">
          <span className="mr-2">eTag</span>
          <img
            src={require("../assets/pbhs.png")}
            alt="eTag Icon"
            className="w-6 h-6"
          />
        </h1>

        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg shadow hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Logout
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-6 gap-4">
        <div className="flex flex-col">
          <label htmlFor="sessionType" className="mb-2 text-gray-700 font-medium">
            Select Session Type:
          </label>
          <select
            id="sessionType"
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value)}
            className="px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ color: "black" }}
          >
            <option value="Preseason" style={{ color: "black" }}>
              Preseason
            </option>
            <option value="Practice" style={{ color: "black" }}>
              Practice
            </option>
            <option value="Game" style={{ color: "black" }}>
              Game
            </option>
          </select>
        </div>

        <div className="flex">
          <button
            onClick={fetchGeoTag}
            disabled={hasTaggedToday}
            className={
              "px-6 py-2 text-white font-semibold rounded-lg shadow-md focus:outline-none " +
              (hasTaggedToday
                ? "bg-blue-600 opacity-50 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500")
            }
          >
            Tag Session
          </button>
          <button
            onClick={downloadClaimsAsExcel}
            className="ml-4 px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Download Claims
          </button>
        </div>
      </div>

      {hasTaggedToday && (
        <p className="text-sm text-gray-600 -mt-3 mb-4">
          You’ve already tagged a session today. Try again tomorrow.
        </p>
      )}

      {/* Address + IP */}
      {address && (
        <div className="mt-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">Address:</h3>
          <p className="text-gray-600">{address}</p>
          {ipAddress && (
            <div className="mt-2">
              <h3 className="text-lg font-semibold text-gray-800">IP Address:</h3>
              <p className="text-gray-600">{ipAddress}</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-6 text-center text-red-600 font-medium">{error}</p>
      )}

      {/* Layout: Map + Tagged Weeks (compact) */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div id="map" className="w-full h-80 border rounded-lg"></div>
        </div>

        {/* Tagged Weeks Compact List */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-800">Your Tagged Weeks</h3>
            <button
              onClick={loadUserTags}
              className="text-sm px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >
              Refresh
            </button>
          </div>

          {tags.length === 0 ? (
            <p className="text-gray-600 text-sm">No sessions recorded yet.</p>
          ) : (
            <div className="space-y-4 max-h-80 overflow-auto pr-1">
              {Object.entries(
                tags
                  .slice()
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .reduce((acc, t) => {
                    const key = weekKey(t.createdAt);
                    (acc[key] = acc[key] || []).push(t);
                    return acc;
                  }, {})
              ).map(([wk, entries]) => (
                <div key={wk}>
                  <div className="font-medium text-gray-700 mb-1">{wk}</div>
                  <ul className="space-y-1 ml-3">
                    {entries.map((t, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <span className="px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200">
                          {t.sessionType}
                        </span>
                        <span className="text-gray-800">{weekday(t.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeoTagPage;
