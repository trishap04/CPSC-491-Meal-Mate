const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const forgotPasswordMessage = document.getElementById("forgotPasswordMessage");
const forgotPasswordSubmitButton = document.getElementById("forgotPasswordSubmitButton");
const resetLinkContainer = document.getElementById("resetLinkContainer");
const resetLink = document.getElementById("resetLink");
const forgotPasswordEndpoint =
  window.location.port === "5500"
    ? "http://127.0.0.1:8000/api/users/password-reset/request/"
    : "/api/users/password-reset/request/";

function setForgotPasswordMessage(message, type) {
  forgotPasswordMessage.textContent = message;
  forgotPasswordMessage.className = `alert alert-${type}`;
  forgotPasswordMessage.classList.remove('d-none');
  forgotPasswordMessage.style.display = 'block';
  // Scroll to message
  forgotPasswordMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function resetMessage() {
  forgotPasswordMessage.textContent = "";
  forgotPasswordMessage.className = "alert d-none";
}

forgotPasswordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  resetMessage();
  resetLinkContainer.classList.add("d-none");

  if (!forgotPasswordForm.checkValidity()) {
    forgotPasswordForm.classList.add("was-validated");
    setForgotPasswordMessage("Please enter a valid email address.", "danger");
    return;
  }

  forgotPasswordForm.classList.add("was-validated");
  forgotPasswordSubmitButton.disabled = true;
  forgotPasswordSubmitButton.textContent = "Generating link...";

  const email = document.getElementById("resetEmail").value.trim();

  try {
    const data = await apiFetch(forgotPasswordEndpoint, {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    setForgotPasswordMessage(
      "Reset link generated! Check the instructions below.",
      "success"
    );

    if (data.reset_url) {
      const destination = window.location.port === "5500"
        ? `http://127.0.0.1:8000${data.reset_url}`
        : data.reset_url;
      resetLink.href = destination;
      resetLink.textContent = "Open Password Reset Page";
      resetLinkContainer.classList.remove("d-none");
      
      // For development - show full URL as alternative
      if (window.location.port === "5500") {
        resetLink.textContent = destination;
      }
    }

    // Clear form
    forgotPasswordForm.reset();
    forgotPasswordForm.classList.remove("was-validated");
  } catch (error) {
    setForgotPasswordMessage(
      "We could not reach the server. Please try again in a moment.",
      "danger"
    );
  } finally {
    forgotPasswordSubmitButton.disabled = false;
    forgotPasswordSubmitButton.textContent = "Generate Reset Link";
  }
});
