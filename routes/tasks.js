// Routes have thier own functionality and logic seperetaely and imported into mai server js

const express = require("express");

const router = express.Router();

const validate = require("../middleware/validate");

let tasks = [
  {
    id: 1,
    title: "Learn Express",
    completed: false,
  },
  {
    id: 2,
    title: "Build CRUD API",
    completed: true,
  },
];

const findTask = function (reqId, res) {
  //we will find task by its id
  const task = tasks.find((task) => task.id === reqId);

  //if task id doesnt exist
  if (!task)
    return res.status(404).json({
      error: "Id not found",
    });
};

router.get("/", (req, res) => {
  let filteredTasks = tasks;
  //first it checks if there exists a query
  if (req.query.completed) {
    //shows only completed tasks
    filteredTasks = tasks.filter(
      (task) => task.completed === (req.query.completed === "true"),
    );
  }
  res.json(filteredTasks);
});

//CRUD OPERATIONS

//CREATE
//Adding middleware validate in middle
router.post("/", validate, (req, res) => {
  //creating new object
  const newTask = {
    id: tasks.length + 1, //auto increses
    title: req.body.title,
    completed: false, // by default
  };

  //adding into object array
  tasks.push(newTask);

  //shows new task
  res.status(201).json(newTask);
});

//READ
router.get("/:id", (req, res) => {
  //getting id from id parameter in route
  const reqId = Number(req.params.id);

  findTask(reqId, res);

  res.send(`Found User with ID ${reqId}`);
});

//UPDATE
//put means find existing resource and update it
router.put("/:id", validate, (req, res) => {
  //getting id from id parameter in route
  const reqId = Number(req.params.id);

  findTask(reqId, res);

  //checks if there is title written in body
  if (req.body.title) {
    //getting new title from req body
    id.title = req.body.title;
  }

  //checks if there is compeletely written in body
  //bcs its booolean so we write undefined..else false would not run
  if (req.body.completed !== undefined) {
    id.completed = req.body.completed;
  }
  res.json(id);
});

router.delete("/:id", (req, res) => {
  //getting id from id parameter in route
  const reqId = Number(req.params.id);

  findTask(reqId, res);

  tasks = tasks.filter((task) => task.id !== reqId);

  res.status(200).json({
    message: "Task deleted successfully",
  });
});

module.exports = router;
