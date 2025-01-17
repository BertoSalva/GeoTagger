import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import GeoTagPage from "./components/GeoTagPage";

const App = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-700 flex flex-col">
        {/* Header */}
        <header className="bg-gray-800 text-white p-4">
          <h1 className="text-2xl font-semibold text-center" style={{ fontFamily: "'Dancing Script', cursive" }}>
            GeoTagger <span className="text-sm">™</span>
          </h1>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex justify-center items-center p-6">
          <div className="w-full max-w-lg bg-gray-900 shadow-md rounded-lg p-6">
            {/* Define Routes */}
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/geotag" element={<GeoTagPage />} />
              <Route path="/register" element={<Register />} />
            </Routes>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 text-white p-4 text-center">
          <p>&copy; 2024 GeoApp. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  );
};

export default App;
