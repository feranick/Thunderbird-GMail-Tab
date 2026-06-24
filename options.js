const checkbox = document.getElementById("notificationsEnabled");
const status = document.getElementById("status");

// Load the saved setting (default: enabled)
function restoreOptions() {
  browser.storage.local.get({ notificationsEnabled: true }).then((items) => {
    checkbox.checked = items.notificationsEnabled;
  });
}

// Save on change
checkbox.addEventListener("change", () => {
  browser.storage.local.set({ notificationsEnabled: checkbox.checked }).then(() => {
    status.textContent = "Saved.";
    setTimeout(() => { status.textContent = ""; }, 1500);
  });
});

document.addEventListener("DOMContentLoaded", restoreOptions);
