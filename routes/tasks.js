// Routes have thier own functionality and logic seperetaely and imported into mai server js

const express = require("express");

const router = express.Router();

//creating middleware to handle errors or invalid inputs
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
  return task;
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
  //sending resource response back in json
  res.json(filteredTasks);
});

//CRUD OPERATIONS

let taskId = 3;

//CREATE
//Adding middleware validate in middle
router.post("/", validate, (req, res) => {
  //creating new object
  const newTask = {
    id: taskId++, //auto increses
    title: req.body.title,
    completed: false, // by default
  };

  //because sir if we delete an id the other id with higher number remains same and new id will continue the numbering of array like if we delete id 2 then new id would be 3 not 4..so duplicate ids would be produced

  //adding into object array
  tasks.push(newTask);

  //shows new task
  res.status(201).json(newTask);
});

//READ
router.get("/:id", (req, res) => {
  //getting id from id parameter in route
  const reqId = Number(req.params.id);

  const task = findTask(reqId);

  if (!task)
    return res.status(404).json({
      message: "Task Not Found",
    });

  res.status(200).json(task);
});

//UPDATE
//put means find existing resource and update it
router.put("/:id", validate, (req, res) => {
  //getting id from id parameter in route
  const reqId = Number(req.params.id);

  // finding task
  const task = findTask(reqId);

  // if task doesn't exist
  if (!task) {
    return res.status(404).json({
      error: "Task Not Found",
    });
  }

  if (req.body.title) task.title = req.body.title;
  if (
    req.body.completed !== undefined &&
    typeof req.body.completed !== "boolean"
  ) {
    return res.status(400).json({
      error: "completed must be a boolean (true or false)",
    });
  }
  task.completed = req.body.completed;

  res.status(200).json(task);
});

router.delete("/:id", (req, res) => {
  //getting id from id parameter in route
  const reqId = Number(req.params.id);

  const task = findTask(reqId);

  if (!task) return res.status(404).json({ message: "task Not found" });

  tasks = tasks.filter((task) => task.id !== reqId);

  res.status(200).json({
    message: "Task deleted successfully",
  });
});

module.exports = router;
