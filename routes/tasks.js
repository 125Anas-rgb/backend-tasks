// Routes have thier own functionality and logic seperetaely and imported into mai server js

const express = require("express");

const router = express.Router();

const prisma = require("../config/db");
//creating middleware to handle errors or invalid inputs
const validate = require("../middleware/validate");
const validateU = require("../middleware/validateU");

// let tasks = [
//   {
//     id: 1,
//     title: "Learn Express",
//     completed: false,
//   },
//   {
//     id: 2,
//     title: "Build CRUD API",
//     completed: true,
//   },
// ];

// const findTask = function (reqId, res) {
//   //we will find task by its id
//   const task = tasks.find((task) => task.id === reqId);
//   return task;
// };

router.get("/", async (req, res) => {
  try {
    //refers to tasks
    const where = {};

    if (req.query.completed !== undefined) {
      where.completed = req.query.completed === "true";
    }

    // findMany Give me multiple records from the Task table.
    const tasks = await prisma.task.findMany({
      where,
    });
    res.status(200).json(tasks);
  } catch (error) {
    console.log("Error fetching tasks", error);

    res.status(500).json({
      error: "Failed to fetch tasks",
    });
  }
});

//CRUD OPERATIONS

// let taskId = 3;

//CREATE
//Adding middleware validate in middle
router.post("/", validate, async (req, res) => {
  //creating new object
  // const newTask = {
  //   id: taskId++, //auto increses
  //   title: req.body.title,
  //   completed: false, // by default
  // };

  try {
    //create inserts a new row into task table
    const newTask = await prisma.task.create({
      data: {
        title: req.body.title.trim(),
        description: req.body.description,
        completed: false, // by default
      },
    });
    res.status(201).json(newTask);
  } catch (error) {
    console.error("Error Creating task:", error);
    res.status(500).json({
      error: "Failed to Create task",
    });
  }
});

//READ
router.get("/:id", async (req, res) => {
  //getting id from id parameter in route
  try {
    const reqId = Number(req.params.id);

    if (Number.isNaN(reqId))
      return res.status(400).json({
        error: "Invalid Task ID",
      });

    const task = await prisma.task.findUnique({
      where: {
        id: reqId,
      },
    });

    if (!task) {
      return res.status(404).json({ message: "task Not found" });
    }
    res.status(200).json(task);
  } catch (error) {
    console.error("Error fetching task:", error);

    res.status(500).json({
      error: "Failed to fetch task",
    });
  }
});

//UPDATE
//put means find existing resource and update it
router.put("/:id", validateU, async (req, res) => {
  //getting id from id parameter in route
  try {
    const reqId = Number(req.params.id);

    if (Number.isNaN(reqId))
      return res.status(404).json({
        error: "Invalid Task Id",
      });

    const task = await prisma.task.findUnique({
      where: {
        id: reqId,
      },
    });

    // if task doesn't exist
    if (!task) {
      return res.status(404).json({
        error: "Task Not Found",
      });
    }

    const data = {};

    if (req.body.title !== undefined) {
      data.title = req.body.title.trim();
    }

    if (req.body.description !== undefined) {
      data.description = req.body.description;
    }

    if (req.body.completed !== undefined) {
      data.completed = req.body.completed;
    }

    const updatedTask = await prisma.task.update({
      where: {
        id: reqId,
      },
      data,
    });

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Error fetching task:", error);

    res.status(500).json({
      error: "Failed to fetch task",
    });
  }
});

router.delete("/:id", async (req, res) => {
  //getting id from id parameter in route
  try {
    const reqId = Number(req.params.id);

    if (Number.isNaN(reqId)) {
      return res.status(400).json({
        error: "Invalid task ID",
      });
    }

    const task = await prisma.task.findUnique({
      where: {
        id: reqId,
      },
    });

    if (!task) return res.status(404).json({ message: "task Not found" });

    await prisma.task.delete({
      where: {
        id: reqId,
      },
    });

    res.status(200).json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting task:", error);

    res.status(500).json({
      error: "Failed to delete task",
    });
  }
});

module.exports = router;
