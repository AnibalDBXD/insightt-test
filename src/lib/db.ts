import { MongoClient } from "mongodb";

const globalForMongo = globalThis as unknown as {
  __mongoClient?: MongoClient;
};

export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!globalForMongo.__mongoClient) {
    globalForMongo.__mongoClient = new MongoClient(uri);
    await globalForMongo.__mongoClient.connect();
  }
  const dbName = process.env.MONGODB_DB || "insightt_test";
  return globalForMongo.__mongoClient.db(dbName);
}

export function getTasksCollection() {
  return getDb().then((db) => db.collection("tasks"));
}

export function getUsersCollection() {
  return getDb().then((db) => db.collection("users"));
}
