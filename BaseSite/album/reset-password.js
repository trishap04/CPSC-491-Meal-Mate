const resetPasswordForm = document.getElementById("resetPasswordForm");
const resetPasswordMessage = document.getElementById("resetPasswordMessage");
const resetPasswordSubmitButton = document.getElementById("resetPasswordSubmitButton");
const resetPasswordEndpoint =
  window.location.port === "5500"
    ? "http://127.0.0.1:8000/api/users/password-reset/confirm/"
    : "/api/users/password-reset/confirm/";

function setResetPasswordMessage(message, type) {
  resetPasswordMessage.textContent = message;
  resetPasswordMessage.className = `alert alert-${type}`;
}

resetPasswordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  resetPasswordMessage.className = "alert d-none";

  const params = new URLSearchParams(window.location.search);
  const uid = params.get("uid");
  const token = params.get("token");
  const newPassword = document.getElementById("newPassword").value;
  const confirmNewPassword = document.getElementById("confirmNewPassword").value;

  if (!uid || !token) {
    setResetPasswordMessage("This reset link is missing required information.", "danger");
    return;
  }

  if (!resetPasswordForm.checkValidity()) {
    resetPasswordForm.classList.add("was-validated");
    setResetPasswordMessage("Please complete the highlighted fields.", "danger");
    return;
  }

  if (newPassword !== confirmNewPassword) {
    resetPasswordForm.classList.add("was-validated");
    setResetPasswordMessage("Passwords do not match.", "danger");
    return;
  }

  resetPasswordForm.classList.add("was-validated");
  resetPasswordSubmitButton.disabled = true;
  resetPasswordSubmitButton.textContent = "Updating...";

  try {
    const response = await fetch(resetPasswordEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uid,
        token,
        new_password: newPassword,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errors = Object.values(data).flat().join(" ");
      setResetPasswordMessage(errors || "Unable to reset your password.", "danger");
      return;
    }

    setResetPasswordMessage(data.message || "Password updated successfully.", "success");
    resetPasswordForm.reset();
    resetPasswordForm.classList.remove("was-validated");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1200);
  } catch (error) {
    setResetPasswordMessage("We could not reach the server. Please try again.", "danger");
  } finally {
    resetPasswordSubmitButton.disabled = false;
    resetPasswordSubmitButton.textContent = "Update Password";
  }
});
