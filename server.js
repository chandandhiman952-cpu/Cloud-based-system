import express from "express";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import admin from "firebase-admin";
import fs from "node:fs";

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = Number(process.env.PORT || 3000);
const CLOUD_MODE = process.env.CLOUD_MODE === "true";

let pool = null;
let firebaseDb = null;
let initError = null;

const demoStudents = [
  { student_id: "CU001", name: "Aarav Sharma", department: "CSE-AIML", email: "aarav@example.com" },
  { student_id: "CU002", name: "Simran Kaur", department: "CSE", email: "simran@example.com" },
  { student_id: "CU003", name: "Rahul Verma", department: "IT", email: "rahul@example.com" }
];
const demoAttendance = {};

async function initCloud() {
  if (!CLOUD_MODE) return;
  try {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE || "student_portal",
      waitForConnections: true,
      connectionLimit: 5,
      ssl: process.env.MYSQL_SSL === "true" ? { rejectUnauthorized: true } : undefined
    });
    await pool.query("SELECT 1");

    if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH || !fs.existsSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)) {
      throw new Error("Firebase service-account JSON file not found. Check FIREBASE_SERVICE_ACCOUNT_PATH.");
    }
    const serviceAccount = JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8"));
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
    }
    firebaseDb = admin.database();
    console.log("AWS RDS and Firebase initialized.");
  } catch (err) {
    initError = err.message;
    console.error("Cloud initialization failed:", err.message);
    console.error("Check .env, cloud resources, credentials, and network access.");
  }
}

app.get("/api/health", (_req, res) => {
  res.json({
    mode: CLOUD_MODE ? "cloud" : "demo",
    services: { awsRds: Boolean(pool), firebase: Boolean(firebaseDb) },
    initError
  });
});

app.get("/api/students", async (req, res) => {
  try {
    if (pool) {
      const [rows] = await pool.query("SELECT student_id, name, department, email FROM students ORDER BY student_id");
      return res.json(rows);
    }
    const dept = String(req.query.department || "").toLowerCase();
    return res.json(demoStudents.filter(s => !dept || s.department.toLowerCase().includes(dept)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/students", async (req, res) => {
  const { student_id, name, department, email = "" } = req.body || {};
  if (!student_id || !name || !department) return res.status(400).json({ error: "student_id, name, and department are required." });
  try {
    const record = { student_id: String(student_id).trim(), name: String(name).trim(), department: String(department).trim(), email: String(email).trim() };
    if (pool) {
      await pool.execute(
        "INSERT INTO students (student_id, name, department, email) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), department=VALUES(department), email=VALUES(email)",
        [record.student_id, record.name, record.department, record.email]
      );
    } else {
      const idx = demoStudents.findIndex(s => s.student_id === record.student_id);
      if (idx >= 0) demoStudents[idx] = record; else demoStudents.push(record);
    }
    res.status(201).json({ message: "Student saved", student: record });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/attendance/:date", async (req, res) => {
  try {
    const date = req.params.date;
    if (firebaseDb) {
      const snap = await firebaseDb.ref(`attendance/${date}`).get();
      return res.json(snap.exists() ? snap.val() : {});
    }
    return res.json(demoAttendance[date] || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/attendance/:date/:studentId", async (req, res) => {
  const { date, studentId } = req.params;
  const { studentName, status } = req.body || {};
  if (!studentName || !["Present", "Absent", "Late"].includes(status)) {
    return res.status(400).json({ error: "studentName and status (Present, Absent, or Late) are required." });
  }
  const record = { studentId, studentName, status, updatedAt: new Date().toISOString() };
  try {
    if (firebaseDb) {
      await firebaseDb.ref(`attendance/${date}/${studentId}`).set(record);
    } else {
      demoAttendance[date] ||= {};
      demoAttendance[date][studentId] = record;
    }
    res.json({ message: "Attendance saved", record });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("*", (_req, res) => res.sendFile(new URL("./public/index.html", import.meta.url).pathname));
await initCloud();
app.listen(PORT, () => console.log(`Student Management System running at http://localhost:${PORT}`));
