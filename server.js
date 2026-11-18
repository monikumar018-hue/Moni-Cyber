require("dotenv").config();

const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const crypto = require("crypto");

const app = express();

const {
  PORT = 3000,
  META_APP_ID,
  META_APP_SECRET,
  META_GRAPH_VERSION,
  META_REDIRECT_URI,
  SESSION_SECRET,
  NODE_ENV = "development",
} = process.env;

const requiredEnvironment = {
  META_APP_ID,
  META_APP_SECRET,
  META_GRAPH_VERSION,
  META_REDIRECT_URI,
  SESSION_SECRET,
};

const missingEnvironment = Object.entries(requiredEnvironment)
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missingEnvironment.length) {
  console.error(`Missing required environment variables: ${missingEnvironment.join(", ")}`);
  process.exit(1);
}

const GRAPH = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
const REQUIRED_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "read_insights",
];

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.static(__dirname + "/public"));

if (NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  session({
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
  })
);

function sameOrigin(req, res, next) {
  if (req.method === "GET" || req.method === "HEAD") {
    return next();
  }

  const origin = req.get("origin");

  if (origin && origin !== new URL(META_REDIRECT_URI).origin) {
    return res.status(403).json({ error: "Invalid origin." });
  }

  next();
}

function makeAppSecretProof(token) {
  return crypto
    .createHmac("sha256", META_APP_SECRET)
    .update(token)
    .digest("hex");
}

async function graphGet(path, token) {
  const url = new URL(`${GRAPH}/${path}`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("appsecret_proof", makeAppSecretProof(token));

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || "Meta API request failed.");
  }

  return data;
}

app.get("/auth/meta", (req, res) => {
  const state = crypto.randomBytes(32).toString("hex");
  req.session.oauthState = state;

  const url = new URL(`https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", META_APP_ID);
  url.searchParams.set("redirect_uri", META_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("scope", REQUIRED_SCOPES.join(","));

  res.redirect(url.toString());
});

app.get("/auth/meta/callback", async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).send("Meta login was not completed.");
    }

    if (!code || !state || !req.session.oauthState || state !== req.session.oauthState) {
      return res.status(400).send("Invalid OAuth state.");
    }

    delete req.session.oauthState;

    const tokenUrl = new URL(`${GRAPH}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", META_APP_ID);
    tokenUrl.searchParams.set("client_secret", META_APP_SECRET);
    tokenUrl.searchParams.set("redirect_uri", META_REDIRECT_URI);
    tokenUrl.searchParams.set("code", code);

    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error("Could not exchange OAuth code.");
    }

    req.session.userAccessToken = tokenData.access_token;
    res.redirect("/?connected=pending");
  } catch (err) {
    console.error("OAuth callback failed:", err.message);
    res.status(500).send("Meta connection failed.");
  }
});

app.get("/api/pages", async (req, res) => {
  try {
    const userToken = req.session.userAccessToken;

    if (!userToken) {
      return res.status(401).json({ error: "Please connect your Meta account first." });
    }

    const result = await graphGet("me/accounts?fields=id,name,tasks,access_token", userToken);
    req.session.availablePages = {};

    for (const page of result.data || []) {
      req.session.availablePages[page.id] = {
        name: page.name,
        tasks: page.tasks || [],
        token: page.access_token,
      };
    }

    res.json({
      pages: (result.data || []).map((page) => ({
        id: page.id,
        name: page.name,
        tasks: page.tasks || [],
      })),
    });
  } catch (err) {
    console.error("Page list error:", err.message);
    res.status(502).json({ error: "Could not load Pages." });
  }
});

app.post("/api/pages/select", sameOrigin, (req, res) => {
  const { pageId } = req.body || {};
  const page = req.session.availablePages?.[pageId];

  if (!page) {
    return res.status(403).json({ error: "This Page is not in your authorized Page list." });
  }

  req.session.selectedPage = {
    id: pageId,
    name: page.name,
    token: page.token,
  };

  res.json({ connected: true, page: { id: pageId, name: page.name } });
});

app.get("/api/connection", (req, res) => {
  const page = req.session.selectedPage;

  if (!page) {
    return res.json({ connected: false });
  }

  res.json({ connected: true, page: { id: page.id, name: page.name } });
});

app.post("/api/logout", sameOrigin, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("moni.sid");
    res.json({ disconnected: true });
  });
});

app.post("/api/drafts", sameOrigin, (req, res) => {
  const page = req.session.selectedPage;
  const content = String(req.body?.content || "").trim();

  if (!page) {
    return res.status(403).json({ error: "Please select a Facebook Page first." });
  }

  if (!content || content.length > 63206) {
    return res.status(400).json({ error: "Invalid post content." });
  }

  req.session.drafts ||= [];

  const draft = {
    id: crypto.randomUUID(),
    pageId: page.id,
    pageName: page.name,
    content,
    status: "draft",
    createdAt: new Date().toISOString(),
  };

  req.session.drafts.push(draft);
  res.status(201).json({ draft });
});

app.get("/api/drafts", (req, res) => {
  res.json({ drafts: req.session.drafts || [] });
});

app.delete("/api/drafts/:id", sameOrigin, (req, res) => {
  const drafts = req.session.drafts || [];
  const updated = drafts.filter((draft) => draft.id !== req.params.id);

  if (updated.length === drafts.length) {
    return res.status(404).json({ error: "Draft not found." });
  }

  req.session.drafts = updated;
  res.json({ deleted: true });
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.listen(PORT, () => {
  console.log(`MONI CYBER SECURITY running on http://localhost:${PORT}`);
});
