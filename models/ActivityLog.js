const { randomUUID } = require("node:crypto");
const { insertRecord, listRecords } = require("../config/database");

module.exports = {
  add({ ownerId, action, details = {} }) {
    return insertRecord("activityLogs", { id: randomUUID(), ownerId, action, details, createdAt: new Date().toISOString() });
  },
  list(ownerId) { return listRecords("activityLogs", ownerId); },
};
