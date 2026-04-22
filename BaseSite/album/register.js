const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");
const registerSubmitButton = document.getElementById("registerSubmitButton");
const registerUsername = document.getElementById("registerUsername");
const registerPassword = document.getElementById("registerPassword");
const usernameAvailability = document.getElementById("usernameAvailability");
const usernameMessage = document.getElementById("usernameMessage");
const strengthMeter = document.getElementById("strengthMeter");
const strengthText = document.getElementById("strengthText");
const termsCheckbox = document.getElementById("termsCheckbox");

const registerEndpoint =
  window.location.port === "5500"
    ? "http://127.0.0.1:8000/api/users/register/"
    : "/api/users/register/";

const usernameCheckEndpoint =
  window.location.port === "5500"
    ? "http://127.0.0.1:8000/api/users/check-username/"
    : "/api/users/check-username/";

let usernameCheckTimeout;

// Password Strength Indicator
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

function updatePasswordStrength() {
  const password = registerPassword.value;
  const strength = calculatePasswordStrength(password);
  
  const strengthPercentage = (strength / 5) * 100;
  strengthMeter.style.width = strengthPercentage + '%';
  
  // Set color and text based on strength
  if (strength === 0) {
    strengthMeter.style.backgroundColor = '#ccc';
    strengthText.textContent = 'No password';
  } else if (strength === 1) {
    strengthMeter.style.backgroundColor = '#d32f2f';
    strengthText.textContent = 'Very Weak';
  } else if (strength === 2) {
    strengthMeter.style.backgroundColor = '#f57c00';
    strengthText.textContent = 'Weak';
  } else if (strength === 3) {
    strengthMeter.style.backgroundColor = '#fbc02d';
    strengthText.textContent = 'Fair';
  } else if (strength === 4) {
    strengthMeter.style.backgroundColor = '#7cb342';
    strengthText.textContent = 'Good';
  } else {
    strengthMeter.style.backgroundColor = '#388e3c';
    strengthText.textContent = 'Strong';
  }
}

// Real-time Username Availability Check
registerUsername?.addEventListener('input', async (event) => {
  const username = event.target.value.trim().toLowerCase();
  
  // Clear previous timeout
  clearTimeout(usernameCheckTimeout);
  
  // Validation: Check minimum length
  if (!username) {
    usernameAvailability.textContent = '';
    usernameMessage.textContent = '';
    registerUsername.classList.remove('is-invalid', 'is-valid');
    return;
  }

  if (username.length < 3) {
    usernameAvailability.innerHTML = '⚠️';
    usernameAvailability.style.color = '#ff9800';
    usernameMessage.textContent = 'Username must be at least 3 characters';
    usernameMessage.style.color = '#ff9800';
    registerUsername.classList.add('is-invalid');
    registerUsername.classList.remove('is-valid');
    return;
  }

  // Validation: Check for valid characters
  if (!/^[a-z0-9_-]+$/.test(username)) {
    usernameAvailability.innerHTML = '❌';
    usernameAvailability.style.color = '#d32f2f';
    usernameMessage.textContent = 'Username can only contain letters, numbers, underscores, and hyphens';
    usernameMessage.style.color = '#d32f2f';
    registerUsername.classList.add('is-invalid');
    registerUsername.classList.remove('is-valid');
    return;
  }

  // Set timeout to check after user stops typing (debounce)
  usernameCheckTimeout = setTimeout(async () => {
    try {
      usernameMessage.textContent = 'Checking...';
      usernameAvailability.innerHTML = '⏳';
      usernameAvailability.style.color = '#666';
      
      const response = await fetch(usernameCheckEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username }),
      });
      
      const data = await response.json();
      
      if (data.available) {
        // Username is available
        usernameAvailability.innerHTML = '✅';
        usernameAvailability.style.color = '#388e3c';
        usernameMessage.textContent = '✓ Username is available';
        usernameMessage.style.color = '#388e3c';
        registerUsername.classList.add('is-valid');
        registerUsername.classList.remove('is-invalid');
      } else {
        // Username is not available
        usernameAvailability.innerHTML = '❌';
        usernameAvailability.style.color = '#d32f2f';
        usernameMessage.textContent = '✗ ' + (data.message || 'Username is already taken');
        usernameMessage.style.color = '#d32f2f';
        registerUsername.classList.add('is-invalid');
        registerUsername.classList.remove('is-valid');
      }
    } catch (error) {
      console.error('Username check error:', error);
      usernameAvailability.innerHTML = '';
      usernameMessage.textContent = 'Could not check availability';
      usernameMessage.style.color = '#ff9800';
    }
  }, 500); // Debounce: wait 500ms after user stops typing
});

// Password strength indicator
registerPassword?.addEventListener('input', updatePasswordStrength);

// Form submission
registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  registerMessage.className = "alert d-none";

  const username = document.getElementById("registerUsername").value.trim().toLowerCase();
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("registerPasswordConfirm").value;
  const terms = document.getElementById("termsCheckbox").checked;

  if (!registerForm.checkValidity()) {
    registerForm.classList.add("was-validated");
    setRegisterMessage("Please complete the highlighted fields.", "danger");
    return;
  }

  if (password !== confirmPassword) {
    registerForm.classList.add("was-validated");
    setRegisterMessage("Passwords do not match.", "danger");
    return;
  }

  if (!terms) {
    registerForm.classList.add("was-validated");
    setRegisterMessage("You must accept the terms and conditions.", "danger");
    return;
  }

  // Validate username one more time before submission (prevent race conditions)
  try {
    const usernameCheckResponse = await fetch(usernameCheckEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username }),
    });

    const usernameCheckData = await usernameCheckResponse.json();

    if (!usernameCheckData.available) {
      setRegisterMessage(usernameCheckData.message || "This username is no longer available.", "danger");
      return;
    }
  } catch (error) {
    console.error('Username validation error:', error);
    setRegisterMessage("We could not verify your username availability. Please try again.", "danger");
    return;
  }

  registerForm.classList.add("was-validated");
  registerSubmitButton.disabled = true;
  registerSubmitButton.textContent = "Creating Account...";

  try {
    const response = await fetch(registerEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username,
        email: document.getElementById("registerEmail").value.trim(),
        password,
        first_name: document.getElementById("registerFirstName").value.trim(),
        last_name: document.getElementById("registerLastName").value.trim(),
        phone_number: document.getElementById("registerPhone").value.trim(),
        role: document.getElementById("registerRole").value,
        terms_accepted: terms,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errors = Object.values(data).flat().join(" ");
      setRegisterMessage(errors || "Unable to create your account.", "danger");
      return;
    }

    setRegisterMessage(data.message || "Account created successfully. Logging you in...", "success");
    
    // Save JWT tokens for automatic login
    if (data.access && data.refresh) {
      setTokens(data.access, data.refresh);
    }

    registerForm.reset();
    registerForm.classList.remove("was-validated");
    strengthMeter.style.width = '0%';
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);
  } catch (error) {
    setRegisterMessage("We could not reach the server. Please try again.", "danger");
  } finally {
    registerSubmitButton.disabled = false;
    registerSubmitButton.textContent = "Create Account";
  }
});

function setRegisterMessage(message, type) {
  registerMessage.textContent = message;
  registerMessage.className = `alert alert-${type}`;
}
