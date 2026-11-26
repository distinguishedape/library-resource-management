import express from "express";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const PROJECT_DIR = path.join(__dirname, "library_resource_management");
const USER_JSON_PATH = path.join(PROJECT_DIR, "exp2", "user.json");
const ALTER_JSON_PATH = path.join(PROJECT_DIR, "exp3", "alter.json");
const COUNT_JSON_PATH = path.join(PROJECT_DIR, "exp4", "count.json");

interface UserRecord {
  id: string;
  name: string;
  email: string;
  resource: string;
  purpose: string;
}

interface AlterRecord {
  id: string;
  name: string;
  email: string;
  originalResource: string;
  alteredResource: string;
  purpose: string;
  alteredAt: string;
}

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), "utf8");
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, "utf8").trim();
    return content ? (JSON.parse(content) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function writeJsonFile(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Compute standard CRC32 for ZIP archive entries
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function collectFiles(dir: string, baseDir: string): Array<{ relPath: string; fullPath: string }> {
  const results: Array<{ relPath: string; fullPath: string }> = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".DS_Store") {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      const relPath = path.relative(baseDir, fullPath).split(path.sep).join("/");
      results.push({ relPath, fullPath });
    }
  }
  return results;
}

// Build a standard PKZIP buffer from a folder using Node's built-in zlib
function createZipBufferFromDirectory(sourceDir: string, rootFolderName: string): Buffer {
  const files = collectFiles(sourceDir, sourceDir);
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const fileData = fs.readFileSync(file.fullPath);
    const compressed = zlib.deflateRawSync(fileData);
    const crc = crc32(fileData);
    const entryName = Buffer.from(`${rootFolderName}/${file.relPath}`, "utf8");

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(fileData.length, 22);
    localHeader.writeUInt16LE(entryName.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, entryName, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(fileData.length, 24);
    centralHeader.writeUInt16LE(entryName.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, entryName);
    offset += localHeader.length + entryName.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(files.length, 8);
  endRecord.writeUInt16LE(files.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Serve static files for Experiments 1, 2, and 3 directly from library_resource_management
  app.use("/exp1", express.static(path.join(PROJECT_DIR, "exp1")));
  app.use("/exp2", express.static(path.join(PROJECT_DIR, "exp2")));
  app.use("/exp3", express.static(path.join(PROJECT_DIR, "exp3")));

  // Downloadable ZIP archive of the complete standalone library_resource_management folder
  app.get("/api/download-zip", (_req, res) => {
    try {
      const zipBuffer = createZipBufferFromDirectory(PROJECT_DIR, "library_resource_management");
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", 'attachment; filename="library_resource_management.zip"');
      res.send(zipBuffer);
    } catch {
      res.status(500).json({ error: "Failed to build ZIP archive." });
    }
  });

  // GET all users from user.json
  app.get("/api/users", (_req, res) => {
    const users = readJsonFile<UserRecord[]>(USER_JSON_PATH, []);
    res.json(users);
  });

  // POST add new user to user.json (Experiment 2)
  app.post("/api/users", (req, res) => {
    const { id, name, email, resource, purpose } = req.body as Partial<UserRecord>;
    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanEmail = typeof email === "string" ? email.trim() : "";
    const cleanResource = typeof resource === "string" ? resource.trim() : "";
    const cleanPurpose = typeof purpose === "string" ? purpose.trim() : "";

    if (!cleanName || !cleanEmail || !cleanResource || !cleanPurpose) {
      res.status(400).json({ error: "All fields are required." });
      return;
    }
    if (cleanName.length > 40) {
      res.status(400).json({ error: "User name cannot exceed 40 characters." });
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      res.status(400).json({ error: "Invalid email address." });
      return;
    }

    const users = readJsonFile<UserRecord[]>(USER_JSON_PATH, []);
    const duplicate = users.some((u) => u.email.toLowerCase() === cleanEmail.toLowerCase());
    if (duplicate) {
      res.status(409).json({ error: "Duplicate email address is not allowed." });
      return;
    }

    const newUser: UserRecord = {
      id: id || `USR-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      resource: cleanResource,
      purpose: cleanPurpose,
    };
    users.push(newUser);
    writeJsonFile(USER_JSON_PATH, users);
    res.status(201).json({ message: "User saved successfully.", user: newUser });
  });

  // PUT update user record in user.json (Experiment 3)
  app.put("/api/users/:id", (req, res) => {
    const targetId = req.params.id;
    const { name, email, resource, purpose } = req.body as Partial<UserRecord>;
    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanEmail = typeof email === "string" ? email.trim() : "";
    const cleanResource = typeof resource === "string" ? resource.trim() : "";
    const cleanPurpose = typeof purpose === "string" ? purpose.trim() : "";

    if (!cleanName || !cleanEmail || !cleanResource || !cleanPurpose) {
      res.status(400).json({ error: "All fields are required for update." });
      return;
    }
    if (cleanName.length > 40) {
      res.status(400).json({ error: "User name cannot exceed 40 characters." });
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      res.status(400).json({ error: "Please enter a valid email address." });
      return;
    }

    const users = readJsonFile<UserRecord[]>(USER_JSON_PATH, []);
    const index = users.findIndex((u) => u.id === targetId);
    if (index === -1) {
      res.status(404).json({ error: "User record not found." });
      return;
    }

    const duplicate = users.some(
      (u) => u.id !== targetId && u.email.toLowerCase() === cleanEmail.toLowerCase()
    );
    if (duplicate) {
      res.status(409).json({ error: "Another user already uses this email." });
      return;
    }

    users[index] = {
      id: targetId,
      name: cleanName,
      email: cleanEmail,
      resource: cleanResource,
      purpose: cleanPurpose,
    };
    writeJsonFile(USER_JSON_PATH, users);
    res.json({ message: "User updated in user.json.", user: users[index] });
  });

  // GET altered records from alter.json (Experiment 3)
  app.get("/api/alter", (_req, res) => {
    const alteredRecords = readJsonFile<AlterRecord[]>(ALTER_JSON_PATH, []);
    res.json(alteredRecords);
  });

  // POST alter resource into alter.json without modifying user.json (Experiment 3)
  app.post("/api/alter/:id", (req, res) => {
    const targetId = req.params.id;
    const { alteredResource } = req.body as { alteredResource?: string };
    const cleanAlteredResource =
      typeof alteredResource === "string" ? alteredResource.trim() : "";

    if (!cleanAlteredResource) {
      res.status(400).json({ error: "Altered resource is required." });
      return;
    }

    const users = readJsonFile<UserRecord[]>(USER_JSON_PATH, []);
    const user = users.find((u) => u.id === targetId);
    if (!user) {
      res.status(404).json({ error: "User not found in user.json." });
      return;
    }

    const alterRecords = readJsonFile<AlterRecord[]>(ALTER_JSON_PATH, []);
    const alterEntry: AlterRecord = {
      id: user.id,
      name: user.name,
      email: user.email,
      originalResource: user.resource,
      alteredResource: cleanAlteredResource,
      purpose: user.purpose,
      alteredAt: new Date().toISOString(),
    };

    const existingIndex = alterRecords.findIndex((entry) => entry.id === targetId);
    if (existingIndex !== -1) {
      alterRecords[existingIndex] = alterEntry;
    } else {
      alterRecords.push(alterEntry);
    }

    writeJsonFile(ALTER_JSON_PATH, alterRecords);
    res.json({ message: "Resource altered in alter.json.", altered: alterEntry });
  });

  // DELETE user from both user.json and alter.json (Experiment 3)
  app.delete("/api/users/:id", (req, res) => {
    const targetId = req.params.id;
    const users = readJsonFile<UserRecord[]>(USER_JSON_PATH, []);
    const updatedUsers = users.filter((u) => u.id !== targetId);

    if (updatedUsers.length === users.length) {
      res.status(404).json({ error: "User record not found." });
      return;
    }

    const alterRecords = readJsonFile<AlterRecord[]>(ALTER_JSON_PATH, []);
    const updatedAlter = alterRecords.filter((a) => a.id !== targetId);

    const counts = readJsonFile<Record<string, number>>(COUNT_JSON_PATH, {});
    if (Object.prototype.hasOwnProperty.call(counts, targetId)) {
      delete counts[targetId];
      writeJsonFile(COUNT_JSON_PATH, counts);
    }

    writeJsonFile(USER_JSON_PATH, updatedUsers);
    writeJsonFile(ALTER_JSON_PATH, updatedAlter);
    res.json({ message: "Record deleted from both user.json and alter.json." });
  });

  // GET update counts from count.json (Experiment 4)
  app.get("/api/counts", (_req, res) => {
    const counts = readJsonFile<Record<string, number>>(COUNT_JSON_PATH, {});
    res.json(counts);
  });

  // PUT update user record and increment individual user count in count.json (Experiment 4)
  app.put("/api/exp4/users/:id", (req, res) => {
    const targetId = req.params.id;
    const users = readJsonFile<UserRecord[]>(USER_JSON_PATH, []);
    const index = users.findIndex((u) => u.id === targetId);

    if (index === -1) {
      res.status(404).json({ error: "User record not found." });
      return;
    }

    const currentUser = users[index];
    const body = req.body as Partial<UserRecord>;
    const nextName =
      typeof body.name === "string" && body.name.trim() ? body.name.trim() : currentUser.name;
    const nextEmail =
      typeof body.email === "string" && body.email.trim() ? body.email.trim() : currentUser.email;
    const nextResource =
      typeof body.resource === "string" && body.resource.trim()
        ? body.resource.trim()
        : currentUser.resource;
    const nextPurpose =
      typeof body.purpose === "string" && body.purpose.trim()
        ? body.purpose.trim()
        : currentUser.purpose;

    if (nextName.length > 40) {
      res.status(400).json({ error: "User name cannot exceed 40 characters." });
      return;
    }
    if (!isValidEmail(nextEmail)) {
      res.status(400).json({ error: "Please enter a valid email address." });
      return;
    }

    const duplicate = users.some(
      (u) => u.id !== targetId && u.email.toLowerCase() === nextEmail.toLowerCase()
    );
    if (duplicate) {
      res.status(409).json({ error: "Another user already uses this email." });
      return;
    }

    users[index] = {
      id: targetId,
      name: nextName,
      email: nextEmail,
      resource: nextResource,
      purpose: nextPurpose,
    };
    writeJsonFile(USER_JSON_PATH, users);

    const counts = readJsonFile<Record<string, number>>(COUNT_JSON_PATH, {});
    const newCount = (counts[targetId] || 0) + 1;
    counts[targetId] = newCount;
    writeJsonFile(COUNT_JSON_PATH, counts);

    res.json({
      user: users[index],
      count: newCount,
      message: `Thank you, ${users[index].name}! Your record was updated.`,
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Library Resource Management Launcher running on http://localhost:${PORT}`);
  });
}

startServer();
