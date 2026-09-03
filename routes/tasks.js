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

const { checkNotePermission } = require("../middleware/permission");
const { checkNoteCreationQuota } = require("../middleware/tierGuard");
const { checkFavoriteNoteQuota } = require("../middleware/tierGuard");

const fs = require("node:fs/promises");
const { error } = require("node:console");

//CRUD OPERATIONS

//CREATE
//Adding middleware validate in middle
router.post("/", auth, checkNoteCreationQuota, validate, async (req, res) => {
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
router.get("/", auth, async (req, res) => {
  //getting id from id parameter in route
  try {
    const tasks = await prisma.task.findMany({
      where: {
        // deletedAt: null,
        OR: [
          {
            userId: req.user.userId,
          },
          {
            collaborations: {
              some: {
                userId: req.user.userId,
              },
            },
          },
        ],
      },

      include: {
        collaborations: {
          select: {
            userId: true,
            role: true,
          },
        },
        favoriteNotes: {
          where: {
            userId: req.user.userId,
          },
          select: {
            userId: true,
          },
        },
      },
    });
    console.log("Logged-in user:", req.user.userId);

    const collaborations = await prisma.noteCollaborator.findMany({
      where: {
        userId: req.user.userId,
      },
    });

    console.log("My collaborations:", collaborations);

    const tasksWithPermissions = tasks.map((task) => {
      let userRole;

      if (task.userId === req.user.userId) {
        userRole = "OWNER";
      } else {
        const collaborator = task.collaborations.find(
          (c) => c.userId === req.user.userId,
        );

        userRole = collaborator.role;
      }

      return {
        ...task,
        userRole,
        isFavorite: task.favoriteNotes.length > 0,
      };
    });

    return res.status(200).json(tasksWithPermissions);
  } catch (error) {
    console.error("Error fetching notes:", error);

    return res.status(500).json({
      error: "Failed to fetch notes",
    });
  }
});

//UPDATE
//put means find existing resource and update it
router.put(
  "/:id",
  auth,
  checkNotePermission("EDITOR"),
  validateU,
  async (req, res) => {
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
  },
);

router.delete("/:id", auth, checkNotePermission("OWNER"), async (req, res) => {
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
    res.status(500).json({
      error: "Failed to delete task",
    });
  }
});

router.post(
  "/:id/favorite",
  auth,
  checkNotePermission("VIEWER"),
  checkFavoriteNoteQuota,
  async (req, res) => {
    try {
      const taskId = Number(req.params.id);

      if (Number.isNaN(taskId)) {
        return res.status(400).json({
          error: "Invalid task ID",
        });
      }

      const task = await prisma.task.findUnique({
        where: {
          id: taskId,
        },
      });
      if (!task) return res.status(404).json({ message: "task Not found" });

      const existingFavorite = await prisma.userFavoriteNote.findUnique({
        where: {
          taskId_userId: {
            userId: req.user.userId,
            taskId,
          },
        },
      });

      if (existingFavorite) {
        return res.status(400).json({
          error: "Task already exists in favorites",
        });
      }

      const favorite = await prisma.userFavoriteNote.create({
        data: {
          taskId,
          userId: req.user.userId,
        },
      });

      return res.status(201).json({
        message: "Task added to favorites",
        favorite,
      });
    } catch (error) {
      console.error("FAVORITE ERROR:", error);
      res.status(500).json({
        error: "Failed to add task to favorites",
      });
    }
  },
);

router.get("/favorites", auth, async (req, res) => {
  try {
    const favorites = await prisma.userFavoriteNote.findMany({
      where: {
        userId: req.user.userId,
      },
      include: {
        task: true,
      },
    });
    return res.status(200).json(favorites);
  } catch (error) {
    console.error(error)
    res.status(500).json({

      error: "Failed to get favorite tasks",
    });
  }
});

router.delete("/:id/favorite", auth, async (req, res) => {
  try {
    const taskId = Number(req.params.id);

    if (Number.isNaN(taskId)) {
      return res.status(400).json({
        error: "Invalid task ID",
      });
    }

    const favoriteTask = await prisma.userFavoriteNote.findUnique({
      where: {
        taskId_userId: {
          userId: req.user.userId,
          taskId,
        },
      },
    });
    if (!favoriteTask)
      return res.status(404).json({ message: "task Not found" });

    await prisma.userFavoriteNote.delete({
      where: {
        taskId_userId: {
          userId: req.user.userId,
          taskId,
        },
      },
    });
    return res.status(200).json({
      message: "Task removed from favorites",
    });
  } catch (error) {
    console.error("FAVORITE ERROR:", error);
    res.status(500).json({
      error: "Failed to delete task from favorites",
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
      return res.status(404).json({
        error: "Task not found",
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
    res.status(500).json({
      error: "Failed to fetch attachments",
    });
  }
});

router.get("/attachments/:attachmentId/file", auth, async (req, res) => {
  try {
    const attachmentId = req.params.attachmentId;
    console.log(attachmentId)

    const attachment = await prisma.taskAttachment.findFirst({
      where: {
        id: attachmentId,
        userId: req.user.userId,
      },
    });
    console.log(attachment)

    if (!attachment) {
      return res.status(404).json({
        error: "Attachment not found",
      });
    }
    const filePath = path.join(__dirname, "..", "uploads", attachment.filename);
    console.log("Trying to send:", filePath);
    res.sendFile(filePath);

  } catch (error) {
    res.status(500).json({
      error: "Failed to access file",
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

    const filePath = path.resolve(attachment.filename);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      //ENOENT means No such file or directory
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

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
    res.status(500).json({
      error: "Failed to delete attachment",
    });
  }
});

module.exports = router;
