export function clearAdminSession() {
  localStorage.removeItem("token");
}

export function handleAdminAuthFailure(response) {
  if (response.status !== 401 && response.status !== 403) {
    return false;
  }

  clearAdminSession();
  window.location.replace("/");
  return true;
}
