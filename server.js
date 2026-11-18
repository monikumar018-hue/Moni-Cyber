require("dotenv").config();

const crypto = require("node:crypto");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const path = require("node:path");

const authRoutes = require("./routes/auth");
const pageRoutes = require("./routes/pages");
const draftRoutes = require("./routes/drafts");
const schedulerRoutes = require("./routes/scheduler");
const analyticsRoutes = require("./routes/analytics");
const securityRoutes = require("./routes/security");
const { initDatabase } = require("./config/database");

const app = express();
const {
  PORT = 3000,
  SESSION_SECRET,
  NODE_ENV = "development",
} = process.env;

if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET is required. Copy .env.example to .env and configure it.");
}

if (NODE_ENV === "production") app.set("trust proxy", 1);

app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.use(session({
  name: "moni.sid",
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 60 * 1000,
  },
}));
app.use(express.static(path.join(__dirname, "public")));

app.use("/auth", authRoutes);
app.use("/api/pages", pageRoutes);
app.use("/api/drafts", draftRoutes);
app.use("/api/scheduler", schedulerRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api", securityRoutes);

app.get("/api/connection", (req, res) => {
  const page = req.session.selectedPage;
  res.json(page ? { connected: true, page: { id: page.id, name: page.name } } : { connected: false });
});

app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.use((err, _req, res, _next) => {
  console.error("Request failed:", err.message);
  res.status(500).json({ error: "An unexpected server error occurred." });
});

initDatabase()
  .then(() => app.listen(PORT, () => console.log(`MONI CYBER SECURITY running at http://localhost:${PORT}`)))
  .catch((error) => {
    console.error("Database initialization failed:", error);
    process.exitCode = 1;
  });

module.exports = app;
