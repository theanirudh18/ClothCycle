import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export const db = mysql.createPool({
  host: process.env.DB_HOST,        // localhost
  user: process.env.DB_USER,        // root
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,    // clothcycle
  port: process.env.DB_PORT || 3306,

  // IMPORTANT: Add the socket path shown by mysqladmin
  socketPath: "/tmp/mysql.sock",

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
