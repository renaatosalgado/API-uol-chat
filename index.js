import express, { json } from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const server = express();
server.use(json());
server.use(cors());

server.listen(5000);

server.post("/participants", async (req, res) => {
  const mongoClient = new MongoClient(process.env.MONGO_URI);

  try {
    await mongoClient.connect();
    const participantName = await mongoClient
      .db("uol-chat")
      .collection("participants")
      .insertOne({
        name: req.body.name,
        lastStatus: Date.now(),
      });
    res.status(200).send(participantName);
    mongoClient.close();
  } catch (error) {
    res.send("deu problema aqui ó");
    mongoClient.close();
  }
});


