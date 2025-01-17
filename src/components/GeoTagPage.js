import React, { useState, useEffect, useCallback } from "react";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

const GeoTagPage = () => {
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  // Default coordinates if geolocation fails
  const defaultLocation = {
    latitude: 25.7566,
    longitude: 28.1914,
  };

  const currentLocation = location || defaultLocation;

  // Memoize initMap to resolve React Hook dependency warning
  const initMap = useCallback(() => {
    if (currentLocation) {
      const mapOptions = {
        center: { lat: currentLocation.latitude, lng: currentLocation.longitude },
        zoom: 12,
      };
      const map = new window.google.maps.Map(document.getElementById("map"), mapOptions);
      new window.google.maps.Marker({
        position: { lat: currentLocation.latitude, lng: currentLocation.longitude },
        map: map,
        title: "Location",
      });
    }
  }, [currentLocation]);

  useEffect(() => {
    if (window.google && window.google.maps) {
      initMap();
      return;
    }

    const scriptId = "google-maps-script";
    const existingScript = document.getElementById(scriptId);

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCOCu38e9cnVI6yjtBUTuwBVtyOBuvlMIg&libraries=places&callback=initMap`;
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
      const token = localStorage.getItem("token"); // Get the saved token
  
      const response = await fetch("https://geotagger.azurewebsites.net/api/GeoTag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Include token in the request
        },
        body: JSON.stringify({
          latitude,
          longitude,
          address,
        }),
      });
  
      const result = await response.json();
      if (response.ok) {
        console.log("Tag saved successfully", result);
      } else {
        console.error("Failed to save tag", result);
        setError("Failed to save tag");
      }
    } catch (error) {
      console.error("Error sending data to server", error);
      setError("Error sending data to server");
    }
  };

  const downloadClaimsAsExcel = async () => {
    try {
      const token = localStorage.getItem("token"); // Get the saved token
      const response = await fetch("https://geotagger.azurewebsites.net/api/GeoTag", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch claims.");
      }

      const tags = await response.json();

      // Process tags into a format suitable for Excel
      const data = tags.map((tag) => {
        const date = new Date(tag.createdAt);
        const isWeekend = [0, 6].includes(date.getDay());
        return {
          Month: date.toLocaleString("default", { month: "long" }),
          Day: date.toLocaleString("default", { weekday: "long" }),
          "Claim Details": isWeekend ? "Game" : "Practice",
          Rate: isWeekend ? 250 : 200,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Claims");

      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
      saveAs(blob, "claims.xlsx");
    } catch (error) {
      console.error("Error downloading claims", error);
      setError("Error downloading claims.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-semibold text-center text-gray-700 mb-4 flex items-center justify-center">
        <span className="mr-2">eTag</span>
        <img
          src={require("../assets/pbhs.png")} // Replace with the path to your image in the assets folder
          alt="eTag Icon"
          className="w-6 h-6"
        />
      </h1>

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
