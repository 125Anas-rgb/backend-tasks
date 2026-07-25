//loads express
const express = require("express");

//creates your server application object
const app = express();

//
const logger = require("./middleware/logger");

//loading mini app with its own logic (route)
const taskRouter = require("./routes/tasks");

//for text in json format
app.use(express.json());
app.use(logger);

//when url starts with api task, send the rest to this router
app.use("/api/tasks", taskRouter);

//setting port the server will run on
const PORT = 5000;

app.get("/", logger, (req, res) => {
  res.send("Hey niga");
  console.log("Welcome");
});

// app.get("/api/status", (req, res) => {
//   res.json({
//     status: "Server is running",
//     success: true,
//   });
// });

// app.get("/api/tasks", (req, res) => {
//   const tasks = [
//     {
//       id: 1,
//       title: "Learn Node.js",
//       completed: false,
//     },

//     {
//       id: 2,
//       title: "Build Express API",
//       completed: true,
//     },
//   ];
//   res.json(tasks);
// });

// app.get("/api/tasks", (req, res) => {
//   console.log(req.query);
// });

// app.post("/api/tasks", (req, res) => {
//   //req.body means getting data
//   const newTask = req.body;
//   console.log(newTask);

//   res.json({ message: "Task received", task: newTask });
// });

app.listen(PORT, () => {
  console.log("Server running on 5000");
});
