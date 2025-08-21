import React, { useState, useEffect, useCallback } from "react";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { jwtDecode } from "jwt-decode";
import ExcelJS from "exceljs";

const GeoTagPage = () => {
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [error, setError] = useState("");
  const [sessionType, setSessionType] = useState("Practice"); // Default dropdown value

  // Default coordinates if geolocation fails
  const defaultLocation = { latitude: 25.7566, longitude: 28.1914 };
  const currentLocation = location || defaultLocation;

  // --- helpers ---
  const getEmailFromToken = () => {
    // prefer cached email if present
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

  // Memoize initMap to resolve React Hook dependency warning
  const initMap = useCallback(() => {
    if (currentLocation && window.google && window.google.maps) {
      const mapOptions = {
        center: { lat: currentLocation.latitude, lng: currentLocation.longitude },
        zoom: 12,
      };
      const map = new window.google.maps.Map(document.getElementById("map"), mapOptions);
      new window.google.maps.Marker({
        position: { lat: currentLocation.latitude, lng: currentLocation.longitude },
        map,
        title: "Location",
      });
    }
  }, [currentLocation]);

  useEffect(() => {
    fetchIpAddress();

    if (window.google && window.google.maps) {
      initMap();
      return;
    }

    const scriptId = "google-maps-script";
    const existingScript = document.getElementById(scriptId);

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src =
        "https://maps.googleapis.com/maps/api/js?key=AIzaSyCOCu38e9cnVI6yjtBUTuwBVtyOBuvlMIg&libraries=places&callback=initMap";
      script.async = true;
      script.defer = true;
      script.onerror = () => setError("Failed to load Google Maps API.");

      window.initMap = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      const scriptElement = document.getElementById(scriptId);
      if (scriptElement) {
        scriptElement.remove();
      }
      delete window.google;
    };
  }, [initMap]);

  const fetchGeoTag = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
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

            // Send location data to the backend API
            await tagLocationInDatabase(latitude, longitude, formattedAddress);
          } else {
            setAddress("Address not found");
          }
        } catch (err) {
          console.error("Error fetching address", err);
          setError("Failed to fetch address");
        }
      },
      () => {
        setError("Unable to retrieve your location. Showing default location.");
        setLocation(defaultLocation);
      }
    );
  };

  const tagLocationInDatabase = async (latitude, longitude, address) => {
    try {
      const token = localStorage.getItem("token");
      const email = getEmailFromToken();

      if (!email) {
        setError("Could not determine user email from token. Please log in again.");
        return;
      }

      const response = await fetch("https://localhost:7047/api/GeoTag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          latitude,
          longitude,
          address,
          sessionType, // Include session type
          ipAddress,   // Include IP address in the request
          email,       // <-- Send email from decoded JWT
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        console.log("Tag saved successfully", result);
      } else {
        console.error("Failed to save tag", result);
        setError(result?.message || "Failed to save tag");
      }
    } catch (error) {
      console.error("Error sending data to server", error);
      setError("Error sending data to server");
    }
  };

  const downloadClaimsAsExcel = async () => {
    try {
      const token = localStorage.getItem("token");
      const email = localStorage.getItem("email") || getEmailFromToken();
  
      if (!email) {
        setError("User email not found. Please log in again.");
        return;
      }
  
      const url = `https://localhost:7047/api/GeoTag?email=${encodeURIComponent(email)}`;
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
        Preseason: tags.filter(t => t.sessionType === "Preseason").length,
        Practice:  tags.filter(t => t.sessionType === "Practice").length,
        Game:      tags.filter(t => t.sessionType === "Game").length,
      };
      const totalSessions = tags.length;
      const netTotal = tags.reduce((sum, t) => sum + (t.rate || 0), 0);
  
      // ---- Create Workbook ----
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Claims");
  
      // Thin border
      const thin = { style: "thin", color: { argb: "FFCCCCCC" } };
  
      // ---- Title (row 1) ----
      ws.mergeCells("A1:D1");
      ws.getCell("A1").value = "PBHS eTag Claims Report";
      ws.getCell("A1").font = { size: 16, bold: true };
      ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  
      // ---- Logo: fixed size, visually centered under title (no stretch) ----
      try {
        // If your bundler supports importing assets, prefer:
        //   import pbhsLogo from "../assets/pbhs.png";
        //   const imgResp = await fetch(pbhsLogo);
        const imgResp = await fetch(require("../assets/pbhs.png"));
        const imgBlob = await imgResp.blob();
        const imgBuf = await imgBlob.arrayBuffer();
  
        const imgId = wb.addImage({ buffer: imgBuf, extension: "png" });
  
        // Breathing room under title (so the image has space)
        ws.getRow(2).height = 35;
        ws.getRow(3).height = 35;
  
        // Choose a fixed size (tweak to taste; keep your logo aspect ratio)
        const widthPx = 260;
        const heightPx = 140;
  
        // Place top-left roughly between columns B & C, under the title
        // Fractional columns allow fine centering without merging/stretching
        ws.addImage(imgId, {
          tl: { col: 1.7, row: 1.4 }, // ~B/C and row ~2
          ext: { width: widthPx, height: heightPx },
          editAs: "oneCell",
        });
      } catch (e) {
        console.warn("Could not insert PBHS logo", e);
      }
  
      // ---- Table starts below the logo area ----
      let rowIdx = 8;
  
      // Headers
      ws.getRow(rowIdx).values = ["Date", "Session Type", "Rate", "Address"];
      ws.getRow(rowIdx).font = { bold: true };
      ws.getRow(rowIdx).alignment = { vertical: "middle" };
      ws.getRow(rowIdx).eachCell(c => {
        c.border = { top: thin, left: thin, bottom: thin, right: thin };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
      });
  
      // Data rows (sorted by date)
      tags
        .slice()
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .forEach(t => {
          rowIdx += 1;
          ws.getRow(rowIdx).values = [
            new Date(t.createdAt).toLocaleDateString(),
            t.sessionType,
            t.rate || 0,
            t.address,
          ];
          ws.getRow(rowIdx).eachCell((c, colNumber) => {
            c.border = { top: thin, left: thin, bottom: thin, right: thin };
            if (colNumber === 3) {
              c.numFmt = '#,##0.00';              // use '"R" #,##0.00' for Rand
              c.alignment = { horizontal: "right" };
            }
          });
        });
  
      // Total row
      rowIdx += 1;
      ws.getRow(rowIdx).values = ["Total", "", netTotal, ""];
      ws.getRow(rowIdx).font = { bold: true };
      ws.getRow(rowIdx).eachCell((c, colNumber) => {
        c.border = { top: thin, left: thin, bottom: thin, right: thin };
        if (colNumber === 3) {
          c.numFmt = '#,##0.00';                  // or '"R" #,##0.00'
          c.alignment = { horizontal: "right" };
        }
      });
  
      // ---- Summary block at the bottom ----
      rowIdx += 2;
      ws.getCell(`A${rowIdx}`).value = "Summary";
      ws.getCell(`A${rowIdx}`).font = { bold: true };
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
        if (label === "Net Total (All Claims)") {
          ws.getCell(`B${rowIdx}`).numFmt = '#,##0.00'; // or '"R" #,##0.00'
        }
        rowIdx += 1;
      });
  
      // ---- Column widths ----
      ws.columns = [
        { key: "date", width: 14 },
        { key: "type", width: 18 },
        { key: "rate", width: 12 },
        { key: "addr", width: 60 },
      ];
  
      // ---- Save File ----
      const out = await wb.xlsx.writeBuffer();
      saveAs(new Blob([out]), "claims.xlsx");
    } catch (error) {
      console.error("Error downloading claims", error);
      setError((error && error.message) || "Error downloading claims.");
    }
  };
  
  


  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-semibold text-center text-gray-700 mb-4 flex items-center justify-center">
        <span className="mr-2">eTag</span>
        <img
          src={require("../assets/pbhs.png")}
          alt="eTag Icon"
          className="w-6 h-6"
        />
      </h1>

      <div className="flex flex-col items-center mb-6">
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
          <option value="Preseason" style={{ color: "black" }}>Preseason</option>
          <option value="Practice" style={{ color: "black" }}>Practice</option>
          <option value="Game" style={{ color: "black" }}>Game</option>
        </select>
      </div>

      <div className="flex justify-center mb-6">
        <button
          onClick={fetchGeoTag}
          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      <div id="map" className="mt-6 w-full h-80 border rounded-lg"></div>
    </div>
  );
};

export default GeoTagPage;
