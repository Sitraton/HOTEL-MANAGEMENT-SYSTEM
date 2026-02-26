const API_BASE_URL = "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("admin_token");
}

function setToken(token) {
  localStorage.setItem("admin_token", token);
}

function clearToken() {
  localStorage.removeItem("admin_token");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseJsonSafe(res) {
  return res.json().catch(() => ({}));
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { ...authHeaders() }
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message || `Request failed: ${res.status}`);
  return data;
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body)
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message || `Request failed: ${res.status}`);
  return data;
}

async function apiPut(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body)
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message || `Request failed: ${res.status}`);
  return data;
}

async function apiPatch(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body ? JSON.stringify(body) : null
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.message || `Request failed: ${res.status}`);
  return data;
}