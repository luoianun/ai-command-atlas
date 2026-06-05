// src/lib/db.ts
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "ai_command_atlas",
  waitForConnections: true,
  connectionLimit: 10,
  timezone: "+00:00",
  charset: "utf8mb4",
});

export default pool;
