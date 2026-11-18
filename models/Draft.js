const { randomUUID } = require("node:crypto");
const { insertRecord, listRecords, deleteRecord } = require("../config/database");
const table = "drafts";

module.exports = {
  create({ ownerId, pageId, pageName, content }) {
    return insertRecord(table, { id: randomUUID(), ownerId, pageId, pageName, content, status: "draft", createdAt: new Date().toISOString() });
  },
  list(ownerId) { return listRecords(table, ownerId); },
  remove(id, ownerId) { return deleteRecord(table, id, ownerId); },
};
