const prisma = require("../config/db");

//Can own max 10 active notes
const checkNoteCreationQuota = async (req, res, next) => {
  try {
    //checks if user is PRO
    if (req.user.tier !== "FREE") {
      return next();
    }
    console.log("free");

    //Count notes count if FREE
    const noteCount = await prisma.task.count({
      where: {
        userId: req.user.userId,
        // deletedAt: null,
      },
    });
    console.log(noteCount);

    if (noteCount >= 10) {
      return res.status(403).json({
        error:
          "Free tier limit reached (10 notes max). Upgrade to Pro for unlimited notes",
      });
    }

    next();
  } catch {
    return res.status(500).json({
      error: "Failed to check note quota",
    });
  }
};

//Each note can have max 2 collaborators
const checkCollaboratorQuota = async (req, res, next) => {
  try {
    if (req.user.tier !== "FREE") {
      return next();
    }

    const taskId = Number(req.params.id);

    const collaboratorCount = await prisma.noteCollaborator.count({
      where: {
        taskId,
      },
    });

    if (collaboratorCount >= 2) {
      return res.status(403).json({
        error:
          "Free tier limit reached (2 collaborators max per note). Upgrade to Pro to add more",
      });
    }
    next();
  } catch {
    return res.status(500).json({
      error: "Failed to check note quota",
    });
  }
};

const checkFavoriteNoteQuota = async (req, res, next) => {
  try {
    if (req.user.tier !== "FREE") {
      return next();
    }

    const favoriteCount = await prisma.userFavoriteNote.count({
      where: {
        userId: req.user.userId,
      },
    });

    if (favoriteCount >= 3) {
      return res.status(403).json({
        error:
          "Free tier limit reached (max 3 Favorite notes). Upgrade to Pro to add more",
      });
    }
    next();
  } catch {
    return res.status(500).json({
      error: "Failed to check favorite note quota",
    });
  }
};

module.exports = {
  checkCollaboratorQuota,
  checkNoteCreationQuota,
  checkFavoriteNoteQuota,
};
