// Prisma is an open-source Object-Relational Mapper (ORM) to manage and interact databases inside Node.js. Instead of writing raw SQL queries, you use Prisma's plain JavaScript to perform database actions like reading, creating, and updating data.

//db.js is responsible for creating the connection between your Node.js application and PostgreSQL through Prisma.

//loads .env file (helps node reads .env)
//dotenv tells Read the .env file and put its values into process.env
require("dotenv").config();

// it is a database API for Prisma's database operations
// enable js code methods like findMany(),create(),update(),delete()
// enable writing querires , replace writing queries manually
const { PrismaClient } = require("../generated/prisma");

//gets the pg
const { PrismaPg } = require("@prisma/adapter-pg");

//using pg (node-postgres database driver)
//prismaPg is an adapter that connects Prisma's client to PostgreSQL database through pg.
//means "Prisma, use PostgreSQL and connect using this database URL."
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

//creating an instance of prismaClient
//prisma object is what your routes actually use.
const prisma = new PrismaClient({
  adapter,
});

module.exports = prisma;
