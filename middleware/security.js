function sameOrigin(req, res, next) {
  const origin = req.get("origin");
  const host = req.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) return res.status(403).json({ error: "Invalid origin." });
    } catch {
      return res.status(403).json({ error: "Invalid origin." });
    }
  }
  next();
}

module.exports = { sameOrigin };
