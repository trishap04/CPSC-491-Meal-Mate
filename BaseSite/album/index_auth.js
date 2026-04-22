
/**
 * index_auth.js
 * Handles dynamic Login/Logout buttons on the homepage.
 */

document.addEventListener("DOMContentLoaded", () => {
    const authButtons = document.getElementById("authButtons");
    const token = localStorage.getItem("mealmate_access_token");

    if (token && authButtons) {
        // User is logged in, show Settings and Logout
        authButtons.innerHTML = `
            <a href="settings.html" class="btn btn-outline-light btn-sm">Settings</a>
            <button id="navLogoutButton" class="btn btn-warning btn-sm">Logout</button>
        `;

        // Add Logout Logic
        const logoutBtn = document.getElementById("navLogoutButton");
        logoutBtn.addEventListener("click", async () => {
            const refreshToken = localStorage.getItem("mealmate_refresh_token");
            
            // Clear locally first for speed
            localStorage.removeItem("mealmate_access_token");
            localStorage.removeItem("mealmate_refresh_token");
            
            try {
                // Try to blacklist on backend
                const logoutEndpoint = window.location.port === "5500" || window.location.port === "8000" 
                    ? "http://127.0.0.1:8000/api/users/logout/" 
                    : "/api/users/logout/";
                
                // We use standard fetch here to avoid api.js redirection loops during logout
                await fetch(logoutEndpoint, {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ refresh: refreshToken })
                });
            } catch (e) {
                console.log("Nav Logout error (likely already blacklisted):", e);
            }

            // Reload to show Login/Register again
            window.location.reload();
        });
    }
});
