const changePasswordForm = document.getElementById("changePasswordForm");
const changePasswordMessage = document.getElementById("changePasswordMessage");
const changePasswordSubmitButton = document.getElementById("changePasswordSubmitButton");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const strengthBar = document.getElementById("strengthBar");
const strengthText = document.getElementById("strengthText");

const changePasswordEndpoint =
  window.location.port === "5500"
    ? "http://127.0.0.1:8000/api/users/change-password/"
    : "/api/users/change-password/";

// Get authentication token from localStorage or sessionStorage
function getAuthToken() {
  return localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
}

// Show message
function showMessage(message, type) {
  changePasswordMessage.textContent = message;
  changePasswordMessage.className = `alert alert-${type}`;
  changePasswordMessage.style.display = 'block';
  changePasswordMessage.classList.remove('d-none');
  // Scroll to message
  changePasswordMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Hide message
function resetMessage() {
  changePasswordMessage.textContent = "";
  changePasswordMessage.className = "alert d-none";
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
  const feedbackElement = document.getElementById("confirmPasswordFeedback");
  
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

// Event listeners for password strength
newPasswordInput?.addEventListener('input', updatePasswordStrength);
confirmPasswordInput?.addEventListener('input', validatePasswordMatch);

// Handle form submission
changePasswordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  resetMessage();

  if (!changePasswordForm.checkValidity()) {
    event.stopPropagation();
    changePasswordForm.classList.add("was-validated");
    showMessage("Please correct the highlighted fields and try again.", "danger");
    return;
  }

  // Check password match
  if (!validatePasswordMatch()) {
    changePasswordForm.classList.add("was-validated");
    showMessage("Your passwords do not match.", "danger");
    return;
  }

  const token = getAuthToken();

  if (!token) {
    showMessage("Authentication token not found. Please log in again.", "danger");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);
    return;
  }

  changePasswordForm.classList.add("was-validated");
  changePasswordSubmitButton.disabled = true;
  changePasswordSubmitButton.textContent = "Changing Password...";

  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = newPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  try {
    const response = await fetch(changePasswordEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        old_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        showMessage(
          "Your session has expired. Please log in again.",
          "danger"
        );
        setTimeout(() => {
          window.location.href = "login.html";
        }, 1500);
        return;
      }

      throw new Error(data.error || "Failed to change password");
    }

    showMessage("Your password has been changed successfully!", "success");
    changePasswordForm.reset();
    changePasswordForm.classList.remove("was-validated");
    strengthBar.style.width = "0%";
    strengthText.textContent = "";
    
    // Clear requirement indicators
    document.querySelectorAll('.requirement').forEach(el => {
      el.classList.remove('met');
    });

    // Redirect after success
    setTimeout(() => {
      window.location.href = "settings.html";
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

// Redirect if not authenticated
document.addEventListener("DOMContentLoaded", () => {
  const token = getAuthToken();
  if (!token) {
    showMessage(
      "You must be logged in to change your password.",
      "danger"
    );
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);
  }
});
