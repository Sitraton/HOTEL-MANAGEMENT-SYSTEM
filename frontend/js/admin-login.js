const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");
const statusBox = document.getElementById("statusBox");

function showStatus(message, kind = "info") {
  statusBox.style.display = "block";
  statusBox.textContent = message;
  statusBox.style.borderColor =
    kind === "error" ? "rgba(251, 113, 133, 0.5)" :
    kind === "success" ? "rgba(45, 212, 191, 0.5)" :
    "rgba(255, 255, 255, 0.14)";
}

btnLogin.addEventListener("click", async () => {
  const email = emailEl.value.trim();
  const password = passwordEl.value;

  if (!email || !password) return showStatus("Email and password are required.", "error");

  btnLogin.disabled = true;
  btnLogin.textContent = "Logging in...";

  try {
    const res = await apiPost("/auth/login", { email, password });
    localStorage.setItem("admin_token", res.token);
    showStatus("Login successful. Redirecting...", "success");
    setTimeout(() => (window.location.href = "./reservations.html"), 600);
  } catch (err) {
    showStatus(err.message, "error");
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = "Login";
  }
});

if (btnLogout) {
  btnLogout.addEventListener("click", () => {
    localStorage.removeItem("admin_token");
    showStatus("Session cleared.", "success");
  });
}
