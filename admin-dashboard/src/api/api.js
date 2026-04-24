import { API_BASE } from "../config/api.js";

// ─────────────────────────────────────────
// LOGIN ADMIN
// ─────────────────────────────────────────
export const loginAdmin = async (email, password) => {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  return res.json();
};


// ─────────────────────────────────────────
// GET DASHBOARD STATS
// ─────────────────────────────────────────
export const getStats = async () => {

  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE}/admin/stats`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return res.json();
};


// ─────────────────────────────────────────
// GET ALL REQUESTS
// ─────────────────────────────────────────
export const getRequests = async () => {

  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE}/requests`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return res.json();
};


// ─────────────────────────────────────────
// UPDATE REQUEST STATUS
// ─────────────────────────────────────────
export const updateRequestStatus = async (id, status) => {

  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE}/requests/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });

  return res.json();
};