import { MongoClient } from "mongodb";

const globalForMongo = globalThis as unknown as {
  __mongoClient?: MongoClient;
};

export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!globalForMongo.__mongoClient) {
    const client = new MongoClient(uri);
    try {
      await client.connect();
    } catch (e) {
      // Don't cache a broken client: drop it so the next request retries.
      process.stdout.write(
        JSON.stringify({
          level: "error",
          timestamp: new Date().toISOString(),
          message: "MongoDB connect failed",
          error: e instanceof Error ? { name: e.name, message: e.message } : String(e),
        }) + "\n"
      );
      throw e;
    }
    globalForMongo.__mongoClient = client;
  }
  const dbName = process.env.MONGODB_DB || "insightt_test";
  return globalForMongo.__mongoClient.db(dbName);
}

export function getTasksCollection() {
  return getDb().then((db) => db.collection("tasks"));
}

// Called when the cached client's topology has died (e.g. idle serverless
// instance) so the next request builds a fresh client instead of failing.
export function resetMongoClient() {
  globalForMongo.__mongoClient = undefined;
}

export function getUsersCollection() {
  return getDb().then((db) => db.collection("users"));
}
