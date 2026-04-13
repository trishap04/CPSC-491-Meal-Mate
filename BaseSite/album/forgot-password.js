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
}

forgotPasswordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  resetLinkContainer.classList.add("d-none");
  forgotPasswordMessage.className = "alert d-none";

  if (!forgotPasswordForm.checkValidity()) {
    forgotPasswordForm.classList.add("was-validated");
    setForgotPasswordMessage("Please enter a valid email address.", "danger");
    return;
  }

  forgotPasswordForm.classList.add("was-validated");
  forgotPasswordSubmitButton.disabled = true;
  forgotPasswordSubmitButton.textContent = "Generating...";

  try {
    const response = await fetch(forgotPasswordEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: document.getElementById("resetEmail").value.trim(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errors = Object.values(data).flat().join(" ");
      setForgotPasswordMessage(errors || "Unable to create reset link.", "danger");
      return;
    }

    setForgotPasswordMessage(data.message || "Reset link created.", "success");

    if (data.reset_url) {
      const destination = window.location.port === "5500"
        ? `http://127.0.0.1:8000${data.reset_url}`
        : data.reset_url;
      resetLink.href = destination;
      resetLink.textContent = destination;
      resetLinkContainer.classList.remove("d-none");
    }
  } catch (error) {
    setForgotPasswordMessage("We could not reach the server. Please try again.", "danger");
  } finally {
    forgotPasswordSubmitButton.disabled = false;
    forgotPasswordSubmitButton.textContent = "Generate Reset Link";
  }
});
