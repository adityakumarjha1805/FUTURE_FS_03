import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/forever_store";
const clientPromise = globalThis.mongoClientPromise || new MongoClient(uri).connect();

if (process.env.NODE_ENV !== "production") {
    globalThis.mongoClientPromise = clientPromise;
}

let indexesPromise;

export async function getDb() {
    const client = await clientPromise;
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