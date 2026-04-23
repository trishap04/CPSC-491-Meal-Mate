const changePasswordForm = document.getElementById("changePasswordForm");
const changePasswordMessage = document.getElementById("changePasswordMessage");
const changePasswordSubmitButton = document.getElementById("changePasswordSubmitButton");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const strengthBar = document.getElementById("strengthBar");
const strengthText = document.getElementById("strengthText");

const changePasswordEndpoint = "/api/users/change-password/";

function showMessage(message, type) {
  changePasswordMessage.textContent = message;
  changePasswordMessage.className = `alert alert-${type}`;
  changePasswordMessage.classList.remove("d-none");
  changePasswordMessage.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function resetMessage() {
  changePasswordMessage.textContent = "";
  changePasswordMessage.className = "alert d-none";
}

function calculatePasswordStrength(password) {
  let strength = 0;

  if (!password) return 0;

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
  const password = newPasswordInput.value;
  const strength = calculatePasswordStrength(password);
  const strengthPercentage = (strength / 5) * 100;
  strengthBar.style.width = strengthPercentage + "%";

  if (strength === 0) {
    strengthBar.style.backgroundColor = "#ccc";
    strengthText.textContent = "No password";
  } else if (strength === 1) {
    strengthBar.style.backgroundColor = "#dc3545";
    strengthText.textContent = "Very Weak";
  } else if (strength === 2) {
    strengthBar.style.backgroundColor = "#fd7e14";
    strengthText.textContent = "Weak";
  } else if (strength === 3) {
    strengthBar.style.backgroundColor = "#ffc107";
    strengthText.textContent = "Fair";
  } else if (strength === 4) {
    strengthBar.style.backgroundColor = "#28a745";
    strengthText.textContent = "Good";
  } else {
    strengthBar.style.backgroundColor = "#20c997";
    strengthText.textContent = "Strong";
  }

  updateRequirements(password);
  validatePasswordMatch();
}

function updateRequirements(password) {
  const requirements = {
    "req-length": password.length >= 8,
    "req-uppercase": /[A-Z]/.test(password),
    "req-lowercase": /[a-z]/.test(password),
    "req-number": /[0-9]/.test(password),
    "req-special": /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  for (const [id, met] of Object.entries(requirements)) {
    const element = document.getElementById(id);
    if (element) {
      element.classList.toggle("met", met);
    }
  }
}

function validatePasswordMatch() {
  const newPassword = newPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  const feedbackElement = document.getElementById("confirmPasswordFeedback");

  if (confirmPassword && newPassword !== confirmPassword) {
    confirmPasswordInput.classList.add("is-invalid");
    if (feedbackElement) feedbackElement.textContent = "Passwords do not match.";
    return false;
  } else {
    confirmPasswordInput.classList.remove("is-invalid");
    if (feedbackElement) feedbackElement.textContent = "Please confirm your new password.";
    return true;
  }
}

newPasswordInput?.addEventListener("input", updatePasswordStrength);
confirmPasswordInput?.addEventListener("input", validatePasswordMatch);

changePasswordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  resetMessage();

  if (!changePasswordForm.checkValidity()) {
    event.stopPropagation();
    changePasswordForm.classList.add("was-validated");
    showMessage("Please correct the highlighted fields and try again.", "danger");
    return;
  }

  if (!validatePasswordMatch()) {
    changePasswordForm.classList.add("was-validated");
    showMessage("Your passwords do not match.", "danger");
    return;
  }

  changePasswordForm.classList.add("was-validated");
  changePasswordSubmitButton.disabled = true;
  changePasswordSubmitButton.textContent = "Changing Password...";

  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = newPasswordInput.value;

  try {
    const data = await apiFetch(changePasswordEndpoint, {
      method: "POST",
      body: JSON.stringify({
        old_password: currentPassword,
        new_password: newPassword,
      }),
    });

    showMessage(data.message || "Your password has been changed successfully!", "success");
    changePasswordForm.reset();
    changePasswordForm.classList.remove("was-validated");
    strengthBar.style.width = "0%";
    strengthText.textContent = "";
    document.querySelectorAll(".requirement").forEach((el) => el.classList.remove("met"));

    setTimeout(() => {
      window.location.href = "/settings/";
    }, 2000);
  } catch (error) {
    showMessage(
      error.message || "We could not change your password. Please try again.",
      "danger"
    );
  } finally {
    changePasswordSubmitButton.disabled = false;
    changePasswordSubmitButton.textContent = "Change Password";
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const token = getAccessToken();
  if (!token) {
    showMessage("You must be logged in to change your password.", "danger");
    setTimeout(() => {
      window.location.href = "/login/";
    }, 1500);
  }
});
