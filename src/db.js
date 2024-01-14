import { MongoClient } from "mongodb";
let db;

async function connectToDB(cb) {
  // `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster0.1h7xhk5.mongodb.net/?retryWrites=true&w=majority`
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();
  db = client.db("react-blog-db");
  cb();
}

export { db, connectToDB };
