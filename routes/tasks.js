// Routes have thier own functionality and logic seperetaely and imported into mai server js

const express = require("express");

const router = express.Router();

const prisma = require("../config/db");
//creating middleware to handle errors or invalid inputs
const validate = require("../middleware/validate");
const validateU = require("../middleware/validateU");
const upload = require("../middleware/upload");
const auth = require("../middleware/auth");
const path = require("path");

const fs = require("node:fs/promises");

router.get("/", async (req, res) => {
  try {
    //refers to tasks
    //creating empty js object
    //where is req.body
    const where = {
      userId: req.user.userId,
    };

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

//CREATE
//Adding middleware validate in middle
router.post("/", validate, async (req, res) => {
  try {
    //create inserts a new row into task table
    const newTask = await prisma.task.create({
      //data means Create a new row in the Task table using these values.
      data: {
        title: req.body.title.trim(),
        description: req.body.description,
        completed: false, // by default
        userId: req.user.userId,
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
      //prisma API property where and data
      where: {
        id: reqId,
      },
    });

    if (!task) {
      return res.status(404).json({ message: "task Not found" });
    }
    if (task.userId !== req.user.userId) {
      return res.status(403).json({
        message: "You are not allowed to access this task",
      });
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
      return res.status(400).json({
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

    //authorize
    if (task.userId !== req.user.userId) {
      return res.status(403).json({
        message: "You are not allowed to modify this task",
      });
    }

    //empty object
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

    //authorize
    if (task.userId !== req.user.userId) {
      return res.status(403).json({
        message: "You are not allowed to delete this task",
      });
    }

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

router.post(
  "/:id/attachments",
  auth,
  (req, res, next) => {
    //expects 1 file and form-data must be file
    upload.single("file")(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          error: err.message,
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      //from parameter
      const taskId = req.params.id;

      //finds user
      const task = await prisma.task.findFirst({
        where: {
          id: Number(taskId),
          userId: req.user.userId,
        },
      });

      if (!task) {
        return res.status(403).json({
          error: "Task not found or you do not own this task",
        });
      }
      if (!req.file) {
        return res.status(400).json({
          error: "File is required",
        });
      }

      //creating an attachment(if file is 1 and is valid)
      const attachment = await prisma.taskAttachment.create({
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          path: req.file.path,
          taskId: Number(taskId),
          userId: req.user.userId,
        },
      });

      res.status(201).json({
        message: "File uploaded successfully",
        attachment: {
          id: attachment.id,
          filename: attachment.filename,
          originalName: attachment.originalName,
          mimeType: attachment.mimeType,
          size: attachment.size,
          path: attachment.path,
          url: `/uploads/${attachment.filename}`,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: "Failed to upload file",
      });
    }
  },
);

router.get("/:id/attachments", auth, async (req, res) => {
  try {
    const taskId = req.params.id;

    const task = await prisma.task.findFirst({
      where: {
        id: Number(taskId),
        userId: req.user.userId,
      },
    });

    if (!task) {
      return res.status(403).json({
        error: "Task not found or you do not own this task",
      });
    }

    const attachments = await prisma.taskAttachment.findMany({
      where: {
        taskId: Number(taskId),
        userId: req.user.userId,
      },
      //making newest items appear first
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!attachments) {
      return res.status(403).json({
        error: "Attachment not found or you do not own this attachment",
      });
    }

    const result = attachments.map((attachment) => ({
      ...attachment,
      url: `/uploads/${attachment.filename}`,
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to fetch attachments",
    });
  }
});

router.delete("/:id/attachments/:attachmentId", auth, async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const attachmentId = req.params.attachmentId;
    const attachment = await prisma.taskAttachment.findFirst({
      where: {
        id: attachmentId,
        taskId: Number(taskId),
        userId: req.user.userId,
      },
    });
    if (!attachment) {
      return res.status(404).json({
        error: "Attachment not found",
      });
    }

    //delets the file from computer
    await fs.unlink(path.resolve(attachment.path));

    //deletes db record of that file
    await prisma.taskAttachment.delete({
      where: {
        id: attachmentId,
      },
    });

    res.status(200).json({
      message: "Attachment deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to delete attachment",
    });
  }
});

module.exports = router;
