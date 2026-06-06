// Popup entry point — asks the content script for the latest job data.

async function loadJobData() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    renderStatus("content", "No active tab found.");
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_JOB" });

    if (response?.data) {
      renderJobData("content", response.data);
      return;
    }

    renderStatus("content", "No job found on this page.");
  } catch {
    // Content script not ready — extract directly as a fallback.
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content/extractors.js"] });
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => JobExtractors.extractAsync(),
      });

      if (result?.result) {
        renderJobData("content", result.result);
        return;
      }
    } catch {
      // ignore
    }

    renderStatus("content", "No job found on this page.");
  }
}

loadJobData();
