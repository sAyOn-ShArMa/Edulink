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

      -- Gamification: XP and points tracking
      CREATE TABLE IF NOT EXISTS student_xp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES users(id),
        total_xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        UNIQUE(student_id)
      );

      -- XP transaction log (every XP earn event)
      CREATE TABLE IF NOT EXISTS xp_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES users(id),
        xp_amount INTEGER NOT NULL,
        source TEXT NOT NULL,
        source_id INTEGER DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Badges definitions and student awards
      CREATE TABLE IF NOT EXISTS badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        criteria_type TEXT NOT NULL,
        criteria_value INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS student_badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES users(id),
        badge_id INTEGER NOT NULL REFERENCES badges(id),
        earned_at TEXT DEFAULT (datetime('now')),
        UNIQUE(student_id, badge_id)
      );

      -- Daily login streaks
      CREATE TABLE IF NOT EXISTS student_streaks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES users(id),
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_login_date TEXT DEFAULT NULL,
        UNIQUE(student_id)
      );

      -- Quiz sets generated from course material
      CREATE TABLE IF NOT EXISTS quiz_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pdf_book_id INTEGER NOT NULL REFERENCES pdf_books(id),
        title TEXT NOT NULL,
        scope TEXT NOT NULL,
        unit_number INTEGER DEFAULT NULL,
        chapter_title TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Individual quiz questions (MCQ)
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_set_id INTEGER NOT NULL REFERENCES quiz_sets(id),
        question TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_option TEXT NOT NULL CHECK(correct_option IN ('A', 'B', 'C', 'D')),
        difficulty TEXT DEFAULT 'medium' CHECK(difficulty IN ('easy', 'medium', 'hard'))
      );

      -- Quiz attempt results
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES users(id),
        quiz_set_id INTEGER NOT NULL REFERENCES quiz_sets(id),
        score INTEGER NOT NULL,
        total INTEGER NOT NULL,
        xp_earned INTEGER DEFAULT 0,
        completed_at TEXT DEFAULT (datetime('now'))
      );
    `;
    this.db.run(tables);
    this._seedBadges();
    this._migrateFlashcardChapter();
    this._migrateClassTeachers();
  }

  // Seed default badge definitions
  _seedBadges() {
    try {
      const existing = this.db.exec('SELECT COUNT(*) FROM badges');
      const count = existing.length > 0 ? existing[0].values[0][0] : 0;
      if (count === 0) {
        const badges = [
          ['First Steps', 'Complete your first flashcard set', '🎯', 'flashcard_sets_completed', 1],
          ['Card Shark', 'Complete 5 flashcard sets', '🃏', 'flashcard_sets_completed', 5],
          ['Flash Master', 'Complete 20 flashcard sets', '⚡', 'flashcard_sets_completed', 20],
          ['Quiz Rookie', 'Complete your first quiz', '📝', 'quizzes_completed', 1],
          ['Quiz Pro', 'Complete 10 quizzes', '🏆', 'quizzes_completed', 10],
          ['Perfect Score', 'Get 100% on a quiz', '💯', 'perfect_quiz', 1],
          ['XP Hunter', 'Earn 100 XP', '✨', 'total_xp', 100],
          ['XP Champion', 'Earn 500 XP', '🌟', 'total_xp', 500],
          ['XP Legend', 'Earn 2000 XP', '👑', 'total_xp', 2000],
          ['Streak Starter', 'Maintain a 3-day streak', '🔥', 'streak', 3],
          ['Week Warrior', 'Maintain a 7-day streak', '💪', 'streak', 7],
          ['Streak Legend', 'Maintain a 30-day streak', '🏅', 'streak', 30],
          ['Daily Learner', 'Log in for the first time', '📚', 'daily_login', 1],
        ];
        for (const [name, desc, icon, criteriaType, criteriaValue] of badges) {
          this.db.run(
            `INSERT INTO badges (name, description, icon, criteria_type, criteria_value) VALUES ('${name}', '${desc}', '${icon}', '${criteriaType}', ${criteriaValue})`
          );
        }
        this._save();
        console.log('Default badges seeded');
      }
    } catch (err) {
      console.error('Badge seeding failed:', err.message);
    }
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
