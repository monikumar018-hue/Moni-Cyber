const express = require("express");
const Draft = require("../models/Draft");
const ActivityLog = require("../models/ActivityLog");
const { requirePage } = require("../middleware/authentication");
const { sameOrigin } = require("../middleware/security");
const router = express.Router();

router.get("/", async (req, res, next) => {
  try { res.json({ drafts: await Draft.list(req.sessionID) }); } catch (error) { next(error); }
});

router.post("/", sameOrigin, requirePage, async (req, res, next) => {
  try {
    const content = String(req.body?.content || "").trim();
    if (!content || content.length > 63206) return res.status(400).json({ error: "Invalid post content." });
    const draft = await Draft.create({ ownerId: req.sessionID, pageId: req.session.selectedPage.id, pageName: req.session.selectedPage.name, content });
    await ActivityLog.add({ ownerId: req.sessionID, action: "draft.created", details: { draftId: draft.id } });
    res.status(201).json({ draft });
  } catch (error) { next(error); }
});

router.delete("/:id", sameOrigin, async (req, res, next) => {
  try {
    const deleted = await Draft.remove(req.params.id, req.sessionID);
    if (!deleted) return res.status(404).json({ error: "Draft not found." });
    await ActivityLog.add({ ownerId: req.sessionID, action: "draft.deleted", details: { draftId: req.params.id } });
    res.json({ deleted: true });
  } catch (error) { next(error); }
});

module.exports = router;
