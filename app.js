const publicStatus = document.getElementById("public-status");
const adminAuthForm = document.getElementById("admin-auth-form");
const adminPanel = document.getElementById("admin-panel");
const adminStatus = document.getElementById("admin-status");
const adminConfigForm = document.getElementById("admin-config-form");

const maintenanceModeInput = document.getElementById("maintenance-mode");
const serviceMessageInput = document.getElementById("service-message");
const allowedOriginsInput = document.getElementById("allowed-origins");

let adminToken = "";

function renderPublicStatus(data) {
  publicStatus.innerHTML = `
    <div class="summary-line"><span>Maintenance mode</span><strong>${data.maintenanceMode ? "ON" : "OFF"}</strong></div>
    <div class="summary-line"><span>Message</span><strong>${data.serviceMessage}</strong></div>
  `;
}

async function fetchPublicStatus() {
  const response = await fetch("/api/public/status");
  if (!response.ok) {
    throw new Error("Unable to load public status.");
  }
  return response.json();
}

async function adminRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": adminToken,
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Admin request failed (${response.status}).`);
  }

  return response.json();
}

function setAdminFormValues(config) {
  maintenanceModeInput.checked = Boolean(config.maintenanceMode);
  serviceMessageInput.value = String(config.serviceMessage || "");
  allowedOriginsInput.value = Array.isArray(config.allowedOrigins) ? config.allowedOrigins.join(", ") : "";
}

adminAuthForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(adminAuthForm);
  adminToken = String(formData.get("adminToken") || "").trim();

  if (!adminToken) {
    adminStatus.textContent = "Enter a valid admin token.";
    return;
  }

  try {
    const [status, config] = await Promise.all([
      adminRequest("/api/admin/status", { method: "GET" }),
      adminRequest("/api/admin/config", { method: "GET" }),
    ]);

    setAdminFormValues(config);
    adminPanel.classList.remove("hidden");
    adminStatus.textContent = `${status.service} connected. Uptime: ${status.uptimeSeconds}s.`;
  } catch {
    adminPanel.classList.add("hidden");
    adminStatus.textContent = "Admin authentication failed. Verify your token.";
  }
});

adminConfigForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!adminToken) {
    adminStatus.textContent = "Authenticate first before changing configuration.";
    return;
  }

  const maintenanceMode = maintenanceModeInput.checked;
  const serviceMessage = serviceMessageInput.value.trim();
  const allowedOrigins = allowedOriginsInput.value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (serviceMessage.length < 3 || allowedOrigins.length === 0) {
    adminStatus.textContent = "Service message and allowed origins are required.";
    return;
  }

  try {
    const data = await adminRequest("/api/admin/config", {
      method: "POST",
      body: JSON.stringify({ maintenanceMode, serviceMessage, allowedOrigins }),
    });
    setAdminFormValues(data.config);
    const status = await fetchPublicStatus();
    renderPublicStatus(status);
    adminStatus.textContent = "Configuration updated successfully.";
  } catch {
    adminStatus.textContent = "Failed to update configuration. Check token and payload.";
  }
});

(async function init() {
  try {
    const status = await fetchPublicStatus();
    renderPublicStatus(status);
  } catch {
    publicStatus.textContent = "Unable to load service status.";
  }
})();
