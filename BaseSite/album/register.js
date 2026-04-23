const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");
const registerSubmitButton = document.getElementById("registerSubmitButton");
const registerUsername = document.getElementById("registerUsername");
const registerEmail = document.getElementById("registerEmail");
const registerPassword = document.getElementById("registerPassword");
const usernameAvailability = document.getElementById("usernameAvailability");
const usernameMessage = document.getElementById("usernameMessage");
const emailAvailability = document.getElementById("emailAvailability");
const emailMessage = document.getElementById("emailMessage");
const strengthMeter = document.getElementById("strengthMeter");
const strengthText = document.getElementById("strengthText");

let usernameCheckTimeout;
let emailCheckTimeout;

// ─── Password strength ────────────────────────────────────────────────────────

function calculatePasswordStrength(password) {
  if (!password) return 0;
  let strength = 0;
  if (password.length >= 8) strength += 1;
  if (password.length >= 12) strength += 1;
  if (password.length >= 16) strength += 1;
  if (/[a-z]/.test(password)) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/[0-9]/.test(password)) strength += 1;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 1;
  return Math.min(strength, 5);
}

function updatePasswordStrength() {
  const password = registerPassword.value;
  const strength = calculatePasswordStrength(password);
  const pct = (strength / 5) * 100;
  strengthMeter.style.width = pct + "%";

  const levels = [
    ["#ccc", "No password"],
    ["#d32f2f", "Very Weak"],
    ["#f57c00", "Weak"],
    ["#fbc02d", "Fair"],
    ["#7cb342", "Good"],
    ["#388e3c", "Strong"],
  ];
  const [color, label] = levels[strength];
  strengthMeter.style.backgroundColor = color;
  strengthText.textContent = label;
}

registerPassword?.addEventListener("input", updatePasswordStrength);

// ─── Availability indicator helpers ──────────────────────────────────────────

function setAvailabilityUI(iconEl, msgEl, inputEl, icon, color, msg, valid) {
  iconEl.textContent = icon;
  iconEl.style.color = color;
  msgEl.textContent = msg;
  msgEl.style.color = color;
  inputEl.classList.toggle("is-valid", valid === true);
  inputEl.classList.toggle("is-invalid", valid === false);
}

function clearAvailabilityUI(iconEl, msgEl, inputEl) {
  iconEl.textContent = "";
  msgEl.textContent = "";
  inputEl.classList.remove("is-valid", "is-invalid");
}

// ─── Real-time username check ─────────────────────────────────────────────────

registerUsername?.addEventListener("input", () => {
  const username = registerUsername.value.trim().toLowerCase();
  clearTimeout(usernameCheckTimeout);

  if (!username) {
    clearAvailabilityUI(usernameAvailability, usernameMessage, registerUsername);
    return;
  }
  if (username.length < 3) {
    setAvailabilityUI(usernameAvailability, usernameMessage, registerUsername,
      "⚠", "#ff9800", "Username must be at least 3 characters", false);
    return;
  }
  if (!/^[a-z0-9_-]+$/.test(username)) {
    setAvailabilityUI(usernameAvailability, usernameMessage, registerUsername,
      "✗", "#d32f2f", "Only letters, numbers, underscores, and hyphens are allowed", false);
    return;
  }

  usernameCheckTimeout = setTimeout(async () => {
    setAvailabilityUI(usernameAvailability, usernameMessage, registerUsername,
      "⏳", "#666", "Checking…", null);
    try {
      const res = await fetch("/api/users/check-username/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (data.available) {
        setAvailabilityUI(usernameAvailability, usernameMessage, registerUsername,
          "✓", "#388e3c", "Username is available", true);
      } else {
        setAvailabilityUI(usernameAvailability, usernameMessage, registerUsername,
          "✗", "#d32f2f", data.message || "Username is already taken", false);
      }
    } catch {
      setAvailabilityUI(usernameAvailability, usernameMessage, registerUsername,
        "", "#ff9800", "Could not check availability", null);
    }
  }, 500);
});

// ─── Real-time email check ────────────────────────────────────────────────────

registerEmail?.addEventListener("input", () => {
  const email = registerEmail.value.trim().toLowerCase();
  clearTimeout(emailCheckTimeout);

  if (!email) {
    clearAvailabilityUI(emailAvailability, emailMessage, registerEmail);
    return;
  }
  // Only query the server once the value looks like a complete email address
  if (!email.includes("@") || email.split("@")[1]?.length < 2) {
    clearAvailabilityUI(emailAvailability, emailMessage, registerEmail);
    return;
  }

  emailCheckTimeout = setTimeout(async () => {
    setAvailabilityUI(emailAvailability, emailMessage, registerEmail,
      "⏳", "#666", "Checking…", null);
    try {
      const res = await fetch("/api/users/check-email/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.available) {
        setAvailabilityUI(emailAvailability, emailMessage, registerEmail,
          "✓", "#388e3c", "Email is available", true);
      } else {
        setAvailabilityUI(emailAvailability, emailMessage, registerEmail,
          "✗", "#d32f2f", data.message || "Email is already registered", false);
      }
    } catch {
      setAvailabilityUI(emailAvailability, emailMessage, registerEmail,
        "", "#ff9800", "Could not check availability", null);
    }
  }, 500);
});

