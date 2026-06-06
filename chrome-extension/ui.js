// Shared UI helpers used by the popup and the in-page preview panel.

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Build HTML for one job field row.
function renderField(label, value) {
  const text = value?.trim() || "Not available";
  const emptyClass = value?.trim() ? "" : " empty";
  return `
    <div class="field">
      <label>${label}</label>
      <p class="${emptyClass.trim()}">${escapeHtml(text)}</p>
    </div>
  `;
}

// Build HTML for all job fields.
function renderJobFields(data) {
  return [
    renderField("Company", data.companyName),
    renderField("Job title", data.jobTitle),
    renderField("Location", data.location),
    renderField("Salary", data.salary),
    renderField("Employment type", data.employmentType),
    renderField("Application URL", data.applicationUrl),
    renderField("Source platform", data.sourcePlatform),
  ].join("");
}

function renderJobData(containerId, data) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = renderJobFields(data);
}

function renderStatus(containerId, message) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<p class="status">${message}</p>`;
}
