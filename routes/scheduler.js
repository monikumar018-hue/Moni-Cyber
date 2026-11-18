const express = require("express");
const ScheduledPost = require("../models/ScheduledPost");
const ActivityLog = require("../models/ActivityLog");
const { requirePage } = require("../middleware/authentication");
const { sameOrigin } = require("../middleware/security");
const router = express.Router();

router.get("/", async (req, res, next) => {
  try { res.json({ scheduledPosts: await ScheduledPost.list(req.sessionID) }); } catch (error) { next(error); }
});

router.post("/", sameOrigin, requirePage, async (req, res, next) => {
  try {
    const content = String(req.body?.content || "").trim();
    const date = new Date(req.body?.scheduledAt);
    if (!content || content.length > 63206) return res.status(400).json({ error: "Invalid post content." });
    if (Number.isNaN(date.valueOf()) || date <= new Date()) return res.status(400).json({ error: "Choose a valid future schedule time." });
    const scheduledPost = await ScheduledPost.create({ ownerId: req.sessionID, pageId: req.session.selectedPage.id, pageName: req.session.selectedPage.name, content, scheduledAt: date.toISOString() });
    await ActivityLog.add({ ownerId: req.sessionID, action: "post.scheduled", details: { scheduledPostId: scheduledPost.id } });
    res.status(201).json({ scheduledPost, note: "Saved to the schedule only; publishing is not enabled in this starter." });
  } catch (error) { next(error); }
});

router.delete("/:id", sameOrigin, async (req, res, next) => {
  try {
    const removed = await ScheduledPost.remove(req.params.id, req.sessionID);
    if (!removed) return res.status(404).json({ error: "Scheduled post not found." });
    res.json({ deleted: true });
  } catch (error) { next(error); }
});

module.exports = router;
