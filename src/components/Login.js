import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserPlus, faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";
import {jwtDecode} from "jwt-decode"; 

const Login = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch(
        "https://localhost:7047/api/Auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Invalid email or password.");
      }

      const { token } = await response.json();
      localStorage.setItem("token", token); // Save token for future API calls

      // Decode the JWT token
      const decodedToken = jwtDecode(token);
      console.log("Decoded JWT Token:", decodedToken);

      // Extract and store the user's email
      const email = decodedToken.email || decodedToken.sub; // Adjust based on your JWT structure
      if (!email) {
        throw new Error("Email not found in token.");
      }
      localStorage.setItem("email", email); // Store email in localStorage

      // Optional: Pass decoded token to parent (if needed)
      if (onLoginSuccess) onLoginSuccess(decodedToken);

      // Navigate to the GeoTag page
      navigate("/geotag");
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    }
  };

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
          src="/pbhs.png" // Use '/pbhs.png' for public folder
          alt="Logo"
          style={{ width: "100px", margin: "0 auto 20px auto", display: "block" }}
        />

        <p style={{ color: "#888", fontSize: "14px", marginBottom: "20px" }}>
          Login with your email
        </p>

        <form
          onSubmit={handleLogin}
          style={{ display: "flex", flexDirection: "column" }}
        >
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
            style={{
              padding: "12px",
              backgroundColor: "#007BFF",
              color: "#fff",
              fontSize: "16px",
              fontWeight: "bold",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Login
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
