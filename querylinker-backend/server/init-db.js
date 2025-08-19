const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

// Initialize database
const dbPath = path.join(__dirname, "../data/querylinker.db");
const db = new Database(dbPath);

console.log("Initializing database...");

// Read and execute the schema
const schema = fs.readFileSync(
  path.join(__dirname, "database/schema.sql"),
  "utf8",
);
const statements = schema.split(";").filter((stmt) => stmt.trim());

statements.forEach((stmt) => {
  if (stmt.trim()) {
    try {
      db.exec(stmt + ";");
    } catch (err) {
      if (!err.message.includes("already exists")) {
        console.log("Error executing statement:", err.message);
      }
    }
  }
});

// Create a test user for demonstration
try {
  const bcrypt = require("bcryptjs");
  const testPasswordHash = bcrypt.hashSync("password123", 12);

  db.prepare(
    `
    INSERT OR IGNORE INTO users (email, password_hash, full_name, role, email_verified, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  ).run("test@example.com", testPasswordHash, "Test User", "user", 1, 1);

  console.log("✅ Test user created: test@example.com / password123");
} catch (err) {
  console.log("Test user might already exist:", err.message);
}

console.log("✅ Database initialized successfully!");
console.log("📊 Tables created and ready for authentication.");
db.close();
