/**
 * api.js
 * Centralized API utility for Meal Mate.
 * Handles JWT authentication, token refreshing, and CSRF protection.
 */

const API_BASE_URL = window.location.port === "5500" || window.location.port === "3000" 
    ? "http://127.0.0.1:8000" 
    : "";

const TOKEN_KEY = "mealmate_access_token";
const REFRESH_KEY = "mealmate_refresh_token";

/**
 * Get the stored access token
 */
function getAccessToken() {
    return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get the stored refresh token
 */
function getRefreshToken() {
    return localStorage.getItem(REFRESH_KEY);
}

/**
 * Save tokens to local storage
 */
function setTokens(access, refresh) {
    if (access) localStorage.setItem(TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

/**
 * Clear tokens from local storage (Logout)
 */
function clearTokens() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
}

/**
 * Helper to get CSRF token from cookies
 */
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

/**
 * Enhanced fetch wrapper that handles Auth headers and Token Refreshing
 */
async function apiFetch(endpoint, options = {}) {
    let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    
    // Ensure headers object exists
    options.headers = options.headers || {};
    
    // Set default Content-Type to JSON if not specified
    if (!options.headers['Content-Type'] && !(options.body instanceof FormData)) {
        options.headers['Content-Type'] = 'application/json';
    }

    // Attach JWT Access Token if available
    const token = getAccessToken();
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    // Attach CSRF Token for state-changing requests
    const csrfToken = getCookie('csrftoken');
    if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase())) {
        options.headers['X-CSRFToken'] = csrfToken;
    }

    try {
        let response = await fetch(url, options);

        // Handle 401 Unauthorized (Token possibly expired)
        if (response.status === 401) {
            const refreshToken = getRefreshToken();
            
            if (refreshToken) {
                const refreshResponse = await fetch(`${API_BASE_URL}/api/users/token/refresh/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh: refreshToken })
                });

                if (refreshResponse.ok) {
                    const data = await refreshResponse.json();
                    setTokens(data.access, data.refresh);
                    
                    options.headers['Authorization'] = `Bearer ${data.access}`;
                    response = await fetch(url, options);
                } else {
                    clearTokens();
                    window.location.href = '/login/';
                    throw new Error("Login required");
                }
            }
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const err = new Error(errorData.error || errorData.detail || `Error: ${response.status}`);
            // Attach extra fields so callers can inspect them (e.g. locked_until for account lockouts)
            Object.assign(err, errorData);
            throw err;
        }

        // Handle 204 No Content
        if (response.status === 204) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error("API Fetch Error:", error);
        throw error;
    }
}
