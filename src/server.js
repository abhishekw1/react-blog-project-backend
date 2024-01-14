import fs from "fs";
import path from 'path';
import admin from "firebase-admin";
import express from "express";
import { db, connectToDB } from "./db.js";
import "dotenv/config";
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const credentials = JSON.parse(
    fs.readFileSync('./credentials.json')
);
admin.initializeApp({
    credential: admin.credential.cert(credentials),
});

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../build')));

app.get(/^(?!\/api).+/, (req, res) => {
    res.sendFile(path.join(__dirname, '../build/index.html'));
})

app.use(async (req, res, next) => {
  const { authtoken } = req.headers;
  if (authtoken) {
    try {
      req.user = await admin.auth().verifyIdToken(authtoken);
    } catch (error) {
      return res.sendStatus(400);
    }
  }
  req.user = req.user || {};
  next();
});

app.get("/api/articles", async (req, res) => {
  const articles = await db
    .collection("articles")
    .find()
    .project({
      name: 1,
      upvotes: 1,
      comments: 1,
      _id: 0,
    })
    .toArray();
  if (articles) {
    res.json(articles);
  } else {
    res.status(404).send({ errorMsg: "Articles Not Found!" });
  }
});

app.get("/api/articles/:name", async (req, res) => {
  const { name } = req.params;
  const { uid } = req.user;

  const article = await db.collection("articles").findOne({ name: name });
  if (article) {
    const upvoateIds = article.upvoateIds || [];
    article.canUpvoate = uid && !upvoateIds.includes(uid);
    res.json(article);
  } else {
    res.status(404).send({ errorMsg: "Article Not Found!" });
  }
});

app.use((req, res, next) => {
  if (req.user) {
    next();
  } else {
    res.sendStatus(401);
  }
});

app.put("/api/articles/:name/upvoate", async (req, res) => {
  const { name } = req.params;
  const { uid } = req.user;
  const article = await db.collection("articles").findOne({ name: name });
  if (article) {
    const upvoateIds = article.upvoateIds || [];
    const canUpvoate = uid && !upvoateIds.includes(uid);

    if (canUpvoate) {
      await db.collection("articles").updateOne(
        { name },
        {
          $inc: { upvotes: 1 },
          $push: { upvoateIds: uid },
        }
      );
    }

    const uarticle = await db.collection("articles").findOne({ name: name });
    res.json(uarticle);
  } else {
    res.send("That article dosen't exist");
  }
});

app.post("/api/articles/:name/comments", async (req, res) => {
  const { name } = req.params;
  const { text } = req.body;
  const { email } = req.user;
  await db.collection("articles").updateOne(
    { name },
    {
      $push: { comments: { email, text } },
    }
  );

  const article = await db.collection("articles").findOne({ name: name });
  if (article) {
    res.send(article);
  } else {
    res.send("That article  dosen't exist");
  }
});

connectToDB(() => {
  console.log("Sucessfully connected to database!");
  app.listen(8000, () => {
    console.log("Server is listning on 8000");
  });
});
