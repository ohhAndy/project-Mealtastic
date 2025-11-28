import dotenv from 'dotenv';
import { Pool } from 'pg';
import fs from "fs";
import path from "path";

// initial code using chatgpt:https://chatgpt.com/s/t_6928eb0491b08191a457663cf3352e35 prompt: I have my db/schema.sql file how do I run it on postgres? I want to do it db.ts
// Load environment variables from .env file
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verifyConnection(): Promise<void> {
  try {
    // Attempt to acquire a client from the pool
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database');
    client.release(); // Release the client back to the pool
  } catch (error) {
    console.error('Error connecting to the database:', error);
  }
}

async function initializeSchema() {
  try {
    const schemaPath = path.resolve(__dirname, "../db/schema.sql");
    const schemaSQL = fs.readFileSync(schemaPath, "utf-8");

    console.log("Running schema.sql...");
    await pool.query(schemaSQL);
    console.log("Database schema initialized successfully");
  } catch (err) {
    console.error("Failed to initialize schema:", err);
  }
}

verifyConnection();
initializeSchema();
export default pool;