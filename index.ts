import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import * as fs from "fs";
import * as path from "path";
import { Pool } from "pg";
import crypto from "crypto";

const ADMIN_EMAIL = "laknyemchungz67@gmail.com";

async function seedDatabase() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const hash = (p: string) => crypto.createHash("sha256").update(p).digest("hex");

    // ── Ensure schema columns exist ──────────────────────────────────────
    await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT ''");
    await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT NULL");
    // Ensure image_url is TEXT (not VARCHAR which rejects base64 images)
    await pool.query("ALTER TABLE products ALTER COLUMN image_url TYPE TEXT");
    await pool.query("ALTER TABLE products ALTER COLUMN name TYPE VARCHAR(500)");

    // ── Notifications table ───────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'general',
        is_read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query("CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)");

    // ── Orders: ensure columns exist ──────────────────────────────────────────
    await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_to TEXT DEFAULT NULL");
    await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()");
    await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cod'");

    // ── App settings table ────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL DEFAULT ''
      )
    `);
    // Default delivery charge
    await pool.query(
      "INSERT INTO app_settings (key, value) VALUES('delivery_charge', '20') ON CONFLICT (key) DO NOTHING"
    );

    // ── Enforce admin role for the designated admin email ─────────────────
    const adminExists = await pool.query("SELECT id, role FROM users WHERE email=$1", [ADMIN_EMAIL]);
    if (adminExists.rows.length > 0 && adminExists.rows[0].role !== "admin") {
      await pool.query("UPDATE users SET role='admin' WHERE email=$1", [ADMIN_EMAIL]);
      console.log(`Enforced admin role for ${ADMIN_EMAIL}`);
    }

    // ── Seed default categories (only if table is empty) ─────────────────
    const catCount = await pool.query("SELECT COUNT(*) FROM categories");
    if (parseInt(catCount.rows[0].count) === 0) {
      const categories = [
        { name: "Vegetables",     icon: "leaf",       color: "#4CAF50", sort_order: 1 },
        { name: "Fruits",         icon: "nutrition",  color: "#FF9800", sort_order: 2 },
        { name: "Meat",           icon: "flame",      color: "#F44336", sort_order: 3 },
        { name: "Groceries",      icon: "basket",     color: "#2196F3", sort_order: 4 },
        { name: "Local Products", icon: "storefront", color: "#9C27B0", sort_order: 5 },
        { name: "Others",         icon: "grid",       color: "#607D8B", sort_order: 6 },
      ];
      for (const cat of categories) {
        await pool.query(
          "INSERT INTO categories (name, icon, color, sort_order) VALUES($1,$2,$3,$4)",
          [cat.name, cat.icon, cat.color, cat.sort_order]
        );
      }
      console.log(`Seeded ${categories.length} categories`);
    }

    console.log("Database setup complete");
  } catch (e) {
    console.error("Setup error:", e);
  } finally {
    await pool.end();
  }
}

const app = express();
const log = console.log;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }

    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }

    const origin = req.header("origin");

    const isLocalhost =
      origin?.startsWith("http://localhost:") ||
      origin?.startsWith("http://127.0.0.1:");

    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      limit: "15mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false, limit: "15mb" }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoAndLanding(app: express.Application) {
  const webBuildPath = path.resolve(process.cwd(), "dist");
  const webIndexPath = path.join(webBuildPath, "index.html");
  const hasWebBuild = fs.existsSync(webIndexPath);

  if (hasWebBuild) {
    log("Serving Expo web build from dist/ as SPA");
    app.use(express.static(webBuildPath, { index: false }));
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(webIndexPath);
    });
    return;
  }

  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();

  log("Serving static Expo files with dynamic manifest routing");

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }

    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }

    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName,
      });
    }

    next();
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));

  // Catch-all: any non-API path that didn't match above serves the landing page
  // This prevents "Not Found" when users navigate to app paths directly
  app.use((req: Request, res: Response) => {
    if (!req.path.startsWith("/api")) {
      serveLandingPage({ req, res, landingPageTemplate, appName });
    }
  });

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });
}

(async () => {
  await seedDatabase();

  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  configureExpoAndLanding(app);

  const server = await registerRoutes(app);

  setupErrorHandler(app);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`express server serving on port ${port}`);
    },
  );
})();
