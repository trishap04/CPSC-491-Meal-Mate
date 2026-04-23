const settingsForm = document.getElementById("settingsForm");
const settingsMessage = document.getElementById("settingsMessage");
const loadingSpinner = document.getElementById("loadingSpinner");
const settingsSubmitButton = document.getElementById("settingsSubmitButton");
const logoutButton = document.getElementById("logoutButton");
const deleteAccountButton = document.getElementById("deleteAccountButton");
const bioInput = document.getElementById("settingsBio");
const bioCharCount = document.getElementById("bioCharCount");

const profileEndpoint = "/api/users/profile/";
const updateProfileEndpoint = "/api/users/profile/update/";
const deleteAccountEndpoint = "/api/users/delete-account/";

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
      window.location.href = "/login/";
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

    // Remove null values to avoid overwriting optional fields with empty data
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === null || updateData[key] === '') {
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
  await performLogout("/login/");
}

// Delete account — driven by the Bootstrap confirmation modal in settings.html
const deleteAccountModal = document.getElementById("deleteAccountModal");
const deleteAccountConfirmButton = document.getElementById("deleteAccountConfirmButton");
const deleteAccountPasswordInput = document.getElementById("deleteAccountPassword");
const deleteAccountError = document.getElementById("deleteAccountError");

function showDeleteError(message) {
  deleteAccountError.textContent = message;
  deleteAccountError.classList.remove("d-none");
}

function resetDeleteModal() {
  if (deleteAccountPasswordInput) deleteAccountPasswordInput.value = "";
  if (deleteAccountError) deleteAccountError.classList.add("d-none");
  if (deleteAccountConfirmButton) {
    deleteAccountConfirmButton.disabled = false;
    deleteAccountConfirmButton.textContent = "Delete My Account";
  }
}

// Reset the modal state every time it opens so stale errors don't persist
deleteAccountModal?.addEventListener("show.bs.modal", resetDeleteModal);

deleteAccountConfirmButton?.addEventListener("click", async () => {
  const password = deleteAccountPasswordInput?.value ?? "";

  if (!password) {
    showDeleteError("Please enter your password to confirm deletion.");
    deleteAccountPasswordInput?.classList.add("is-invalid");
    return;
  }

  deleteAccountPasswordInput?.classList.remove("is-invalid");
  deleteAccountConfirmButton.disabled = true;
  deleteAccountConfirmButton.textContent = "Deleting...";

  try {
    await apiFetch(deleteAccountEndpoint, {
      method: "DELETE",
      body: JSON.stringify({
        password,
        refresh_token: getRefreshToken(),
      }),
    });

    // Session is gone — clear tokens and land on login with a confirmation message
    clearTokens();
    window.location.href = "/login/?deleted=1";
  } catch (error) {
    showDeleteError(error.message || "Failed to delete account. Please try again.");
    deleteAccountConfirmButton.disabled = false;
    deleteAccountConfirmButton.textContent = "Delete My Account";
  }
});

// Event Listeners
logoutButton?.addEventListener("click", handleLogout);

// Load profile on page load
document.addEventListener("DOMContentLoaded", loadUserProfile);
