const resetPasswordForm = document.getElementById("resetPasswordForm");
const resetPasswordMessage = document.getElementById("resetPasswordMessage");
const resetPasswordSubmitButton = document.getElementById("resetPasswordSubmitButton");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmNewPassword");
const strengthBar = document.getElementById("strengthBar");
const strengthText = document.getElementById("strengthText");

const resetPasswordEndpoint =
  window.location.port === "5500"
    ? "http://127.0.0.1:8000/api/users/password-reset/confirm/"
    : "/api/users/password-reset/confirm/";

function setResetPasswordMessage(message, type) {
  resetPasswordMessage.textContent = message;
  resetPasswordMessage.className = `alert alert-${type}`;
  resetPasswordMessage.classList.remove('d-none');
  resetPasswordMessage.style.display = 'block';
  // Scroll to message
  resetPasswordMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function resetMessage() {
  resetPasswordMessage.textContent = "";
  resetPasswordMessage.className = "alert d-none";
}

// Calculate password strength
function calculatePasswordStrength(password) {
  let strength = 0;
  
  if (!password) return 0;
  
  // Length
  if (password.length >= 8) strength += 1;
  if (password.length >= 12) strength += 1;
  if (password.length >= 16) strength += 1;
  
  // Lowercase
  if (/[a-z]/.test(password)) strength += 1;
  
  // Uppercase
  if (/[A-Z]/.test(password)) strength += 1;
  
  // Numbers
  if (/[0-9]/.test(password)) strength += 1;
  
  // Special characters
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 1;
  
  return Math.min(strength, 5); // Max strength of 5
}

// Update password strength display
function updatePasswordStrength() {
  const password = newPasswordInput.value;
  const strength = calculatePasswordStrength(password);
  
  const strengthPercentage = (strength / 5) * 100;
  strengthBar.style.width = strengthPercentage + '%';
  
  // Set color based on strength
  if (strength === 0) {
    strengthBar.style.backgroundColor = '#ccc';
    strengthText.textContent = 'No password';
  } else if (strength === 1) {
    strengthBar.style.backgroundColor = '#dc3545';
    strengthText.textContent = 'Very Weak';
  } else if (strength === 2) {
    strengthBar.style.backgroundColor = '#fd7e14';
    strengthText.textContent = 'Weak';
  } else if (strength === 3) {
    strengthBar.style.backgroundColor = '#ffc107';
    strengthText.textContent = 'Fair';
  } else if (strength === 4) {
    strengthBar.style.backgroundColor = '#28a745';
    strengthText.textContent = 'Good';
  } else {
    strengthBar.style.backgroundColor = '#20c997';
    strengthText.textContent = 'Strong';
  }
  
  // Update requirements
  updateRequirements(password);
  
  // Check password match
  validatePasswordMatch();
}

// Update password requirements checklist
function updateRequirements(password) {
  const requirements = {
    'req-length': password.length >= 8,
    'req-uppercase': /[A-Z]/.test(password),
    'req-lowercase': /[a-z]/.test(password),
    'req-number': /[0-9]/.test(password),
    'req-special': /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };
  
  for (const [id, met] of Object.entries(requirements)) {
    const element = document.getElementById(id);
    if (met) {
      element.classList.add('met');
    } else {
      element.classList.remove('met');
    }
  }
}

// Validate password match
function validatePasswordMatch() {
  const newPassword = newPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  const feedbackElement = document.getElementById("confirmFeedback");
  
  if (confirmPassword && newPassword !== confirmPassword) {
    confirmPasswordInput.classList.add('is-invalid');
    feedbackElement.textContent = 'Passwords do not match.';
    return false;
  } else {
    confirmPasswordInput.classList.remove('is-invalid');
    feedbackElement.textContent = 'Please confirm your new password.';
    return true;
  }
}

// Event listeners
newPasswordInput?.addEventListener('input', updatePasswordStrength);
confirmPasswordInput?.addEventListener('input', validatePasswordMatch);

// Extract URL parameters
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    uid: params.get("uid"),
    token: params.get("token")
  };
}

// Validate reset link on page load
document.addEventListener('DOMContentLoaded', () => {
  const { uid, token } = getUrlParams();
  
  if (!uid || !token) {
    setResetPasswordMessage(
      "This reset link is invalid or has expired. Please request a new password reset link.",
      "danger"
    );
    resetPasswordForm.style.display = 'none';
    resetPasswordSubmitButton.disabled = true;
  }
});

resetPasswordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  resetMessage();

  const { uid, token } = getUrlParams();

  if (!uid || !token) {
    setResetPasswordMessage("This reset link is missing required information.", "danger");
    return;
  }

  if (!resetPasswordForm.checkValidity()) {
    resetPasswordForm.classList.add("was-validated");
    setResetPasswordMessage("Please complete the highlighted fields.", "danger");
    return;
  }

  const newPassword = newPasswordInput.value;
  const confirmNewPassword = confirmPasswordInput.value;

  if (!validatePasswordMatch()) {
    resetPasswordForm.classList.add("was-validated");
    setResetPasswordMessage("Your passwords do not match.", "danger");
    return;
  }

  resetPasswordForm.classList.add("was-validated");
  resetPasswordSubmitButton.disabled = true;
  resetPasswordSubmitButton.textContent = "Updating password...";

  try {
    const data = await apiFetch(resetPasswordEndpoint, {
      method: "POST",
      body: JSON.stringify({
        uid,
        token,
        new_password: newPassword,
      }),
    });

    setResetPasswordMessage(
      "Your password has been updated successfully! Redirecting to login...",
      "success"
    );
    resetPasswordForm.reset();
    resetPasswordForm.classList.remove("was-validated");
    strengthBar.style.width = "0%";
    strengthText.textContent = "";
    
    // Clear requirement indicators
    document.querySelectorAll('.requirement').forEach(el => {
      el.classList.remove('met');
    });

    setTimeout(() => {
      window.location.href = "/login/";
    }, 2000);
  } catch (error) {
    setResetPasswordMessage(
      "We could not reach the server. Please try again in a moment.",
      "danger"
    );
  } finally {
    resetPasswordSubmitButton.disabled = false;
    resetPasswordSubmitButton.textContent = "Update Password";
  }
});
