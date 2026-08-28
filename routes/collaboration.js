const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { checkNotePermission } = require("../middleware/permission");
const { checkCollaboratorQuota } = require("../middleware/tierGuard");
const prisma = require("../config/db");

//the owner user shares their note with other user and givnig thier role
router.post(
  "/:id/collaborators",
  auth,
  checkNotePermission("OWNER"),
  checkCollaboratorQuota,
  async (req, res) => {
    try {
      //owner gives the sharing user mail and role
      const { email, role } = req.body;

      //validates role to include only the following
      if (!["VIEWER", "EDITOR"].includes(role)) {
        return res.status(400).json({
          error: "Role must be VIEWER or EDITOR",
        });
      }

      //finds user by email given..
      const user = await prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (!user) {
        return res.status(404).json({
          error: "User not found",
        });
      }

      // Get the task id from paramter
      const task = await prisma.task.findUnique({
        where: {
          id: Number(req.params.id),
        },
        select: {
          userId: true,
        },
      });

      //checks if the entered user id is same as userId in task
      if (user.id === task.userId) {
        return res.status(400).json({
          error: "Task owner cannot be added as a collaborator",
        });
      }

      //checks if user is already a collabortor of this task
      const existingCollaborator = await prisma.noteCollaborator.findUnique({
        where: {
          taskId_userId: {
            taskId: Number(req.params.id),
            userId: user.id,
          },
        },
      });

      if (existingCollaborator) {
        return res.status(400).json({
          error: "User is already a collaborator",
        });
      }

      //assigning role to collaborator
      const collaborator = await prisma.noteCollaborator.create({
        data: {
          taskId: Number(req.params.id),
          userId: user.id,
          role,
        },
      });

      return res.status(201).json({
        message: "Collaborator added successfully",
        collaborator,
      });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to add collaborator",
      });
    }
  },
);

router.get(
  "/:id/collaborators",
  auth,
  checkNotePermission("VIEWER"),
  async (req, res) => {
    try {
      console.log("running");
      const taskId = Number(req.params.id);
      //finding the owner the requested task
      const owner = await prisma.task.findUnique({
        where: {
          id: taskId,
        },
        select: {
          //selecting user relation from task
          //we need owner info thats why
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      //finding collaborators with the requested task
      const collaboraters = await prisma.noteCollaborator.findMany({
        where: {
          taskId,
        },
        select: {
          role: true,
          userId: true,
          //needs user info so selecting email
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      return res.status(200).json({
        owner,
        collaboraters,
      });
    } catch {
      return res.status(500).json({
        error: "Failed to get collaborators",
      });
    }
  },
);

router.patch(
  "/:id/collaborators/:userId",
  auth,
  checkNotePermission("OWNER"),
  async (req, res) => {
    try {
      const taskId = Number(req.params.id);
      const userId = Number(req.params.userId);

      const { role } = req.body;

      if (!["VIEWER", "EDITOR"].includes(role)) {
        return res.status(400).json({
          error: "Role must be VIEWER or EDITOR",
        });
      }

      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });
      if (!user) {
        return res.status(404).json({
          error: "User not found",
        });
      }

      const collaborator = await prisma.noteCollaborator.findUnique({
        where: {
          //prisma generated this name from @@unique([noteId, userId])
          taskId_userId: {
            taskId,
            userId,
          },
        },
        select: {
          role: true,
        },
      });

      if (!collaborator) {
        return res.status(404).json({
          error: "Collaborator not found",
        });
      }

      const newRole = await prisma.noteCollaborator.update({
        where: {
          //prisma generated this name from @@unique([noteId, userId])
          taskId_userId: {
            taskId,
            userId,
          },
        },
        data: {
          role,
        },
      });

      return res.status(200).json({
        newRole,
      });
    } catch {
      return res.status(500).json({
        error: "Failed to update collaborator",
      });
    }
  },
);

router.delete("/:id/collaborators/:userId", auth, async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const userId = Number(req.params.userId);

    const task = await prisma.task.findUnique({
      where: {
        id: taskId,
      },
      select: {
        userId: true,
      },
    });

    if (!task) {
      return res.status(404).json({
        error: "Note not found",
      });
    }

    // Checks if requester is owner
    const isOwner = task.userId === req.user.userId;

    // Checks if requester is removing themselves
    const isSelf = req.user.userId === userId;

    if (!isOwner && !isSelf) {
      return res.status(403).json({
        error: "You do not have permission to remove this collaborator",
      });
    }

    const collaborator = await prisma.noteCollaborator.findUnique({
      where: {
        //prisma generated this name from @@unique([noteId, userId])
        taskId_userId: {
          taskId: taskId,
          userId,
        },
      },
    });

    if (!collaborator) {
      return res.status(404).json({
        error: "Collaborator not found",
      });
    }

    const deleteCollaborator = await prisma.noteCollaborator.delete({
      where: {
        taskId_userId: {
          taskId: taskId,
          userId,
        },
      },
    });

    return res.status(200).json({
      message: "Collaborator deleted successfully",
      deleteCollaborator,
    });
  } catch {
    return res.status(500).json({
      error: "Failed to remove collaborator",
    });
  }
});

module.exports = router;
