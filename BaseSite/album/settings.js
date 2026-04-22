const settingsForm = document.getElementById("settingsForm");
const settingsMessage = document.getElementById("settingsMessage");
const loadingSpinner = document.getElementById("loadingSpinner");
const settingsSubmitButton = document.getElementById("settingsSubmitButton");

const profileEndpoint =
  window.location.port === "5500"
    ? "http://127.0.0.1:8000/api/users/profile/"
    : "/api/users/profile/";

const updateProfileEndpoint =
  window.location.port === "5500"
    ? "http://127.0.0.1:8000/api/users/profile/update/"
    : "/api/users/profile/update/";

const deleteAccountEndpoint =
  window.location.port === "5500"
    ? "http://127.0.0.1:8000/api/users/delete-account/"
    : "/api/users/delete-account/";

// Get authentication token from localStorage or sessionStorage
function getAuthToken() {
  return localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
}

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

// Get cookie helper for CSRF
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Load user profile data
async function loadUserProfile() {
  const token = getAuthToken();

  if (!token) {
    showSettingsMessage(
      "You must be logged in to access account settings.",
      "danger"
    );
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);
    return;
  }

  try {
    const response = await fetch(profileEndpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load profile");
    }

    const profileData = await response.json();

    // Populate form fields
    document.getElementById("settingsUsername").value =
      profileData.username || "";
    document.getElementById("settingsEmail").value = profileData.email || "";
    document.getElementById("settingsFirstName").value =
      profileData.first_name || "";
    document.getElementById("settingsLastName").value =
      profileData.last_name || "";
    document.getElementById("settingsRole").value =
      profileData.role?.charAt(0).toUpperCase() +
        profileData.role?.slice(1) || "";

    // Hide loading spinner and show form
    loadingSpinner.classList.add("d-none");
    settingsForm.classList.remove("d-none");
  } catch (error) {
    showSettingsMessage(
      "Unable to load your profile. Please try again.",
      "danger"
    );
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
    showSettingsMessage(
      "Please correct the highlighted fields and try again.",
      "danger"
    );
    return;
  }

  const token = getAuthToken();

  if (!token) {
    showSettingsMessage("Authentication token not found. Please log in again.", "danger");
    return;
  }

  settingsForm.classList.add("was-validated");
  settingsSubmitButton.disabled = true;
  settingsSubmitButton.textContent = "Saving...";

  const firstName = document.getElementById("settingsFirstName").value.trim();
  const lastName = document.getElementById("settingsLastName").value.trim();

  try {
    const response = await fetch(updateProfileEndpoint, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        showSettingsMessage(
          "Your session has expired. Please log in again.",
          "danger"
        );
        setTimeout(() => {
          window.location.href = "login.html";
        }, 1500);
        return;
      }

      throw new Error(
        data.error || "Failed to update profile"
      );
    }

    showSettingsMessage("Your profile has been updated successfully!", "success");
    settingsForm.classList.remove("was-validated");

    // Reload profile data to confirm changes
    setTimeout(() => {
      loadUserProfile();
    }, 1000);
  } catch (error) {
    showSettingsMessage(
      error.message || "We could not save your changes. Please try again.",
      "danger"
    );
  } finally {
    settingsSubmitButton.disabled = false;
    settingsSubmitButton.textContent = "Save Changes";
  }
});

// Handle account deletion
async function handleDeleteAccount() {
  if (
    !confirm(
      "Are you absolutely sure you want to delete your account? This action cannot be undone."
    )
  ) {
    return;
  }

  const token = getAuthToken();
  const csrfToken = getCookie("csrftoken");

  try {
    const headers = {
      Authorization: `Bearer ${token}`,
    };
    if (csrfToken) {
      headers["X-CSRFToken"] = csrfToken;
    }

    const response = await fetch(deleteAccountEndpoint, {
      method: "DELETE",
      headers: headers,
    });

    if (response.status === 204) {
      localStorage.removeItem("authToken");
      sessionStorage.removeItem("authToken");
      window.location.href = "index.html";
    } else {
      const data = await response.json().catch(() => ({}));
      alert(data.error || "Failed to delete account. Please try again.");
    }
  } catch (error) {
    console.error("Error deleting account:", error);
    alert("An error occurred. Please try again.");
  }
}

// Attach delete button listener
document
  .getElementById("deleteAccountButton")
  ?.addEventListener("click", handleDeleteAccount);

// Load profile on page load
document.addEventListener("DOMContentLoaded", loadUserProfile);
