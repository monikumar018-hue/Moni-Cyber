const { randomUUID } = require("node:crypto");
const { insertRecord, listRecords, deleteRecord, updateRecord } = require("../config/database");
const table = "scheduledPosts";

module.exports = {
  create({ ownerId, pageId, pageName, content, scheduledAt }) {
    return insertRecord(table, { id: randomUUID(), ownerId, pageId, pageName, content, scheduledAt, status: "scheduled", createdAt: new Date().toISOString() });
  },
  list(ownerId) { return listRecords(table, ownerId); },
  remove(id, ownerId) { return deleteRecord(table, id, ownerId); },
  update(id, ownerId, changes) { return updateRecord(table, id, ownerId, changes); },
};
