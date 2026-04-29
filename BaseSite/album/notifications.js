const MEALMATE_NOTIFICATIONS_KEY = "mealmate_notifications";

function getNotifications() {
  try {
    return JSON.parse(localStorage.getItem(MEALMATE_NOTIFICATIONS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveNotifications(notifications) {
  localStorage.setItem(MEALMATE_NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

function addNotification(title, message, type = "info") {
  const notifications = getNotifications();

  notifications.unshift({
    id: Date.now(),
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toLocaleString()
  });

  saveNotifications(notifications);
  renderNotificationBell();
  showToastNotification(title, message, type);
  sendBrowserNotification(title, message);
}

function markAllNotificationsRead() {
  const notifications = getNotifications().map(n => ({ ...n, read: true }));
  saveNotifications(notifications);
  renderNotificationBell();
}

function clearNotifications() {
  saveNotifications([]);
  renderNotificationBell();
}

function renderNotificationBell() {
  const badge = document.getElementById("notificationCount");
  const list = document.getElementById("notificationList");

  if (!badge || !list) return;

  const notifications = getNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  badge.textContent = unreadCount;
  badge.style.display = unreadCount > 0 ? "inline-block" : "none";

  if (notifications.length === 0) {
    list.innerHTML = `<li class="dropdown-item text-muted">No notifications yet</li>`;
    return;
  }

  list.innerHTML = notifications
    .slice(0, 8)
    .map(n => `
      <li class="dropdown-item notification-item ${n.read ? "" : "fw-bold"}">
        <div>${escapeHTML(n.title)}</div>
        <small class="text-muted d-block">${escapeHTML(n.message)}</small>
        <small class="text-secondary">${escapeHTML(n.createdAt)}</small>
      </li>
    `)
    .join("");
}

function showToastNotification(title, message, type = "info") {
  if (typeof bootstrap === "undefined") {
    console.warn("Bootstrap is not loaded. Toast notification skipped.");
    return;
  }

  const bgClass =
    type === "success"
      ? "text-bg-success"
      : type === "danger"
      ? "text-bg-danger"
      : type === "warning"
      ? "text-bg-warning"
      : "text-bg-info";

  const toastHtml = `
    <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 2000;">
      <div class="toast align-items-center ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">
            <strong>${escapeHTML(title)}</strong><br>
            ${escapeHTML(message)}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", toastHtml);

  const toastContainer = document.querySelector(".toast-container:last-of-type");
  const toastElement = toastContainer.querySelector(".toast");

  const toast = new bootstrap.Toast(toastElement, { delay: 3500 });

  toastElement.addEventListener("hidden.bs.toast", () => {
    toastContainer.remove();
  });

  toast.show();
}

function sendBrowserNotification(title, message) {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification(title, { body: message });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification(title, { body: message });
      }
    });
  }
}

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", () => {
  renderNotificationBell();

  const notificationDropdown = document.getElementById("notificationDropdown");

  if (notificationDropdown) {
    notificationDropdown.addEventListener("click", () => {
      markAllNotificationsRead();
    });
  }
});

function toggleNotificationMenu(event) {
  event.preventDefault();
  event.stopPropagation();

  const menu = document.getElementById("notificationMenu");
  if (!menu) return;

  menu.classList.toggle("show");

  markAllNotificationsRead();
}

document.addEventListener("click", function(event) {
  const wrapper = document.querySelector(".notification-wrapper");

  if (wrapper && !wrapper.contains(event.target)) {
    const menu = document.getElementById("notificationMenu");
    if (menu) menu.classList.remove("show");
  }
});