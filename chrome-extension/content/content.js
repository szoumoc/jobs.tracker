// Runs on every page. Extracts job data and shows a preview panel when found.
// Also answers popup requests with the latest extracted data.

let lastJobData = null;
let lastUrl = location.href;
let extractionRun = 0; // used to ignore stale results from overlapping runs

const PANEL_ID = "jobs-tracker-panel";

// Extract job data and update the in-page preview.
async function runExtraction() {
  const runId = ++extractionRun;
  const data = await JobExtractors.extractAsync();

  // URL changed while we were extracting — discard this result.
  if (runId !== extractionRun) return;

  lastJobData = data;

  if (lastJobData) {
    showPanel(lastJobData);
  } else {
    hidePanel();
  }
}

// Re-run extraction when the URL changes.
function onUrlChange() {
  if (location.href === lastUrl) return;

  lastUrl = location.href;
  lastJobData = null;
  extractionRun++; // cancel any in-flight extraction
  hidePanel();
  runExtraction();
}

// Content scripts run in an isolated JS world, so patching history.pushState
// does NOT see SPA navigations from the page. Polling location.href does work.
function watchUrlChanges() {
  window.addEventListener("popstate", onUrlChange);
  window.addEventListener("hashchange", onUrlChange);

  setInterval(() => {
    if (location.href !== lastUrl) onUrlChange();
  }, 500);
}

// --- in-page preview panel ---

function showPanel(data) {
  let panel = document.getElementById(PANEL_ID);

  // Create the panel once, then just update its contents.
  if (!panel) {
    panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <style>
        #${PANEL_ID} {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 2147483647;
          width: 340px;
          max-height: 420px;
          overflow: auto;
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.18);
          font: 14px system-ui, sans-serif;
          color: #1a1a1a;
        }
        #${PANEL_ID} header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          border-bottom: 1px solid #eee;
        }
        #${PANEL_ID} header h2 { font-size: 14px; margin: 0; }
        #${PANEL_ID} .jt-close {
          border: none; background: #f3f4f6; border-radius: 6px;
          width: 26px; height: 26px; cursor: pointer; font-size: 16px;
        }
        #${PANEL_ID} .field { margin-bottom: 10px; }
        #${PANEL_ID} .field label {
          display: block; font-size: 10px; font-weight: 600;
          text-transform: uppercase; color: #888; margin-bottom: 2px;
        }
        #${PANEL_ID} .field p { margin: 0; line-height: 1.4; word-break: break-word; }
        #${PANEL_ID} .field p.empty { color: #aaa; font-style: italic; }
      </style>
      <header>
        <h2>Jobs Tracker</h2>
        <button class="jt-close" type="button" aria-label="Close">&times;</button>
      </header>
      <div class="jt-fields" style="padding:14px"></div>
    `;
    panel.querySelector(".jt-close").addEventListener("click", hidePanel);
    document.body.appendChild(panel);
  }

  panel.querySelector(".jt-fields").innerHTML = renderJobFields(data);
  panel.style.display = "block";
}

function hidePanel() {
  const panel = document.getElementById(PANEL_ID);
  if (panel) panel.style.display = "none";
}

// --- popup support ---

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_JOB") {
    sendResponse({ data: lastJobData });
  }
  return true;
});

// --- run on page load and re-run on URL changes ---

watchUrlChanges();
runExtraction();
