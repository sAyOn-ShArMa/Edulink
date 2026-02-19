const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('../config/db');

// Create a new student or teacher account
exports.createUser = (req, res) => {
  const { email, password, full_name, role } = req.body;

  if (!email || !password || !full_name || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (!['student', 'teacher'].includes(role)) {
    return res.status(400).json({ error: 'Role must be student or teacher' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  try {
    const password_hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)'
    ).run(email, password_hash, full_name, role);

    let user = db.prepare('SELECT id, email, full_name, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    if (!user) {
      user = db.prepare('SELECT id, email, full_name, role, created_at FROM users WHERE email = ?').get(email);
    }

    // Auto-create portfolio for students
    if (role === 'student' && user) {
      try {
        db.prepare('INSERT INTO portfolios (student_id) VALUES (?)').run(user.id);
      } catch (err) {
        console.error('Portfolio auto-creation failed:', err.message);
      }
    }

    res.status(201).json({ user });
  } catch (err) {
    console.error('Create user error:', err.message);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// List all users with optional role filter
exports.listUsers = (req, res) => {
  const { role } = req.query;
  let users;
  if (role && ['student', 'teacher'].includes(role)) {
    users = db.prepare(
      'SELECT id, email, full_name, role, created_at FROM users WHERE role = ? ORDER BY created_at DESC'
    ).all(role);
  } else {
    users = db.prepare(
      "SELECT id, email, full_name, role, created_at FROM users WHERE role != 'operator' ORDER BY created_at DESC"
    ).all();
  }
  res.json({ users });
};

// Delete a user (cannot delete operators)
exports.deleteUser = (req, res) => {
  const userId = parseInt(req.params.id);
  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.role === 'operator') {
    return res.status(403).json({ error: 'Cannot delete operator accounts' });
  }

  try {
    // Clean up related data
    if (user.role === 'student') {
      db.prepare('DELETE FROM class_enrollments WHERE student_id = ?').run(userId);
      db.prepare('DELETE FROM portfolios WHERE student_id = ?').run(userId);
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Delete user error:', err.message);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Create a class with an assigned teacher
exports.createClass = (req, res) => {
  const { name, teacher_id, section } = req.body;
  if (!name || !teacher_id) {
    return res.status(400).json({ error: 'Name and teacher_id are required' });
  }

  const validSections = ['A', 'B', 'C', 'D'];
  const resolvedSection = validSections.includes(section) ? section : 'A';

  const teacher = db.prepare('SELECT id, role FROM users WHERE id = ?').get(parseInt(teacher_id));
  if (!teacher || teacher.role !== 'teacher') {
    return res.status(400).json({ error: 'Invalid teacher' });
  }

  try {
    const result = db.prepare(
      'INSERT INTO classes (name, subject, teacher_id, section) VALUES (?, ?, ?, ?)'
    ).run(name, '', parseInt(teacher_id), resolvedSection);

    let cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(result.lastInsertRowid);
    if (!cls) {
      cls = db.prepare('SELECT * FROM classes ORDER BY id DESC LIMIT 1').get();
    }

    // Also insert into class_teachers junction table
    try {
      db.prepare('INSERT OR IGNORE INTO class_teachers (class_id, teacher_id) VALUES (?, ?)').run(cls.id, parseInt(teacher_id));
    } catch (e) {
      console.error('class_teachers insert failed:', e.message);
    }

    const teacherInfo = db.prepare('SELECT full_name FROM users WHERE id = ?').get(parseInt(teacher_id));
    const count = db.prepare('SELECT COUNT(*) as count FROM class_enrollments WHERE class_id = ?').get(cls.id);

    res.status(201).json({ class: { ...cls, teacher_name: teacherInfo?.full_name, student_count: count?.count || 0 } });
  } catch (err) {
    console.error('Create class error:', err.message);
    res.status(500).json({ error: 'Failed to create class' });
  }
};

// Update a class (name, subject, section)
exports.updateClass = (req, res) => {
  const classId = parseInt(req.params.id);
  const { name, subject, section } = req.body;

  if (!name && !section) {
    return res.status(400).json({ error: 'At least one field (name, section) is required' });
  }

  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
  if (!cls) {
    return res.status(404).json({ error: 'Class not found' });
  }

  const validSections = ['A', 'B', 'C', 'D'];
  const resolvedSection = section && validSections.includes(section) ? section : cls.section;
  const resolvedName = name && name.trim() ? name.trim() : cls.name;
  const resolvedSubject = subject && subject.trim() ? subject.trim() : cls.subject;

  try {
    db.prepare('UPDATE classes SET name = ?, subject = ?, section = ? WHERE id = ?')
      .run(resolvedName, resolvedSubject, resolvedSection, classId);

    const updated = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
    const count = db.prepare('SELECT COUNT(*) as count FROM class_enrollments WHERE class_id = ?').get(classId);
    const teachers = db.prepare(`
      SELECT u.id, u.full_name, ct.subject FROM class_teachers ct
      JOIN users u ON u.id = ct.teacher_id WHERE ct.class_id = ?
      ORDER BY ct.added_at
    `).all(classId);

    res.json({ class: { ...updated, student_count: count?.count || 0, teachers } });
  } catch (err) {
    console.error('Update class error:', err.message);
    res.status(500).json({ error: 'Failed to update class' });
  }
};

// Delete a class and all related data
exports.deleteClass = (req, res) => {
  const classId = parseInt(req.params.id);

  const cls = db.prepare('SELECT id FROM classes WHERE id = ?').get(classId);
  if (!cls) {
    return res.status(404).json({ error: 'Class not found' });
  }

  try {
    // 1. Get all pdf_book ids for this class
    const books = db.query(`SELECT id FROM pdf_books WHERE class_id = ${classId}`);

    for (const book of books) {
      // 2. Delete flashcards (deepest level)
      const fsets = db.query(`SELECT id FROM flashcard_sets WHERE pdf_book_id = ${book.id}`);
      for (const fs of fsets) {
        db.runRaw(`DELETE FROM flashcards WHERE set_id = ${fs.id}`);
      }
      // 3. Delete flashcard sets
      db.runRaw(`DELETE FROM flashcard_sets WHERE pdf_book_id = ${book.id}`);

      // 4. Delete quiz questions and attempts
      const qsets = db.query(`SELECT id FROM quiz_sets WHERE pdf_book_id = ${book.id}`);
      for (const qs of qsets) {
        db.runRaw(`DELETE FROM quiz_questions WHERE quiz_set_id = ${qs.id}`);
        db.runRaw(`DELETE FROM quiz_attempts WHERE quiz_set_id = ${qs.id}`);
      }
      // 5. Delete quiz sets
      db.runRaw(`DELETE FROM quiz_sets WHERE pdf_book_id = ${book.id}`);
    }
    // 6. Delete pdf books
    db.runRaw(`DELETE FROM pdf_books WHERE class_id = ${classId}`);

    // 7. Delete direct messages then conversations
    const convos = db.query(`SELECT id FROM direct_conversations WHERE class_id = ${classId}`);
    for (const c of convos) {
      db.runRaw(`DELETE FROM direct_messages WHERE conversation_id = ${c.id}`);
    }
    db.runRaw(`DELETE FROM direct_conversations WHERE class_id = ${classId}`);

    // 8. Delete enrollments and teacher assignments
    db.runRaw(`DELETE FROM class_enrollments WHERE class_id = ${classId}`);
    db.runRaw(`DELETE FROM class_teachers WHERE class_id = ${classId}`);

    // 9. Delete the class itself
    db.runRaw(`DELETE FROM classes WHERE id = ${classId}`);

    // Save once at the end
    db._save();

    res.json({ message: 'Class deleted' });
  } catch (err) {
    console.error('Delete class error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to delete class', detail: err.message });
  }
};

// Add a teacher to a class with a specific subject
exports.assignTeacher = (req, res) => {
  const classId = parseInt(req.params.id);
  const { teacher_id, subject } = req.body;

  if (!teacher_id) {
    return res.status(400).json({ error: 'teacher_id is required' });
  }
  if (!subject || !subject.trim()) {
    return res.status(400).json({ error: 'subject is required' });
  }

  const cls = db.prepare('SELECT id FROM classes WHERE id = ?').get(classId);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const teacher = db.prepare('SELECT id, role FROM users WHERE id = ?').get(parseInt(teacher_id));
  if (!teacher || teacher.role !== 'teacher') return res.status(400).json({ error: 'Invalid teacher' });

  // If already assigned, update their subject
  const existing = db.prepare('SELECT id FROM class_teachers WHERE class_id = ? AND teacher_id = ?').get(classId, parseInt(teacher_id));
  if (existing) {
    db.prepare('UPDATE class_teachers SET subject = ? WHERE class_id = ? AND teacher_id = ?').run(subject.trim(), classId, parseInt(teacher_id));
  } else {
    db.prepare('INSERT INTO class_teachers (class_id, teacher_id, subject) VALUES (?, ?, ?)').run(classId, parseInt(teacher_id), subject.trim());
  }

  // Get updated teacher list
  const teachers = db.prepare(`
    SELECT u.id, u.full_name, ct.subject FROM class_teachers ct
    JOIN users u ON u.id = ct.teacher_id WHERE ct.class_id = ?
    ORDER BY ct.added_at
  `).all(classId);

  res.json({ message: 'Teacher added to class', teachers });
};

// Remove a teacher from a class
exports.removeTeacher = (req, res) => {
  const classId = parseInt(req.params.id);
  const teacherId = parseInt(req.params.teacherId);

  const result = db.prepare(
    'DELETE FROM class_teachers WHERE class_id = ? AND teacher_id = ?'
  ).run(classId, teacherId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Teacher assignment not found' });
  }

  // Get updated teacher list
  const teachers = db.prepare(`
    SELECT u.id, u.full_name, ct.subject FROM class_teachers ct
    JOIN users u ON u.id = ct.teacher_id WHERE ct.class_id = ?
    ORDER BY ct.added_at
  `).all(classId);

  res.json({ message: 'Teacher removed from class', teachers });
};

// Get teachers assigned to a class
exports.getClassTeachers = (req, res) => {
  const classId = parseInt(req.params.id);
  const teachers = db.prepare(`
    SELECT u.id, u.full_name, u.email, ct.subject, ct.added_at
    FROM class_teachers ct
    JOIN users u ON u.id = ct.teacher_id
    WHERE ct.class_id = ?
    ORDER BY ct.added_at
  `).all(classId);
  res.json({ teachers });
};

// Enroll a student in a class
exports.enrollStudent = (req, res) => {
  const classId = parseInt(req.params.id);
  const { student_id } = req.body;

  if (!student_id) {
    return res.status(400).json({ error: 'student_id is required' });
  }

  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
  if (!cls) {
    return res.status(404).json({ error: 'Class not found' });
  }

  const student = db.prepare('SELECT id, role FROM users WHERE id = ?').get(parseInt(student_id));
  if (!student || student.role !== 'student') {
    return res.status(400).json({ error: 'Invalid student' });
  }

  const existing = db.prepare(
    'SELECT id FROM class_enrollments WHERE class_id = ? AND student_id = ?'
  ).get(classId, parseInt(student_id));
  if (existing) {
    return res.status(409).json({ error: 'Student already enrolled' });
  }

  db.prepare(
    'INSERT INTO class_enrollments (class_id, student_id) VALUES (?, ?)'
  ).run(classId, parseInt(student_id));
  res.status(201).json({ message: 'Student enrolled' });
};

// Remove a student from a class
exports.unenrollStudent = (req, res) => {
  const classId = parseInt(req.params.id);
  const studentId = parseInt(req.params.studentId);

  const result = db.prepare(
    'DELETE FROM class_enrollments WHERE class_id = ? AND student_id = ?'
  ).run(classId, studentId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Enrollment not found' });
  }
  res.json({ message: 'Student removed from class' });
};

// Get students enrolled in a class
exports.getClassStudents = (req, res) => {
  const classId = parseInt(req.params.id);
  const students = db.prepare(`
    SELECT u.id, u.full_name, u.email, ce.enrolled_at
    FROM class_enrollments ce
    JOIN users u ON u.id = ce.student_id
    WHERE ce.class_id = ?
    ORDER BY u.full_name
  `).all(classId);
  res.json({ students });
};

// Get system stats
exports.getStats = (req, res) => {
  const students = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get();
  const teachers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'teacher'").get();
  const classes = db.prepare('SELECT COUNT(*) as count FROM classes').get();
  const pdfs = db.prepare('SELECT COUNT(*) as count FROM pdf_books').get();

  res.json({
    students: students.count,
    teachers: teachers.count,
    classes: classes.count,
    pdfs: pdfs.count,
  });
};

// Download a PDF file
exports.downloadPdf = (req, res) => {
  const pdfId = parseInt(req.params.pdfId);
  const book = db.prepare('SELECT * FROM pdf_books WHERE id = ?').get(pdfId);
  if (!book) {
    return res.status(404).json({ error: 'PDF not found' });
  }

  const filePath = path.resolve(book.file_path);
  res.download(filePath, `${book.title}.pdf`, (err) => {
    if (err) {
      console.error('Download error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download file' });
      }
    }
  });
};

// Upload PDF (reuses the pdf controller logic)
exports.uploadPdf = async (req, res) => {
  const { extractText } = require('../services/pdf.service');
  const { structurePdfContent } = require('../services/ai.service');

  try {
    const { classId, title } = req.body;
    if (!classId || !title || !req.file) {
      return res.status(400).json({ error: 'classId, title, and file are required' });
    }

    const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(parseInt(classId));
    if (!cls) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const extracted = await extractText(req.file.path);

    let unitMetadata = null;
    try {
      unitMetadata = await structurePdfContent(extracted);
    } catch (err) {
      console.error('AI structuring failed:', err.message);
    }

    const result = db.prepare(`
      INSERT INTO pdf_books (class_id, title, file_path, extracted_text, unit_metadata, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      parseInt(classId), title, req.file.path, extracted,
      unitMetadata ? JSON.stringify(unitMetadata) : null, req.user.id
    );

    let book = db.prepare('SELECT * FROM pdf_books WHERE id = ?').get(result.lastInsertRowid);
    if (!book) {
      book = db.prepare('SELECT * FROM pdf_books ORDER BY id DESC LIMIT 1').get();
    }
    res.status(201).json({ book: { ...book, extracted_text: undefined } });
  } catch (err) {
    console.error('PDF upload error:', err);
    res.status(500).json({ error: 'Failed to process PDF' });
  }
};
