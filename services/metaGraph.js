const REQUIRED_SCOPES = ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "read_insights"];

function makeAppSecretProof(token) {
  const crypto = require("node:crypto");
  const secret = process.env.META_APP_SECRET;
  if (!secret) throw new Error("META_APP_SECRET is not configured.");
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

async function graphGet(path, token) {
  const version = process.env.META_GRAPH_VERSION;
  if (!version) throw new Error("META_GRAPH_VERSION is not configured.");
  const url = new URL(`https://graph.facebook.com/${version}/${path}`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("appsecret_proof", makeAppSecretProof(token));
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error?.message || "Meta Graph API request failed.");
  return data;
}

module.exports = { REQUIRED_SCOPES, graphGet };
