import express, { json } from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dayjs from "dayjs";
import "dayjs/locale/pt-br.js";
import joi from "joi";
import dotenv from "dotenv";
dotenv.config();

const server = express();
server.use(json());
server.use(cors());

server.listen(5000, () => console.log("Server online!"));

const nameSchema = joi.object({
  name: joi.string().required(),
});

const messageSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.string().required(),
  from: joi.string().required(),
});

server.post("/participants", async (req, res) => {
  const mongoClient = new MongoClient(process.env.MONGO_URI);

  const validation = nameSchema.validate(req.body, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);

    res.status(422).send(errors);
    return;
  }

  try {
    await mongoClient.connect();

    const participants = await mongoClient
      .db("uol-chat")
      .collection("participants")
      .find({})
      .toArray();

    const hasUser = participants.find(
      (user) => user.name.toLowerCase() === req.body.name.toLowerCase()
    );

    if (hasUser) {
      res.sendStatus(409);
      mongoClient.close();
      return;
    }

    await mongoClient.db("uol-chat").collection("participants").insertOne({
      name: req.body.name,
      lastStatus: Date.now(),
    });

    await mongoClient
      .db("uol-chat")
      .collection("messages")
      .insertOne({
        from: req.body.name,
        to: "Todos",
        text: "entra na sala...",
        type: "status",
        time: `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`,
      });

    res.sendStatus(201);
    mongoClient.close();
  } catch (error) {
    res.status(500).send(error);
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
    res.status(500).send(error);
    mongoClient.close();
  }
});

server.post("/messages", async (req, res) => {
  const mongoClient = new MongoClient(process.env.MONGO_URI);

  const validation = messageSchema.validate(req.body, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);

    res.status(422).send(errors);
    return;
  }

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
    res.status(500).send(error);
    mongoClient.close();
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
    res.status(500).send(error);
    mongoClient.close();
  }
});

server.post("/status", async (req, res) => {
  const mongoClient = new MongoClient(process.env.MONGO_URI);

  try {
    await mongoClient.connect();

    const participants = await mongoClient
      .db("uol-chat")
      .collection("participants")
      .find({})
      .toArray();

    const user = participants.find((user) => user.name === req.headers.user);

    if (!user) {
      res.sendStatus(404);
      mongoClient.close();
    } else {
      await mongoClient
        .db("uol-chat")
        .collection("participants")
        .updateOne(
          { name: user.name },
          {
            $set: { lastStatus: Date.now() },
          }
        );
      res.sendStatus(200);
      mongoClient.close();
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

function removeOldUsers() {
  const mongoClient = new MongoClient(process.env.MONGO_URI);
  mongoClient.connect();

  setInterval(async () => {
    const participants = await mongoClient
      .db("uol-chat")
      .collection("participants")
      .find({})
      .toArray();

    const oldParticipants = participants.filter((participant) => {
      if (Date.now() - participant.lastStatus > 10000) return true;
      else return false;
    });

    for (let i = 0; i < oldParticipants.length; i++) {
      await mongoClient
        .db("uol-chat")
        .collection("participants")
        .deleteOne({ _id: new ObjectId(oldParticipants[i]._id) });

      await mongoClient
        .db("uol-chat")
        .collection("messages")
        .insertOne({
          from: oldParticipants[i].name,
          to: "Todos",
          text: "sai na sala...",
          type: "status",
          time: `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`,
        });
    }
  }, 15000);
}

removeOldUsers();
