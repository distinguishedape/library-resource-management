// Experiment 2: JavaScript Validation and JSON Storage

const STORAGE_KEY = "library_users_fallback";
const form = document.getElementById("libraryForm");
const messageBox = document.getElementById("messageBox");
const recordsContainer = document.getElementById("recordsContainer");

let userRecords = [];

// Show validation error or success message
function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = "message " + type;
}

// Validate email format using regular expression
function isValidEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

// Generate a simple unique ID for each user
function generateUniqueId() {
  return "USR-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

// Render all saved records in a plain HTML table
function renderRecords() {
  if (userRecords.length === 0) {
    recordsContainer.innerHTML = '<p class="empty-note">No records saved yet.</p>';
    return;
  }

  let tableHtml = `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Email</th>
          <th>Resource</th>
          <th>Purpose</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (let i = 0; i < userRecords.length; i++) {
    const user = userRecords[i];
    tableHtml += `
      <tr>
        <td>${escapeHtml(user.id)}</td>
        <td>${escapeHtml(user.name)}</td>
        <td>${escapeHtml(user.email)}</td>
        <td>${escapeHtml(user.resource)}</td>
        <td>${escapeHtml(user.purpose)}</td>
      </tr>
    `;
  }

  tableHtml += "</tbody></table>";
  recordsContainer.innerHTML = tableHtml;
}

// Prevent HTML injection when rendering text
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Load initial records from Express API, with localStorage fallback
async function loadRecords() {
  try {
    const response = await fetch("/api/users");
    if (response.ok) {
      userRecords = await response.json();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userRecords));
      renderRecords();
      return;
    }
  } catch (error) {
    // Server is not running; fall back to local user.json and localStorage
  }

  const savedLocal = localStorage.getItem(STORAGE_KEY);
  if (savedLocal) {
    userRecords = JSON.parse(savedLocal);
    renderRecords();
    return;
  }

  try {
    const fileResponse = await fetch("./user.json");
    if (fileResponse.ok) {
      userRecords = await fileResponse.json();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userRecords));
    }
  } catch (error) {
    userRecords = [];
  }

  renderRecords();
}

// Save a validated record to Express API (user.json) or localStorage fallback
async function saveRecord(newRecord) {
  try {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRecord)
    });

    const data = await response.json();
    if (!response.ok) {
      showMessage(data.error || "Failed to save record.", "error");
      return false;
    }

    userRecords.push(data.user || newRecord);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userRecords));
    renderRecords();
    showMessage("Record saved successfully into user.json.", "success");
    return true;
  } catch (error) {
    // Fallback when opened without Express server
    userRecords.push(newRecord);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userRecords));
    renderRecords();
    showMessage("Server offline: Record saved in browser localStorage fallback.", "success");
    return true;
  }
}

// Handle form submission with all required validations
form.addEventListener("submit", async function (event) {
  event.preventDefault();

  const name = document.getElementById("userName").value.trim();
  const email = document.getElementById("userEmail").value.trim();
  const resource = document.getElementById("resource").value.trim();
  const purposeInput = document.querySelector('input[name="purpose"]:checked');
  const purpose = purposeInput ? purposeInput.value : "";

  // 1. Prevent empty submissions
  if (!name || !email || !resource || !purpose) {
    showMessage("Please fill in all fields before submitting.", "error");
    return;
  }

  // 2. Limit user name to 40 characters
  if (name.length > 40) {
    showMessage("User name cannot exceed 40 characters.", "error");
    return;
  }

  // 3. Validate email address
  if (!isValidEmail(email)) {
    showMessage("Please enter a valid email address.", "error");
    return;
  }

  // 4. Prevent duplicate email addresses (case-insensitive)
  const duplicateFound = userRecords.some(function (record) {
    return record.email.toLowerCase() === email.toLowerCase();
  });

  if (duplicateFound) {
    showMessage("Duplicate email! This email address already exists.", "error");
    return;
  }

  const newRecord = {
    id: generateUniqueId(),
    name: name,
    email: email,
    resource: resource,
    purpose: purpose
  };

  const saved = await saveRecord(newRecord);
  if (saved) {
    form.reset();
  }
});

// Load records when page opens
loadRecords();
