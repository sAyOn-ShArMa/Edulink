const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'edulink.db');

// sql.js wrapper that provides a better-sqlite3-compatible sync API
// The database is initialized async, but all queries after init are sync
class Database {
  constructor() {
    this.db = null;
    this.ready = false;
  }

  async init() {
    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    this.db.run('PRAGMA foreign_keys = ON');
    this._createTables();
    this._migrateRoleConstraint();
    this._seedOperator();
    this._save();
    this.ready = true;
    return this;
  }

  _save() {
    const data = this.db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }

  _createTables() {
    const tables = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('student', 'teacher', 'operator')),
        avatar_url TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        teacher_id INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS class_enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_id INTEGER NOT NULL REFERENCES classes(id),
        student_id INTEGER NOT NULL REFERENCES users(id),
        enrolled_at TEXT DEFAULT (datetime('now')),
        UNIQUE(class_id, student_id)
      );

      CREATE TABLE IF NOT EXISTS class_teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_id INTEGER NOT NULL REFERENCES classes(id),
        teacher_id INTEGER NOT NULL REFERENCES users(id),
        added_at TEXT DEFAULT (datetime('now')),
        UNIQUE(class_id, teacher_id)
      );

      CREATE TABLE IF NOT EXISTS pdf_books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_id INTEGER NOT NULL REFERENCES classes(id),
        title TEXT NOT NULL,
        file_path TEXT NOT NULL,
        extracted_text TEXT,
        unit_metadata TEXT,
        uploaded_by INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS flashcard_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pdf_book_id INTEGER NOT NULL REFERENCES pdf_books(id),
        title TEXT NOT NULL,
        scope TEXT NOT NULL,
        unit_number INTEGER DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS flashcards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        set_id INTEGER NOT NULL REFERENCES flashcard_sets(id),
        front_text TEXT NOT NULL,
        back_text TEXT NOT NULL,
        difficulty TEXT DEFAULT 'medium' CHECK(difficulty IN ('easy', 'medium', 'hard'))
      );

      CREATE TABLE IF NOT EXISTS portfolios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
        bio TEXT DEFAULT '',
        interests TEXT DEFAULT '',
        achievements TEXT DEFAULT '[]',
        projects TEXT DEFAULT '[]',
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS gradesheets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES users(id),
        file_path TEXT NOT NULL,
        extracted_data TEXT,
        uploaded_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS study_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES users(id),
        gradesheet_id INTEGER NOT NULL REFERENCES gradesheets(id),
        schedule_json TEXT NOT NULL,
        recommendations TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS direct_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES users(id),
        teacher_id INTEGER NOT NULL REFERENCES users(id),
        class_id INTEGER NOT NULL REFERENCES classes(id),
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(student_id, teacher_id)
      );

      CREATE TABLE IF NOT EXISTS direct_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL REFERENCES direct_conversations(id),
        sender_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        is_ai_response INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `;
    this.db.run(tables);
    this._migrateFlashcardChapter();
    this._migrateClassTeachers();
  }

  // Migrate flashcard_sets to include chapter_number column
  _migrateFlashcardChapter() {
    try {
      const result = this.db.exec("PRAGMA table_info(flashcard_sets)");
      if (result.length > 0) {
        const columns = result[0].values.map(row => row[1]);
        if (!columns.includes('chapter_number')) {
          this.db.run('ALTER TABLE flashcard_sets ADD COLUMN chapter_number INTEGER DEFAULT NULL');
          this._save();
          console.log('Added chapter_number column to flashcard_sets');
        }
        if (!columns.includes('chapter_title')) {
          this.db.run('ALTER TABLE flashcard_sets ADD COLUMN chapter_title TEXT DEFAULT NULL');
          this._save();
          console.log('Added chapter_title column to flashcard_sets');
        }
      }
    } catch (err) {
      console.error('Flashcard migration failed:', err.message);
    }
  }

  // Migrate existing classes: populate class_teachers junction table from teacher_id
  _migrateClassTeachers() {
    try {
      const result = this.db.exec(
        "SELECT id, teacher_id FROM classes WHERE teacher_id IS NOT NULL"
      );
      if (result.length > 0) {
        for (const row of result[0].values) {
          const [classId, teacherId] = row;
          try {
            this.db.run(
              `INSERT OR IGNORE INTO class_teachers (class_id, teacher_id) VALUES (${classId}, ${teacherId})`
            );
          } catch (e) {
            // Already exists, skip
          }
        }
        this._save();
      }
    } catch (err) {
      // Table might not have data yet
    }
  }

  // Migrate existing databases: update role CHECK constraint to include 'operator'
  _migrateRoleConstraint() {
    try {
      // Test if the constraint already supports 'operator'
      const testResult = this.db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'");
      if (testResult.length > 0) {
        const createSql = testResult[0].values[0][0];
        if (createSql && !createSql.includes('operator')) {
          console.log('Migrating users table to support operator role...');
          this.db.run('PRAGMA foreign_keys = OFF');
          this.db.run(`CREATE TABLE users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('student', 'teacher', 'operator')),
            avatar_url TEXT DEFAULT NULL,
            created_at TEXT DEFAULT (datetime('now'))
          )`);
          this.db.run('INSERT INTO users_new SELECT * FROM users');
          this.db.run('DROP TABLE users');
          this.db.run('ALTER TABLE users_new RENAME TO users');
          this.db.run('PRAGMA foreign_keys = ON');
          this._save();
          console.log('Users table migrated successfully');
        }
      }
    } catch (err) {
      console.error('Migration check failed (may be a fresh database):', err.message);
    }
  }

  // Seed a default operator account if none exists
  _seedOperator() {
    try {
      const stmt = this.db.prepare('SELECT id FROM users WHERE role = ?');
      stmt.bind(['operator']);
      const hasOperator = stmt.step();
      stmt.free();

      if (!hasOperator) {
        const passwordHash = bcrypt.hashSync('admin123', 10);
        const insertStmt = this.db.prepare(
          'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)'
        );
        insertStmt.bind(['admin@edulink.com', passwordHash, 'System Operator', 'operator']);
        insertStmt.step();
        insertStmt.free();
        this._save();
        console.log('Default operator account created (admin@edulink.com / admin123)');
      }
    } catch (err) {
      console.error('Seed operator failed:', err.message);
    }
  }

  // Returns a prepared statement-like object compatible with better-sqlite3 API
  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        const stmt = self.db.prepare(sql);
        if (params.length) stmt.bind(params);
        stmt.step();
        stmt.free();
        // Get last insert rowid and changes BEFORE save (save may reset internal state)
        const result = self.db.exec('SELECT last_insert_rowid() as id');
        const lastInsertRowid = result.length > 0 ? result[0].values[0][0] : 0;
        const changesResult = self.db.exec('SELECT changes() as c');
        const changes = changesResult.length > 0 ? changesResult[0].values[0][0] : 0;
        self._save();
        return { lastInsertRowid, changes };
      },
      get(...params) {
        const stmt = self.db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const results = [];
        const stmt = self.db.prepare(sql);
        stmt.bind(params);
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      },
    };
  }

  // Execute raw SQL (for multi-statement SQL)
  exec(sql) {
    this.db.run(sql);
    this._save();
  }

  // Transaction helper
  transaction(fn) {
    const self = this;
    return (...args) => {
      try {
        self.db.run('BEGIN');
      } catch (e) {
        // Transaction might already be active, continue
      }
      try {
        const result = fn(...args);
        try { self.db.run('COMMIT'); } catch (e) { /* already committed */ }
        self._save();
        return result;
      } catch (err) {
        try { self.db.run('ROLLBACK'); } catch (e) { /* nothing to rollback */ }
        throw err;
      }
    };
  }
}

const db = new Database();

module.exports = db;
