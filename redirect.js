// --- SPACES TOOLBAR BUTTON ---

browser.spacesToolbar.addButton('Gmail', {
  title: browser.i18n.getMessage("toolbarButtonTitle"),
  defaultIcons: "skin/gmail_icon.svg",
  url: "https://mail.google.com/"
});

// --- USER-AGENT SPOOFING ---

browser.webRequest.onBeforeSendHeaders.addListener(
  function (details) {
    for (let header of details.requestHeaders) {
      if (header.name.toLowerCase() === "user-agent") {
        header.value = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:147.0) Gecko/20100101 Firefox/147.0";
        break;
      }
    }
    return { requestHeaders: details.requestHeaders };
  },
  { urls: ["https://mail.google.com/*", "https://*.google.com/*"] },
  ["blocking", "requestHeaders"]
);

// --- GMAIL NOTIFICATION CODE ---
//

const gmailState = new Map();          // tabId -> count
let notificationsEnabled = true;       // cached copy of the setting

// Load the setting on startup
browser.storage.local.get({ notificationsEnabled: true }).then((items) => {
  notificationsEnabled = items.notificationsEnabled;
});

// Keep the cached setting in sync if the user changes it in Options
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.notificationsEnabled) {
    notificationsEnabled = changes.notificationsEnabled.newValue;
  }
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.title && tab.url && tab.url.includes("mail.google.com")) {
    const title = changeInfo.title;

    // TEMPORARY: confirm the real title format, then remove this.
    console.log("Gmail tab title:", JSON.stringify(title));

    const previousCount = gmailState.get(tabId) || 0;

    // Look for a count anywhere in the title, e.g. "Inbox (12) - ..."
    const match = title.match(/\((\d+)\+?\)/);
    const count = match ? parseInt(match[1], 10) : 0;

    if (count > previousCount && notificationsEnabled) {
      const body = count === 1 ? "You have a new email."
                               : `You have ${count} unread emails.`;
      browser.notifications.create("gmail-unread-alert", {
        type: "basic",
        iconUrl: "skin/gmail_icon.png",
        title: "Gmail",
        message: body
      }).catch((error) => {
        console.error("Failed to create notification:", error);
      });
    }

    gmailState.set(tabId, count);
  }
});

// Clean up tracking when a tab is closed
browser.tabs.onRemoved.addListener((tabId) => {
  gmailState.delete(tabId);
});

// Focus the Gmail tab when the notification is clicked
browser.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === "gmail-unread-alert") {
    browser.tabs.query({ url: "*://mail.google.com/*" }).then((tabs) => {
      if (tabs.length > 0) {
        browser.tabs.update(tabs[0].id, { active: true });
        if (tabs[0].windowId) {
          browser.windows.update(tabs[0].windowId, { focused: true });
        }
      }
    }).catch((error) => {
      console.error("Error focusing Gmail tab via notification click: ", error);
    });
  }
});
