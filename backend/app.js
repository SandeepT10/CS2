const sqlite3 = require('sqlite3').verbose();


const db = new sqlite3.Database('./ims.db', (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Create Employees table
db.run(`CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  region TEXT NOT NULL
);`);

// Create Ideas table
db.run(`CREATE TABLE IF NOT EXISTS ideas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'Pending',
  employee_id INTEGER,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);`);

// Create Votes table
db.run(`CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idea_id INTEGER,
  employee_id INTEGER,
  vote_type TEXT NOT NULL,
  FOREIGN KEY (idea_id) REFERENCES ideas(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);`);

// Create Logs table
db.run(`CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);`);

// Close the database connection
db.close((err) => {
  if (err) {
    console.error('Error closing SQLite database:', err);
  } else {
    console.log('SQLite database schema setup complete');
  }
});

// --- Step 2: Backend API (Node.js) ---

// Install Express before running this script
// npm install express body-parser sqlite3

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// Reconnect to SQLite database for API endpoints
const apiDB = new sqlite3.Database('./ims.db');

// Submit a new idea
app.post('/ideas', (req, res) => {
  const { title, description, employee_id } = req.body;
  const sql = 'INSERT INTO ideas (title, description, employee_id) VALUES (?, ?, ?)';

  apiDB.run(sql, [title, description, employee_id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(201).json({ message: 'Idea submitted successfully', idea_id: this.lastID });
    }
  });
});

// Get all ideas
app.get('/ideas', (req, res) => {
  const sql = 'SELECT * FROM ideas';

  apiDB.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Vote on an idea
app.post('/votes', (req, res) => {
  const { idea_id, employee_id, vote_type } = req.body;
  const sql = 'INSERT INTO votes (idea_id, employee_id, vote_type) VALUES (?, ?, ?)';

  apiDB.run(sql, [idea_id, employee_id, vote_type], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(201).json({ message: 'Vote recorded successfully', vote_id: this.lastID });
    }
  });
});

// Evaluate an idea (Manager action)
app.post('/evaluate/:ideaId', (req, res) => {
  const ideaId = req.params.ideaId;
  const { status } = req.body;
  const sql = 'UPDATE ideas SET status = ? WHERE id = ?';

  apiDB.run(sql, [status, ideaId], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ message: 'Idea evaluation updated successfully' });
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});