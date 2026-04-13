const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");
const registerSubmitButton = document.getElementById("registerSubmitButton");
const registerEndpoint =
  window.location.port === "5500"
    ? "http://127.0.0.1:8000/api/users/register/"
    : "/api/users/register/";

function setRegisterMessage(message, type) {
  registerMessage.textContent = message;
  registerMessage.className = `alert alert-${type}`;
}

registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  registerMessage.className = "alert d-none";

  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("registerPasswordConfirm").value;

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
        username: document.getElementById("registerUsername").value.trim(),
        email: document.getElementById("registerEmail").value.trim(),
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errors = Object.values(data).flat().join(" ");
      setRegisterMessage(errors || "Unable to create your account.", "danger");
      return;
    }

    setRegisterMessage(data.message || "Account created successfully.", "success");
    registerForm.reset();
    registerForm.classList.remove("was-validated");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1200);
  } catch (error) {
    setRegisterMessage("We could not reach the server. Please try again.", "danger");
  } finally {
    registerSubmitButton.disabled = false;
    registerSubmitButton.textContent = "Create Account";
  }
});
