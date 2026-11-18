const express = require("express");
const { requirePage } = require("../middleware/authentication");
const { getPageInsights } = require("../services/analyticsService");
const ActivityLog = require("../models/ActivityLog");
const router = express.Router();

router.get("/", requirePage, async (req, res) => {
  try {
    const insights = await getPageInsights(req.session.selectedPage);
    res.json({ insights });
  } catch (error) {
    console.error("Analytics request failed:", error.message);
    res.status(502).json({ error: "Could not load Page insights. Verify app permissions and Page access." });
  }
});

router.get("/activity", async (req, res, next) => {
  try { res.json({ activity: await ActivityLog.list(req.sessionID) }); } catch (error) { next(error); }
});

module.exports = router;
