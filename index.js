import dotenv from "dotenv";
import express, { json } from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
dotenv.config();

const server = express();
server.use(json());
server.use(cors());

server.listen(5000, () => {
    console.log("Rodando servidor na porta 5000.")
});


