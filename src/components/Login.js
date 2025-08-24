import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserPlus, faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";
import { jwtDecode } from "jwt-decode";

const Login = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // --- helpers ---
  const getEmailFromToken = (d) =>
    d?.email ||
    d?.sub ||
    d?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/email"] ||
    d?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ||
    null;

  const getRoleFromToken = (d) =>
    d?.role ||
    d?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
    "User";

  const routeByRole = (role) => {
    const r = String(role || "User").trim().toLowerCase();
    if (r !== "user") navigate("/admin");
    else navigate("/geotag");
  };

  // Auto-redirect if already logged in and token valid
  // useEffect(() => {
  //   const token = localStorage.getItem("token");
  //   if (!token) return;

  //   try {
  //     const d = jwtDecode(token);
  //     if (d?.exp && d.exp * 1000 <= Date.now()) {
  //       // expired token; clear and stay on login
  //       localStorage.removeItem("token");
  //       localStorage.removeItem("email");
  //       localStorage.removeItem("role");
  //       return;
  //     }
  //     const email = localStorage.getItem("email") || getEmailFromToken(d);
  //     const role = localStorage.getItem("role") || getRoleFromToken(d);
  //     if (email) localStorage.setItem("email", email);
  //     if (role) localStorage.setItem("role", role);
  //     routeByRole(role);
  //   } catch {
  //     // bad token, ignore
  //   }
  // }, [navigate]);

  // --- handlers ---
  const handleInputChange = (e) => {
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("https://geotagger-api.fly.dev/api/Auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Invalid email or password.");
      }

      const { token } = await response.json();
      localStorage.setItem("token", token);

      const d = jwtDecode(token);
      const email = getEmailFromToken(d);
      const role = getRoleFromToken(d);

      if (!email) throw new Error("Email not found in token.");

      localStorage.setItem("email", email);
      localStorage.setItem("role", role);

      if (onLoginSuccess) onLoginSuccess({ ...d, email, role });

      routeByRole(role);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- ui ---
  return (
    <div>
      <nav className="mb-6 text-center">
        <Link
          to="/register"
          className="text-green-500 hover:text-green-300 font-semibold mx-3 flex items-center justify-center text-lg py-2 px-3"
        >
          <FontAwesomeIcon icon={faUserPlus} className="mr-2 text-2xl" />
          Register
        </Link>
        <Link
          to="/geotag"
          className="text-red-500 hover:text-red-300 font-semibold mx-3 flex items-center justify-center text-lg py-2 px-3"
        >
          <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2 text-2xl" />
          ETag
        </Link>
      </nav>

      <div
        style={{
          maxWidth: "400px",
          margin: "50px auto",
          padding: "20px",
          borderRadius: "10px",
          boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
          backgroundColor: "#fff",
          textAlign: "center",
        }}
      >
        <img
          src="/pbhs.png" // public folder
          alt="Logo"
          style={{ width: "100px", margin: "0 auto 20px auto", display: "block" }}
        />

        <p style={{ color: "#888", fontSize: "14px", marginBottom: "20px" }}>
          Login with your email
        </p>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column" }}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleInputChange}
            required
            style={{
              padding: "12px",
              marginBottom: "15px",
              border: "1px solid #ddd",
              borderRadius: "5px",
              fontSize: "16px",
              color: "#000",
              backgroundColor: "#fff",
            }}
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleInputChange}
            required
            style={{
              padding: "12px",
              marginBottom: "15px",
              border: "1px solid #ddd",
              borderRadius: "5px",
              fontSize: "16px",
              color: "#000",
              backgroundColor: "#fff",
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px",
              backgroundColor: loading ? "#7aaef7" : "#007BFF",
              color: "#fff",
              fontSize: "16px",
              fontWeight: "bold",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {loading ? "Signing in..." : "Login"}
          </button>

          {error && (
            <p style={{ color: "red", marginTop: "10px", textAlign: "center" }}>
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
