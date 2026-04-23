const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginSubmitButton = document.getElementById("loginSubmitButton");
const togglePasswordButton = document.getElementById("togglePassword");

function showLoginMessage(message, type) {
  loginMessage.textContent = message;
  loginMessage.className = `alert alert-${type}`;
}

function resetLoginMessage() {
  loginMessage.textContent = "";
  loginMessage.className = "alert d-none";
}

function togglePasswordVisibility() {
  const passwordInput = document.getElementById("loginPassword");
  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    togglePasswordButton.textContent = "Hide";
  } else {
    passwordInput.type = "password";
    togglePasswordButton.textContent = "Show";
  }
}

function formatLockoutTime(isoString) {
  if (!isoString) return null;
  try {
    const until = new Date(isoString);
    const now = new Date();
    const diffMs = until - now;
    if (diffMs <= 0) return null;
    const diffMins = Math.ceil(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""}`;
    const diffHours = Math.ceil(diffMins / 60);
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
  } catch {
    return null;
  }
}

// Redirect already-authenticated users away from the login page
document.addEventListener("DOMContentLoaded", () => {
  const token = getAccessToken();
  if (token) {
    window.location.href = "/";
  }
});

togglePasswordButton?.addEventListener("click", togglePasswordVisibility);

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  resetLoginMessage();

  if (!loginForm.checkValidity()) {
    event.stopPropagation();
    loginForm.classList.add("was-validated");
    showLoginMessage("Please correct the highlighted fields and try again.", "danger");
    return;
  }

  loginForm.classList.add("was-validated");
  loginSubmitButton.disabled = true;
  loginSubmitButton.textContent = "Logging In...";

  const identifier = document.getElementById("loginIdentifier").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    const data = await apiFetch("/api/users/login/", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });

    if (data.access && data.refresh) {
      setTokens(data.access, data.refresh);
    }

    showLoginMessage(data.message || "Login successful.", "success");
    loginForm.reset();
    loginForm.classList.remove("was-validated");

    const redirectUrl = data.redirect_url;
    const safeRedirect =
      redirectUrl && redirectUrl.startsWith("/") && !redirectUrl.startsWith("//")
        ? redirectUrl
        : "/";

    setTimeout(() => {
      window.location.href = safeRedirect;
    }, 900);
  } catch (error) {
    // Attempt to extract lockout time from a structured error if available
    let message = error.message || "Unable to log in with those credentials.";
    if (error.locked_until) {
      const timeLeft = formatLockoutTime(error.locked_until);
      if (timeLeft) {
        message = `Your account is locked. Try again in ${timeLeft}.`;
      }
    }
    showLoginMessage(message, "danger");
  } finally {
    loginSubmitButton.disabled = false;
    loginSubmitButton.textContent = "Log In";
  }
});
