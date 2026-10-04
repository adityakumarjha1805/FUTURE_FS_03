import { MongoClient } from "mongodb";

async function getClient() {
    if (globalThis.mongoClientPromise) {
        return globalThis.mongoClientPromise;
    }

    const uri = process.env.MONGODB_URI ||
        (process.env.NODE_ENV !== "production" ? "mongodb://127.0.0.1:27017/forever_store" : "");

    if (!uri) {
        throw new Error("MONGODB_URI must be configured in production.");
    }

    const clientPromise = new MongoClient(uri).connect();
    globalThis.mongoClientPromise = clientPromise;

    try {
        return await clientPromise;
    } catch (error) {
        if (globalThis.mongoClientPromise === clientPromise) {
            delete globalThis.mongoClientPromise;
        }
        throw error;
    }
}

let indexesPromise;

export async function getDb() {
    const client = await getClient();
    const db = client.db();

    if (!indexesPromise) {
        indexesPromise = Promise.all([
            db.collection("users").createIndex({ email: 1 }, { unique: true }),
            db.collection("products").createIndex({ slug: 1 }, { unique: true }),
            db.collection("carts").createIndex({ userId: 1 }, { unique: true }),
            db.collection("orders").createIndex({ userId: 1, createdAt: -1 }),
            db.collection("contactMessages").createIndex({ createdAt: -1 }),
        ]);
    }

    await indexesPromise;
    return db;
}