import "./load-env.js";
import express from "express";
import cors from "cors";
import { initDb, getDbInfo } from "./db-adapter.js";
import { trackRequest } from "./observability.js";
import { 
  PORT, 
  IS_PRODUCTION, 
  EXPLICIT_ALLOWED_ORIGINS,
  ADMIN_EMAIL_ALLOWLIST
} from "./config.js";
import { isAllowedOrigin } from "./utils/common.js";

// Routes
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import chatRoutes from "./routes/chat.js";
import adminRoutes from "./routes/admin.js";
import coreRoutes from "./routes/core.js";

const app = express();

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, origin || true);
      return;
    }
    callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true,
}));

app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true, limit: "8mb" }));

app.use((error, req, res, next) => {
  if (!error) {
    next();
    return;
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: "Uploaded character image is too large. Use a smaller file or external image URL." });
  }

  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ error: "Invalid JSON request body." });
  }

  return next(error);
});

app.use((req, res, next) => {
  trackRequest(req, res);
  next();
});

// Register Routes
app.use("/", coreRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", profileRoutes); // Handles /onboarding, /profile, /referrals, /payments, /feedback
app.use("/api", chatRoutes);    // Handles /history, /characters, /luna, /audio
app.use("/api/admin", adminRoutes);

if (IS_PRODUCTION && EXPLICIT_ALLOWED_ORIGINS.size === 0) {
  console.warn("[security] No allowed CORS origins configured. Cross-origin browser access is disabled until CORS_ALLOWED_ORIGINS/FRONTEND_URL/APP_URL/SITE_URL is set.");
}

if (IS_PRODUCTION && ADMIN_EMAIL_ALLOWLIST.size === 0) {
  console.warn("[security] No admin allowlist configured. Admin routes will remain unavailable until LUNA_ADMIN_EMAILS is set.");
}

async function startServer() {
  try {
    const db = await initDb();
    const modeLabel = `mode=${db.mode}, mongoConfigured=${db.mongoConfigured}`;
    if (db.warning) {
      console.warn(`[db] ${db.warning}`);
    }
    console.log(`[db] Engine: ${db.engine} (${modeLabel})`);
  } catch (error) {
    console.error(`[db] Startup failed: ${error.message}`);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Luna server running on port ${PORT}`);
  });
}

startServer();
