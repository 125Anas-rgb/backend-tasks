Task Management API

A RESTful task management API built with Node.js, Express, PostgreSQL, and Prisma. The API supports authentication, task management, soft deletion, collaboration with role-based permissions, subscription tiers, and favorite tasks.

Tech Stack
Node.js
Express.js
PostgreSQL
Prisma ORM
JWT Authentication
bcrypt
Nodemailer
Multer

## Task 8 — Tiers, Collaboration & Favorites

Implemented task collaboration, role-based permissions, user tiers, quotas, and favorites.

### Features

- Added `FREE` and `PRO` user tiers.
- Added collaboration with `VIEWER` and `EDITOR` roles.
- Added permission middleware for `VIEWER`, `EDITOR`, and `OWNER`.
- Added FREE-tier limits:
  - 10 tasks
  - 2 collaborators per task
  - 3 favorite tasks

- Added collaborator management:
  - Add
  - View
  - Update role
  - Remove

- Added favorite functionality:
  - Add favorite
  - View favorites
  - Remove favorite

- Updated task listing to return `userRole` and `isFavorite`.
- Restricted task updates/deletions based on collaborator permissions.
