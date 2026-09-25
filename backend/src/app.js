import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import dns from "node:dns";
import { connect } from "node:net";
import connectToSocketIO from "./controllers/soketManager.js";
import userRoutes from "./routes/users.routes.js";


dotenv.config();

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const app = express();
const server = createServer(app);
const io = connectToSocketIO(server);

app.set("port", process.env.PORT || 5000);
app.use(cors());
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ limit: "50kb", extended: true }));

app.use("/api/v1/users", userRoutes);

// Home route
app.get("/", (req, res) => {
    res.send("Video Conferencing Server is Running!");
});

const start = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB connected successfully");

        server.listen(app.get("port"), () => {
            console.log(`Server is running on port ${app.get("port")}`);
        });

    } catch (error) {
        console.error("MongoDB connection failed:");
        console.error(error.message);
    }
};

start();