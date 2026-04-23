const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginSubmitButton = document.getElementById("loginSubmitButton");
const togglePasswordButton = document.getElementById("togglePassword");
const loginEndpoint =
  window.location.port === "5500"
    ? "http://127.0.0.1:8000/api/users/login/"
    : "/api/users/login/";

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
    const data = await apiFetch(loginEndpoint, {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });

    showLoginMessage(data.message || "Login successful.", "success");

    if (data.access && data.refresh) {
      setTokens(data.access, data.refresh);
    }

    loginForm.reset();
    loginForm.classList.remove("was-validated");

    if (data.redirect_url) {
      setTimeout(() => {
        window.location.href = data.redirect_url;
      }, 900);
    }
  } catch (error) {
    showLoginMessage(error.message || "Unable to log in with those credentials.", "danger");
  } finally {
    loginSubmitButton.disabled = false;
    loginSubmitButton.textContent = "Log In";
  }
});
