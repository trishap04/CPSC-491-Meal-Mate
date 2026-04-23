const settingsForm = document.getElementById("settingsForm");
const settingsMessage = document.getElementById("settingsMessage");
const loadingSpinner = document.getElementById("loadingSpinner");
const settingsSubmitButton = document.getElementById("settingsSubmitButton");
const logoutButton = document.getElementById("logoutButton");
const deleteAccountButton = document.getElementById("deleteAccountButton");
const bioInput = document.getElementById("settingsBio");
const bioCharCount = document.getElementById("bioCharCount");

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

// Validation functions
function validatePhoneNumber(phone) {
  if (!phone) return true; // Optional field
  const cleaned = phone.replace(/[\s()-]/g, '');
  return /^\+?1?\d{9,15}$/.test(cleaned);
}

function validateZipCode(zip) {
  if (!zip) return true; // Optional field
  return /^\d{5}(?:-\d{4})?$/.test(zip);
}

function validateUrl(url) {
  if (!url) return true; // Optional field
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
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

// Bio character counter
bioInput?.addEventListener('input', (e) => {
  bioCharCount.textContent = e.target.value.length;
  e.target.classList.toggle('is-invalid', e.target.value.length > 500);
});

// Load user profile data
async function loadUserProfile() {
  try {
    const profileData = await apiFetch(profileEndpoint);

    // Populate all form fields
    document.getElementById("settingsUsername").value = profileData.username || "";
    document.getElementById("settingsEmail").value = profileData.email || "";
    document.getElementById("settingsFirstName").value = profileData.first_name || "";
    document.getElementById("settingsLastName").value = profileData.last_name || "";
    document.getElementById("settingsPhone").value = profileData.phone_number || "";
    document.getElementById("settingsCity").value = profileData.city || "";
    document.getElementById("settingsState").value = profileData.state || "";
    document.getElementById("settingsZipCode").value = profileData.zip_code || "";
    document.getElementById("settingsAddress").value = profileData.address || "";
    document.getElementById("settingsBio").value = profileData.bio || "";
    document.getElementById("settingsProfilePicture").value = profileData.profile_picture || "";
    document.getElementById("settingsMarketingEmails").checked = profileData.marketing_emails || false;
    document.getElementById("settingsRole").value = 
      (profileData.role?.charAt(0).toUpperCase() + profileData.role?.slice(1)) || "";

    // Update character counter
    if (bioCharCount && bioInput) {
      bioCharCount.textContent = bioInput.value.length;
    }

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

// Validate form inputs
function validateSettingsForm() {
  const phone = document.getElementById("settingsPhone").value;
  const zip = document.getElementById("settingsZipCode").value;
  const picture = document.getElementById("settingsProfilePicture").value;

  if (!validatePhoneNumber(phone)) {
    showSettingsMessage("Invalid phone number format. Use format like +1-234-567-8901 or 2345678901", "danger");
    return false;
  }

  if (!validateZipCode(zip)) {
    showSettingsMessage("Invalid zip code format. Use format 12345 or 12345-6789", "danger");
    return false;
  }

  if (!validateUrl(picture)) {
    showSettingsMessage("Invalid URL for profile picture. Please enter a valid URL starting with http:// or https://", "danger");
    return false;
  }

  return true;
}

// Handle form submission
settingsForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  resetSettingsMessage();

  // Validate inputs
  if (!validateSettingsForm()) {
    return;
  }

  if (!settingsForm.checkValidity()) {
    event.stopPropagation();
    settingsForm.classList.add("was-validated");
    showSettingsMessage("Please correct the highlighted fields and try again.", "danger");
    return;
  }

  settingsForm.classList.add("was-validated");
  settingsSubmitButton.disabled = true;
  settingsSubmitButton.textContent = "Saving...";

  try {
    const updateData = {
      first_name: document.getElementById("settingsFirstName").value.trim(),
      last_name: document.getElementById("settingsLastName").value.trim(),
      phone_number: document.getElementById("settingsPhone").value.trim() || null,
      city: document.getElementById("settingsCity").value.trim() || null,
      state: document.getElementById("settingsState").value.trim() || null,
      zip_code: document.getElementById("settingsZipCode").value.trim() || null,
      address: document.getElementById("settingsAddress").value.trim() || null,
      bio: document.getElementById("settingsBio").value.trim() || null,
      profile_picture: document.getElementById("settingsProfilePicture").value.trim() || null,
      marketing_emails: document.getElementById("settingsMarketingEmails").checked,
    };

    // Remove null values to avoid overwriting with empty data
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === null && updateData[key] === '') {
        delete updateData[key];
      }
    });

    const response = await apiFetch(updateProfileEndpoint, {
      method: "PATCH",
      body: JSON.stringify(updateData),
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
