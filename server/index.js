const express = require("express");
const cors = require("cors");
const bodyParser = require('body-parser');
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;

// Postgres Client Setup
const pgClient = new Pool({
  user: process.env.pgUser,
  host: process.env.pgHost,
  database: process.env.pgDatabase,
  password: process.env.pgPassword,
  port: process.env.pgPort,
  ssl:
    process.env.NODE_ENV !== 'production'
      ? false
      : { rejectUnauthorized: false },
});

// Create table automatically when server starts
 async function initializeDatabase() {
  try {
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        item_text VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Database table is ready.");
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  }
}



// Start server only after database is initialized
 async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

app.get("/", (req, res) => {
  res.send("Todo API is running");
});

// Get all todo items and count
app.get("/todos", async (req, res) => {
    console.log("GET /api/todos was hit");
  try {
    const result = await pgClient.query(
      "SELECT * FROM todos ORDER BY id ASC"
    );
    //count: result.rows.length
    //.res.json({
    //  items: result.rows
    //});
    res.json(result.rows);
  } catch (error) {
    console.error("Error getting todos:", error);
    res.status(500).json({ error: "Server error getting todos" });
  }
});

// Add a new todo item
app.post("/todos", async (req, res) => {
  try {
    const { item_text } = req.body;

    if (!item_text || item_text.trim() === "") {
      return res.status(400).json({ error: "Todo item text is required" });
    }

    const result = await pgClient.query(
      "INSERT INTO todos (item_text) VALUES ($1) RETURNING *",
      [item_text.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding todo:", error);
    res.status(500).json({ error: "Server error adding todo" });
  }
});

// Delete a todo item
app.delete("/todos/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pgClient.query(
      "DELETE FROM todos WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Todo item not found" });
    }

    res.json({ message: "Todo item deleted", deletedItem: result.rows[0] });
  } catch (error) {
    console.error("Error deleting todo:", error);
    res.status(500).json({ error: "Server error deleting todo" });
  }
});