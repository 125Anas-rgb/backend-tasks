require("dotenv").config();

//loads express
const express = require("express");

//loads prisma
const prisma = require("./config/db");

//creates your server application object
const app = express();

const logger = require("./middleware/logger");

const auth = require("./middleware/auth");

//loading mini app with its own logic (route)
const taskRouter = require("./routes/tasks");

const authRoutes = require("./routes/auth");

//for text in json format
app.use(express.json());
app.use(logger);

//when url starts with api task (is a endpoint) or (route), send the rest to this router
//
app.use("/api/tasks", auth, taskRouter);
app.use("/api/auth", authRoutes);

//setting port the server will run on
const PORT = process.env.PORT || 5000;

app.get("/", logger, (req, res) => {
  res.send("Hey there");
});

async function startServer() {
  try {
    await prisma.$connect();

    console.log("Database connected successfully!");

    app.listen(PORT, () => {
      console.log(`Server running on ${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error);
  }
}

startServer();
