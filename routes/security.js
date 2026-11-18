const express = require("express");
const { sameOrigin } = require("../middleware/security");
const router = express.Router();

router.get("/security/status", (req, res) => {
  res.json({ connected: Boolean(req.session.userAccessToken), pageSelected: Boolean(req.session.selectedPage), csrfOriginCheck: "enabled" });
});

router.post("/logout", sameOrigin, (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("moni.sid", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    res.json({ disconnected: true });
  });
});

module.exports = router;
