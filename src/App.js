import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import GeoTagPage from "./components/GeoTagPage";
import AdminPage from "./components/AdminPage";
import AdminUserClaims from "./components/AdminUserClaims";

// NEW: import CoachesPage
import CoachesPage from "./components/CoachesPage"; // <- or "../pages/CoachesPage"

const Shell = ({ children }) => {
  const location = useLocation();
  const wide = location.pathname.startsWith("/admin"); // /admin, /admin/coaches, /admin/claims/*

  return (
    <div className="min-h-screen bg-gray-700 flex flex-col">
      <header className="bg-gray-800 text-white p-4">
        <h1 className="text-2xl font-semibold text-center" style={{ fontFamily: "'Dancing Script', cursive" }}>
          GeoTagger <span className="text-sm">™</span>
        </h1>
      </header>

      <main className="flex-1 flex justify-center items-start p-6">
        <div className={`w-full ${wide ? "max-w-7xl" : "max-w-lg"} bg-gray-900 shadow-md rounded-lg p-6`}>
          {children}
        </div>
      </main>

      <footer className="bg-gray-800 text-white p-4 text-center">
        <p>&copy; 2024 GeoApp. All rights reserved.</p>
      </footer>
    </div>
  );
};

const App = () => (
  <Router>
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/geotag" element={<GeoTagPage />} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/coaches" element={<CoachesPage />} /> {/* NEW */}
        <Route path="/admin/claims/:email" element={<AdminUserClaims />} />
      </Routes>
    </Shell>
  </Router>
);

export default App;
