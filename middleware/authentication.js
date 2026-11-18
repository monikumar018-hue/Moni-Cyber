function requireMeta(req, res, next) {
  if (!req.session.userAccessToken) return res.status(401).json({ error: "Please connect your Meta account first." });
  next();
}

function requirePage(req, res, next) {
  if (!req.session.selectedPage) return res.status(403).json({ error: "Please select a Facebook Page first." });
  next();
}

module.exports = { requireMeta, requirePage };
