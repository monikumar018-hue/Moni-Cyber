const { graphGet } = require("./metaGraph");

async function getPageInsights(page) {
  if (!page?.id || !page?.token) throw new Error("No authorized Page selected.");
  const metrics = "page_impressions,page_engaged_users,page_post_engagements";
  const data = await graphGet(`${encodeURIComponent(page.id)}/insights?metric=${metrics}&period=day`, page.token);
  return data.data || [];
}

module.exports = { getPageInsights };