// ─── Error display ────────────────────────────────────────────────────────────

// Maps serializer field names to their form input elements.
const FIELD_INPUTS = {
  username: registerUsername,
  email: registerEmail,
  password: document.getElementById("registerPassword"),
  first_name: document.getElementById("registerFirstName"),
  last_name: document.getElementById("registerLastName"),
  phone_number: document.getElementById("registerPhone"),
  role: document.getElementById("registerRole"),
};

function showFieldErrors(errorData) {
  let firstMessage = "";

  for (const [field, errors] of Object.entries(errorData)) {
    const message = Array.isArray(errors) ? errors[0] : String(errors);
    if (!firstMessage) firstMessage = message;

    const input = FIELD_INPUTS[field];
    if (!input) continue;

    input.classList.add("is-invalid");
    // Try to find the .invalid-feedback sibling within the same .mb-3 wrapper
    const wrapper = input.closest(".mb-3") ?? input.parentElement;
    const feedback = wrapper?.querySelector(".invalid-feedback");
    if (feedback) feedback.textContent = message;
  }

  setRegisterMessage(firstMessage || "Unable to create your account.", "danger");
}

function setRegisterMessage(message, type) {
  registerMessage.textContent = message;
  registerMessage.className = `alert alert-${type}`;
}

// ─── Availability pre-check helper ───────────────────────────────────────────

async function checkAvailability(endpoint, payload) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ─── Form submission ──────────────────────────────────────────────────────────

registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  registerMessage.className = "alert d-none";

  const username = registerUsername.value.trim().toLowerCase();
  const email = registerEmail.value.trim().toLowerCase();
  const password = registerPassword.value;
  const confirmPassword = document.getElementById("registerPasswordConfirm").value;

  if (!registerForm.checkValidity()) {
    registerForm.classList.add("was-validated");
    setRegisterMessage("Please complete all required fields.", "danger");
    return;
  }

  if (password !== confirmPassword) {
    registerForm.classList.add("was-validated");
    setRegisterMessage("Passwords do not match.", "danger");
    return;
  }

  // Pre-submit uniqueness gates — catches races that slip past the real-time checks
  try {
    const [usernameResult, emailResult] = await Promise.all([
      checkAvailability("/api/users/check-username/", { username }),
      checkAvailability("/api/users/check-email/", { email }),
    ]);

    if (!usernameResult.available) {
      setAvailabilityUI(usernameAvailability, usernameMessage, registerUsername,
        "✗", "#d32f2f", usernameResult.message || "Username is already taken", false);
      setRegisterMessage(usernameResult.message || "That username is already taken.", "danger");
      return;
    }
    if (!emailResult.available) {
      setAvailabilityUI(emailAvailability, emailMessage, registerEmail,
        "✗", "#d32f2f", emailResult.message || "Email is already registered", false);
      setRegisterMessage(emailResult.message || "An account with that email already exists.", "danger");
      return;
    }
  } catch {
    setRegisterMessage("Could not verify your details. Please try again.", "danger");
    return;
  }

  registerForm.classList.add("was-validated");
  registerSubmitButton.disabled = true;
  registerSubmitButton.textContent = "Creating Account…";

  try {
    const data = await apiFetch("/api/users/register/", {
      method: "POST",
      body: JSON.stringify({
        username,
        email,
        password,
        first_name: document.getElementById("registerFirstName").value.trim(),
        last_name: document.getElementById("registerLastName").value.trim(),
        phone_number: document.getElementById("registerPhone").value.trim() || undefined,
        role: document.getElementById("registerRole").value,
        terms_accepted: document.getElementById("termsCheckbox").checked,
      }),
    });

    if (data.access && data.refresh) {
      setTokens(data.access, data.refresh);
    }

    setRegisterMessage(data.message || "Account created. Logging you in…", "success");
    registerForm.reset();
    registerForm.classList.remove("was-validated");
    strengthMeter.style.width = "0%";

    setTimeout(() => {
      window.location.href = "/";
    }, 1500);
  } catch (error) {
    // apiFetch throws with extra fields from the error body attached
    if (error.non_field_errors || Object.keys(error).some(k => k in FIELD_INPUTS)) {
      showFieldErrors(error);
    } else {
      setRegisterMessage(error.message || "Unable to create your account.", "danger");
    }
  } finally {
    registerSubmitButton.disabled = false;
    registerSubmitButton.textContent = "Create Account";
  }
});
