import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    preseasonRate: "",
    gameRate: "",
    practiceRate: "",
    sport: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();

  // Handle input changes
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Convert rates to numbers
    const formDataWithRates = {
      ...formData,
      preseasonRate: parseFloat(formData.preseasonRate),
      gameRate: parseFloat(formData.gameRate),
      practiceRate: parseFloat(formData.practiceRate),
    };

    try {
      const response = await fetch(
        "https://geotagger-api.fly.dev/api/Auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formDataWithRates),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed.");
      }

      const data = await response.json();
      setSuccess(data.message || "Registration successful!");
      setFormData({
        name: "",
        email: "",
        password: "",
        preseasonRate: "",
        gameRate: "",
        practiceRate: "",
        sport: "",
      });

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    }
  };

  return (
    <div
      style={{
        maxWidth: "500px",
        margin: "50px auto",
        padding: "20px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        backgroundColor: "#fff",
      }}
    >
      <h2
        style={{
          textAlign: "center",
          marginBottom: "20px",
          color: "#333",
          fontWeight: "bold",
        }}
      >
        Register
      </h2>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "15px" }}
      >
        <input
          type="text"
          name="name"
          placeholder="Name"
          value={formData.name}
          onChange={handleInputChange}
          required
          style={{
            padding: "12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "16px",
            color: "#000",
            backgroundColor: "#fff",
          }}
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleInputChange}
          required
          style={{
            padding: "12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
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
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "16px",
            color: "#000",
            backgroundColor: "#fff",
          }}
        />
        <input
          type="number"
          name="preseasonRate"
          placeholder="Preseason Rate"
          value={formData.preseasonRate}
          onChange={handleInputChange}
          style={{
            padding: "12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "16px",
            color: "#000",
            backgroundColor: "#fff",
          }}
        />
        <input
          type="number"
          name="gameRate"
          placeholder="Game Rate"
          value={formData.gameRate}
          onChange={handleInputChange}
          style={{
            padding: "12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "16px",
            color: "#000",
            backgroundColor: "#fff",
          }}
        />
        <input
          type="number"
          name="practiceRate"
          placeholder="Practice Rate"
          value={formData.practiceRate}
          onChange={handleInputChange}
          style={{
            padding: "12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "16px",
            color: "#000",
            backgroundColor: "#fff",
          }}
        />
        <select
          name="sport"
          value={formData.sport}
          onChange={handleInputChange}
          style={{
            padding: "12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "16px",
            color: "#000",
            backgroundColor: "#fff",
          }}
          required
        >
          <option value="">Select a sport</option>
          <option value="Soccer">Soccer</option>
          <option value="Basketball">Basketball</option>
          <option value="Tennis">Tennis</option>
          <option value="Squash">Squash</option>
          <option value="Rugby">Rugby</option>
          <option value="Hockey">Hockey</option>
          <option value="Swimming">Swimming</option>
          <option value="Water Polo">Water Polo</option>
          <option value="Athletics">Athletics</option>
        </select>
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
            transition: "background-color 0.3s",
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = "#0056b3")}
          onMouseOut={(e) => (e.target.style.backgroundColor = "#007BFF")}
        >
          Register
        </button>
        {success && (
          <p
            style={{
              color: "green",
              textAlign: "center",
              marginTop: "10px",
              fontWeight: "bold",
            }}
          >
            {success}
          </p>
        )}
        {error && (
          <p
            style={{
              color: "red",
              textAlign: "center",
              marginTop: "10px",
              fontWeight: "bold",
            }}
          >
            {error}
          </p>
        )}
      </form>
    </div>
  );
};

export default Register;
