// Experiment 3 & 4: Express.js Server for JSON File Operations

import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Paths to JSON data files
const USER_JSON_PATH = path.join(__dirname, "..", "exp2", "user.json");
const ALTER_JSON_PATH = path.join(__dirname, "alter.json");
const COUNT_JSON_PATH = path.join(__dirname, "..", "exp4", "count.json");

app.use(express.json());

// Helper function to read a JSON file safely
function readJsonFile(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), "utf8");
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, "utf8").trim();
    return content ? JSON.parse(content) : defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

// Helper function to write data to a JSON file
function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

// Helper function to validate email format
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Serve static experiment pages
app.use("/exp1", express.static(path.join(__dirname, "..", "exp1")));
app.use("/exp2", express.static(path.join(__dirname, "..", "exp2")));
app.use("/exp3", express.static(__dirname));
app.use("/exp4", express.static(path.join(__dirname, "..", "exp4", "dist")));

// Home route with simple links
app.get("/", function (req, res) {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Library Resource Management</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f2f2f2; padding: 30px; }
        .box { max-width: 520px; margin: 0 auto; background: #fff; border: 1px solid #ccc; padding: 24px; }
        h1 { margin-top: 0; font-size: 22px; }
        ul { line-height: 2; }
        a { color: #1a73e8; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>Library Resource Management</h1>
        <p>Select an experiment to open:</p>
        <ul>
          <li><a href="/exp1/">Experiment 1: HTML &amp; CSS Form</a></li>
          <li><a href="/exp2/">Experiment 2: JS Validation &amp; JSON Storage</a></li>
          <li><a href="/exp3/">Experiment 3: Express Update / Alter / Delete</a></li>
          <li><a href="/exp4/">Experiment 4: React Update Counter (requires build or Vite dev server)</a></li>
        </ul>
      </div>
    </body>
    </html>
  `);
});

// GET all user records from user.json
app.get("/api/users", function (req, res) {
  const users = readJsonFile(USER_JSON_PATH, []);
  res.json(users);
});

// POST create a new user record in user.json (used by Experiment 2)
app.post("/api/users", function (req, res) {
  const { id, name, email, resource, purpose } = req.body;

  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanEmail = typeof email === "string" ? email.trim() : "";
  const cleanResource = typeof resource === "string" ? resource.trim() : "";
  const cleanPurpose = typeof purpose === "string" ? purpose.trim() : "";

  if (!cleanName || !cleanEmail || !cleanResource || !cleanPurpose) {
    return res.status(400).json({ error: "All fields are required." });
  }

  if (cleanName.length > 40) {
    return res.status(400).json({ error: "User name cannot exceed 40 characters." });
  }

  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: "Invalid email address." });
  }

  const users = readJsonFile(USER_JSON_PATH, []);
  const duplicate = users.some(function (u) {
    return u.email.toLowerCase() === cleanEmail.toLowerCase();
  });

  if (duplicate) {
    return res.status(409).json({ error: "Duplicate email address is not allowed." });
  }

  const newUser = {
    id: id || "USR-" + Date.now(),
    name: cleanName,
    email: cleanEmail,
    resource: cleanResource,
    purpose: cleanPurpose
  };

  users.push(newUser);
  writeJsonFile(USER_JSON_PATH, users);

  res.status(201).json({ message: "User saved successfully.", user: newUser });
});

// 1. UPDATE: Update an existing user record in user.json
app.put("/api/users/:id", function (req, res) {
  const targetId = req.params.id;
  const { name, email, resource, purpose } = req.body;

  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanEmail = typeof email === "string" ? email.trim() : "";
  const cleanResource = typeof resource === "string" ? resource.trim() : "";
  const cleanPurpose = typeof purpose === "string" ? purpose.trim() : "";

  if (!cleanName || !cleanEmail || !cleanResource || !cleanPurpose) {
    return res.status(400).json({ error: "All fields are required for update." });
  }

  if (cleanName.length > 40) {
    return res.status(400).json({ error: "User name cannot exceed 40 characters." });
  }

  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  const users = readJsonFile(USER_JSON_PATH, []);
  const index = users.findIndex(function (u) {
    return u.id === targetId;
  });

  if (index === -1) {
    return res.status(404).json({ error: "User record not found." });
  }

  const duplicate = users.some(function (u) {
    return u.id !== targetId && u.email.toLowerCase() === cleanEmail.toLowerCase();
  });

  if (duplicate) {
    return res.status(409).json({ error: "Another user already uses this email." });
  }

  users[index] = {
    id: targetId,
    name: cleanName,
    email: cleanEmail,
    resource: cleanResource,
    purpose: cleanPurpose
  };

  writeJsonFile(USER_JSON_PATH, users);
  res.json({ message: "User updated in user.json.", user: users[index] });
});

// GET all altered records from alter.json
app.get("/api/alter", function (req, res) {
  const alteredRecords = readJsonFile(ALTER_JSON_PATH, []);
  res.json(alteredRecords);
});

// 2. ALTER: Save altered resource information into alter.json WITHOUT modifying user.json
app.post("/api/alter/:id", function (req, res) {
  const targetId = req.params.id;
  const { alteredResource } = req.body;
  const cleanAlteredResource = typeof alteredResource === "string" ? alteredResource.trim() : "";

  if (!cleanAlteredResource) {
    return res.status(400).json({ error: "Altered resource is required." });
  }

  const users = readJsonFile(USER_JSON_PATH, []);
  const user = users.find(function (u) {
    return u.id === targetId;
  });

  if (!user) {
    return res.status(404).json({ error: "User not found in user.json." });
  }

  const alterRecords = readJsonFile(ALTER_JSON_PATH, []);
  const alterEntry = {
    id: user.id,
    name: user.name,
    email: user.email,
    originalResource: user.resource,
    alteredResource: cleanAlteredResource,
    purpose: user.purpose,
    alteredAt: new Date().toISOString()
  };

  const existingIndex = alterRecords.findIndex(function (entry) {
    return entry.id === targetId;
  });

  if (existingIndex !== -1) {
    alterRecords[existingIndex] = alterEntry;
  } else {
    alterRecords.push(alterEntry);
  }

  writeJsonFile(ALTER_JSON_PATH, alterRecords);
  res.json({ message: "Resource altered in alter.json.", altered: alterEntry });
});

// 3. DELETE: Delete a record from BOTH user.json and alter.json
app.delete("/api/users/:id", function (req, res) {
  const targetId = req.params.id;

  const users = readJsonFile(USER_JSON_PATH, []);
  const updatedUsers = users.filter(function (u) {
    return u.id !== targetId;
  });

  if (updatedUsers.length === users.length) {
    return res.status(404).json({ error: "User record not found." });
  }

  const alterRecords = readJsonFile(ALTER_JSON_PATH, []);
  const updatedAlter = alterRecords.filter(function (a) {
    return a.id !== targetId;
  });

  const counts = readJsonFile(COUNT_JSON_PATH, {});
  if (Object.prototype.hasOwnProperty.call(counts, targetId)) {
    delete counts[targetId];
    writeJsonFile(COUNT_JSON_PATH, counts);
  }

  writeJsonFile(USER_JSON_PATH, updatedUsers);
  writeJsonFile(ALTER_JSON_PATH, updatedAlter);

  res.json({ message: "Record deleted from both user.json and alter.json." });
});

// Experiment 4: GET all user update counts from count.json
app.get("/api/counts", function (req, res) {
  const counts = readJsonFile(COUNT_JSON_PATH, {});
  res.json(counts);
});

// Experiment 4: Update user record and increment that user's unique update count in count.json
app.put("/api/exp4/users/:id", function (req, res) {
  const targetId = req.params.id;
  const users = readJsonFile(USER_JSON_PATH, []);
  const index = users.findIndex(function (u) {
    return u.id === targetId;
  });

  if (index === -1) {
    return res.status(404).json({ error: "User record not found." });
  }

  const currentUser = users[index];
  const nextName = typeof req.body.name === "string" && req.body.name.trim()
    ? req.body.name.trim()
    : currentUser.name;
  const nextEmail = typeof req.body.email === "string" && req.body.email.trim()
    ? req.body.email.trim()
    : currentUser.email;
  const nextResource = typeof req.body.resource === "string" && req.body.resource.trim()
    ? req.body.resource.trim()
    : currentUser.resource;
  const nextPurpose = typeof req.body.purpose === "string" && req.body.purpose.trim()
    ? req.body.purpose.trim()
    : currentUser.purpose;

  if (nextName.length > 40) {
    return res.status(400).json({ error: "User name cannot exceed 40 characters." });
  }

  if (!isValidEmail(nextEmail)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  const duplicate = users.some(function (u) {
    return u.id !== targetId && u.email.toLowerCase() === nextEmail.toLowerCase();
  });

  if (duplicate) {
    return res.status(409).json({ error: "Another user already uses this email." });
  }

  users[index] = {
    id: targetId,
    name: nextName,
    email: nextEmail,
    resource: nextResource,
    purpose: nextPurpose
  };
  writeJsonFile(USER_JSON_PATH, users);

  const counts = readJsonFile(COUNT_JSON_PATH, {});
  const newCount = (counts[targetId] || 0) + 1;
  counts[targetId] = newCount;
  writeJsonFile(COUNT_JSON_PATH, counts);

  res.json({
    user: users[index],
    count: newCount,
    message: "Thank you, " + users[index].name + "! Your record was updated."
  });
});

app.listen(PORT, function () {
  console.log("Library Resource Management Server running at http://localhost:" + PORT);
});
