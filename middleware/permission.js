const prisma = require("../config/db");

const roleHierarchy = {
  VIEWER: 1,
  EDITOR: 2,
  OWNER: 3,
};

const checkNotePermission = (requiredRole) => {
  return async (req, res, next) => {
    try {
      console.log("start");
      const taskId = Number(req.params.id);
      console.log(taskId);

      if (Number.isNaN(taskId)) {
        return res.status(400).json({
          error: "Invalid task ID",
        });
      }
      console.log("running");
      //finding task from taskId
      const task = await prisma.task.findUnique({
        where: {
          id: taskId,
        },
        //means only include this field
        select: {
          userId: true,
        },
      });
      console.log("running");

      if (!task) {
        return res.status(404).json({
          error: "Task not found",
        });
      }

      //validating if user owns this task
      if (task.userId === req.user.userId) {
        req.noteRole = "OWNER";
        //if no..then checking its role
      } else {
        const collaborator = await prisma.noteCollaborator.findUnique({
          where: {
            //checks if this user have a collab record for this task
            taskId_userId: {
              taskId: taskId,
              userId: req.user.userId,
            },
          },
          //means only include this field
          select: {
            role: true,
          },
        });

        if (!collaborator) {
          return res.status(403).json({
            error: "You do not have permission to access this task",
          });
        }
        req.noteRole = collaborator.role;

        if (roleHierarchy[req.noteRole] < roleHierarchy[requiredRole]) {
          return res.status(403).json({
            error: "Insufficient permissions",
          });
        }
        console.log("permision");
      }
      next();
    } catch {
      return res.status(500).json({
        error: "Failed to check permissions",
      });
    }
  };
};

module.exports = {
  checkNotePermission,
};
