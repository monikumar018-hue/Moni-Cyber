const express = require("express");
const crypto = require("node:crypto");
const { META_APP_ID, META_APP_SECRET, META_GRAPH_VERSION, META_REDIRECT_URI } = process.env;
const { REQUIRED_SCOPES } = require("../services/metaGraph");
const router = express.Router();

router.get("/meta", (req, res) => {
  if (!META_APP_ID || !META_GRAPH_VERSION || !META_REDIRECT_URI) {
    return res.status(503).send("Meta OAuth is not configured. Set credentials in .env.");
  }
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

router.get("/meta/callback", async (req, res) => {
  try {
    const { code, state, error } = req.query;
    if (error) return res.status(400).send("Meta login was not completed.");
    if (!code || !state || state !== req.session.oauthState) return res.status(400).send("Invalid OAuth state.");
    delete req.session.oauthState;
    const url = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`);
    url.searchParams.set("client_id", META_APP_ID);
    url.searchParams.set("client_secret", META_APP_SECRET);
    url.searchParams.set("redirect_uri", META_REDIRECT_URI);
    url.searchParams.set("code", code);
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok || !data.access_token) throw new Error("Could not exchange OAuth code.");
    req.session.userAccessToken = data.access_token;
    res.redirect("/?connected=pending");
  } catch (error) {
    console.error("Meta OAuth callback failed:", error.message);
    res.status(502).send("Meta connection failed. Check the server logs.");
  }
});

module.exports = router;
