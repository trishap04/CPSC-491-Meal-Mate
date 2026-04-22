const settingsForm = document.getElementById("settingsForm");
const settingsMessage = document.getElementById("settingsMessage");
const loadingSpinner = document.getElementById("loadingSpinner");
const settingsSubmitButton = document.getElementById("settingsSubmitButton");
const logoutButton = document.getElementById("logoutButton");
const deleteAccountButton = document.getElementById("deleteAccountButton");

const profileEndpoint =
  window.location.port === "5500"
    ? "http://127.0.0.1:8000/api/users/profile/"
    : "/api/users/profile/";

const updateProfileEndpoint =
  window.location.port === "5500"
    ? "http://127.0.0.1:8000/api/users/profile/update/"
    : "/api/users/profile/update/";

const logoutEndpoint =
  window.location.port === "5500"
    ? "http://127.0.0.1:8000/api/users/logout/"
    : "/api/users/logout/";

const deleteAccountEndpoint =
  window.location.port === "5500"
    ? "http://127.0.0.1:8000/api/users/delete-account/"
    : "/api/users/delete-account/";

// Show message
function showSettingsMessage(message, type) {
  settingsMessage.textContent = message;
  settingsMessage.className = `alert alert-${type}`;
  settingsMessage.style.display = 'block';
  settingsMessage.classList.remove('d-none');
}

// Hide message
function resetSettingsMessage() {
  settingsMessage.textContent = "";
  settingsMessage.className = "alert d-none";
}

// Load user profile data
async function loadUserProfile() {
  try {
    const profileData = await apiFetch(profileEndpoint);

    // Populate form fields
    document.getElementById("settingsUsername").value = profileData.username || "";
    document.getElementById("settingsEmail").value = profileData.email || "";
    document.getElementById("settingsFirstName").value = profileData.first_name || "";
    document.getElementById("settingsLastName").value = profileData.last_name || "";
    document.getElementById("settingsRole").value =
      profileData.role?.charAt(0).toUpperCase() + profileData.role?.slice(1) || "";

    // Hide loading spinner and show form
    loadingSpinner.classList.add("d-none");
    settingsForm.classList.remove("d-none");
  } catch (error) {
    if (error.message.includes("Login required") || error.message.includes("401")) {
      window.location.href = "login.html";
      return;
    }
    showSettingsMessage("Unable to load your profile. Please try again.", "danger");
    loadingSpinner.classList.add("d-none");
  }
}

// Handle form submission
settingsForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  resetSettingsMessage();

  if (!settingsForm.checkValidity()) {
    event.stopPropagation();
    settingsForm.classList.add("was-validated");
    showSettingsMessage("Please correct the highlighted fields and try again.", "danger");
    return;
  }

  settingsForm.classList.add("was-validated");
  settingsSubmitButton.disabled = true;
  settingsSubmitButton.textContent = "Saving...";

  const firstName = document.getElementById("settingsFirstName").value.trim();
  const lastName = document.getElementById("settingsLastName").value.trim();

  try {
    await apiFetch(updateProfileEndpoint, {
      method: "PATCH",
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
      }),
    });

    showSettingsMessage("Your profile has been updated successfully!", "success");
    settingsForm.classList.remove("was-validated");

    // Reload profile data to confirm changes
    setTimeout(() => {
      loadUserProfile();
    }, 1000);
  } catch (error) {
    showSettingsMessage(error.message || "We could not save your changes.", "danger");
  } finally {
    settingsSubmitButton.disabled = false;
    settingsSubmitButton.textContent = "Save Changes";
  }
});

// Handle logout
async function handleLogout() {
  if (!confirm("Are you sure you want to log out?")) return;

  try {
    const refreshToken = localStorage.getItem("mealmate_refresh_token");
    await apiFetch(logoutEndpoint, {
      method: "POST",
      body: JSON.stringify({ refresh: refreshToken }),
    });
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    localStorage.removeItem("mealmate_access_token");
    localStorage.removeItem("mealmate_refresh_token");
    window.location.href = "login.html";
  }
}

// Handle account deletion
async function handleDeleteAccount() {
  if (
    !confirm(
      "Are you absolutely sure you want to delete your account? This action cannot be undone."
    )
  ) {
    return;
  }

  try {
    await apiFetch(deleteAccountEndpoint, {
      method: "DELETE",
    });

    // Cleanup and redirect
    localStorage.removeItem("mealmate_access_token");
    localStorage.removeItem("mealmate_refresh_token");
    window.location.href = "index.html";
  } catch (error) {
    console.error("Error deleting account:", error);
    alert(error.message || "Failed to delete account. Please try again.");
  }
}

// Event Listeners
logoutButton?.addEventListener("click", handleLogout);
deleteAccountButton?.addEventListener("click", handleDeleteAccount);

// Load profile on page load
document.addEventListener("DOMContentLoaded", loadUserProfile);
