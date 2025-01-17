import axios from "axios";

const API_URL = "http://localhost:5216/api/Auth"; // Replace with your API base URL

// Register a user
export const registerUser = async (userData) => {
  try {
    const response = await axios.post(`${API_URL}/Register`, userData);
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// Login a user
export const loginUser = async (credentials) => {
  try {
    const response = await axios.post(`${API_URL}/Login`, credentials);
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// Fetch all users (Admin only)
export const getAllUsers = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/GetAllUsers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// Update profile image
export const updateProfileImage = async (data, token) => {
  try {
    const response = await axios.put(`${API_URL}/UpdateProfileImage`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// Other endpoints can follow the same pattern...
