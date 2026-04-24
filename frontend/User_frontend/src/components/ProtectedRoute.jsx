import { Navigate, useLocation } from "react-router-dom";

const USER_TOKEN_KEY = "welp_user_token";

export function getUserToken() {
  const token = localStorage.getItem(USER_TOKEN_KEY);
  if (!token || token === "null" || token === "undefined") {
    return null;
  }

  return token;
}

export function setUserToken(token) {
  if (token) localStorage.setItem(USER_TOKEN_KEY, token);
  else localStorage.removeItem(USER_TOKEN_KEY);
}

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = getUserToken();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
