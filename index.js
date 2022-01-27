import express, { json } from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dayjs from "dayjs";
import "dayjs/locale/pt-br.js";
import dotenv from "dotenv";
dotenv.config();

const server = express();
server.use(json());
server.use(cors());

server.listen(5000, () => console.log("Server online!"));

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
    res.status(201).send(participantName);
    mongoClient.close();
  } catch (error) {
    res.send("deu problema aqui ó");
    mongoClient.close();
  }
});

server.get("/participants", async (req, res) => {
  const mongoClient = new MongoClient(process.env.MONGO_URI);

  try {
    await mongoClient.connect();
    const participants = await mongoClient
      .db("uol-chat")
      .collection("participants")
      .find({})
      .toArray();
    res.status(200).send(participants);
    mongoClient.close();
  } catch (error) {
    res.send("deu problema aqui ó");
    mongoClient.close();
  }
});

server.post("/messages", async (req, res) => {
  const mongoClient = new MongoClient(process.env.MONGO_URI);

  try {
    await mongoClient.connect();
    const message = await mongoClient
      .db("uol-chat")
      .collection("messages")
      .insertOne({
        from: req.headers.user,
        to: req.body.to,
        text: req.body.text,
        type: req.body.type,
        time: `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`,
      });
    res.status(200).send(message);
    mongoClient.close();
  } catch (error) {
    res.status(400).send("deu problema aqui no post/messages");
  }
});

server.get("/messages", async (req, res) => {
  const mongoClient = new MongoClient(process.env.MONGO_URI);

  try {
    await mongoClient.connect();
    const messages = await mongoClient
      .db("uol-chat")
      .collection("messages")
      .find({})
      .toArray();

    const filteredMessages = messages.filter(
      (msg) =>
        (msg.type === "private_message" && msg.to === req.headers.user) ||
        msg.from === req.headers.user ||
        msg.to === "Todos" ||
        msg.type === "message"
    );

    if (req.query.limit) {
      res.status(200).send(filteredMessages.slice(-req.query.limit));
    } else {
        res.status(200).send(filteredMessages);
    }

    mongoClient.close();
  } catch (error) {
    res.status(400).send("deu erro aqui no get/messages");
    mongoClient.close();
  }
});
