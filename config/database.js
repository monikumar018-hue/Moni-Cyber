const fs = require("node:fs/promises");
const path = require("node:path");

const dataFile = path.join(__dirname, "..", "data", "database.json");
const emptyDatabase = { drafts: [], scheduledPosts: [], activityLogs: [] };
let writeQueue = Promise.resolve();

async function initDatabase() {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  try {
    await fs.access(dataFile);
    await readDatabase();
  } catch {
    await fs.writeFile(dataFile, JSON.stringify(emptyDatabase, null, 2));
  }
}

async function readDatabase() {
  try {
    const contents = await fs.readFile(dataFile, "utf8");
    const parsed = JSON.parse(contents);
    return { ...emptyDatabase, ...parsed };
  } catch (error) {
    if (error.code === "ENOENT") return { ...emptyDatabase };
    throw error;
  }
}

function writeDatabase(database) {
  writeQueue = writeQueue.then(() => fs.writeFile(dataFile, JSON.stringify(database, null, 2)));
  return writeQueue;
}

async function listRecords(table, ownerId) {
  const db = await readDatabase();
  return db[table].filter((record) => record.ownerId === ownerId);
}

async function insertRecord(table, record) {
  const db = await readDatabase();
  db[table].push(record);
  await writeDatabase(db);
  return record;
}

async function deleteRecord(table, id, ownerId) {
  const db = await readDatabase();
  const before = db[table].length;
  db[table] = db[table].filter((record) => !(record.id === id && record.ownerId === ownerId));
  if (db[table].length === before) return false;
  await writeDatabase(db);
  return true;
}

async function updateRecord(table, id, ownerId, changes) {
  const db = await readDatabase();
  const record = db[table].find((item) => item.id === id && item.ownerId === ownerId);
  if (!record) return null;
  Object.assign(record, changes);
  await writeDatabase(db);
  return record;
}

module.exports = { initDatabase, listRecords, insertRecord, deleteRecord, updateRecord };
