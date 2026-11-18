const express = require("express");
const { graphGet } = require("../services/metaGraph");
const { requireMeta } = require("../middleware/authentication");
const { sameOrigin } = require("../middleware/security");
const router = express.Router();

router.get("/", requireMeta, async (req, res) => {
  try {
    const result = await graphGet("me/accounts?fields=id,name,tasks,access_token", req.session.userAccessToken);
    req.session.availablePages = Object.fromEntries((result.data || []).map((page) => [page.id, { id: page.id, name: page.name, tasks: page.tasks || [], token: page.access_token }]));
    res.json({ pages: (result.data || []).map(({ id, name, tasks }) => ({ id, name, tasks: tasks || [] })) });
  } catch (error) {
    console.error("Page list error:", error.message);
    res.status(502).json({ error: "Could not load Pages." });
  }
});

router.post("/select", sameOrigin, requireMeta, (req, res) => {
  const page = req.session.availablePages?.[req.body?.pageId];
  if (!page) return res.status(403).json({ error: "This Page is not in your authorized Page list. Reload Pages and try again." });
  req.session.selectedPage = page;
  res.json({ connected: true, page: { id: page.id, name: page.name } });
});

module.exports = router;
