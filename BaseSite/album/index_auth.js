/**
 * index_auth.js
 * Handles dynamic Login/Logout buttons on the homepage.
 * Depends on api.js (loaded before this script on index.html).
 */

document.addEventListener("DOMContentLoaded", () => {
    const authButtons = document.getElementById("authButtons");

    if (!authButtons) return;

    const token = getAccessToken();

    if (token) {
        // User is logged in — show Settings and Logout
        authButtons.innerHTML = `
            <a href="/settings/" class="btn btn-outline-light btn-sm">Settings</a>
            <button id="navLogoutButton" class="btn btn-warning btn-sm">Logout</button>
        `;

        document.getElementById("navLogoutButton").addEventListener("click", () => {
            // Redirect back to homepage (unauthenticated) after logout
            performLogout("/");
        });
    } else {
        // User is not logged in — show Login and Register
        authButtons.innerHTML = `
            <a href="/login/" class="btn btn-outline-light btn-sm">Login</a>
            <a href="/register/" class="btn btn-warning btn-sm">Register</a>
        `;
    }
});
