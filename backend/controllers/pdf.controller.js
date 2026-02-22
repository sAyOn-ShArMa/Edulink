const path = require('path');
const db = require('../config/db');
const { extractText } = require('../services/pdf.service');
const { structurePdfContent } = require('../services/ai.service');

exports.upload = async (req, res) => {
  try {
    const { classId, title } = req.body;
    if (!classId || !title || !req.file) {
      return res.status(400).json({ error: 'classId, title, and file are required' });
    }

    // Extract text from PDF
    const extracted = await extractText(req.file.path);

    // Use AI to structure the content into units
    let unitMetadata = null;
    try {
      unitMetadata = await structurePdfContent(extracted);
    } catch (err) {
      console.error('AI structuring failed, continuing without units:', err.message);
    }

    const result = db.prepare(`
      INSERT INTO pdf_books (class_id, title, file_path, extracted_text, unit_metadata, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      parseInt(classId),
      title,
      req.file.path,
      extracted,
      unitMetadata ? JSON.stringify(unitMetadata) : null,
      req.user.id
    );

    const book = db.prepare('SELECT * FROM pdf_books WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ book: { ...book, extracted_text: undefined } });
  } catch (err) {
    console.error('PDF upload error:', err);
    res.status(500).json({ error: 'Failed to process PDF' });
  }
};

exports.listByClass = (req, res) => {
  const classId = parseInt(req.params.classId);
  const cls = db.prepare('SELECT name FROM classes WHERE id = ?').get(classId);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const books = db.prepare(`
    SELECT id, class_id, base_class_name, title, unit_metadata, uploaded_by, created_at
    FROM pdf_books
    WHERE class_id = ?
       OR (base_class_name IS NOT NULL AND base_class_name = ?)
    ORDER BY created_at DESC
  `).all(classId, cls.name);

  const parsed = books.map((b) => ({
    ...b,
    unit_metadata: b.unit_metadata ? JSON.parse(b.unit_metadata) : null,
  }));

  res.json({ books: parsed });
};

exports.getContent = (req, res) => {
  const pdfId = parseInt(req.params.pdfId);
  const book = db.prepare('SELECT * FROM pdf_books WHERE id = ?').get(pdfId);
  if (!book) return res.status(404).json({ error: 'PDF not found' });

  res.json({
    book: {
      ...book,
      unit_metadata: book.unit_metadata ? JSON.parse(book.unit_metadata) : null,
    },
  });
};

// Download a PDF file - accessible to enrolled students, teachers, and operators
exports.download = (req, res) => {
  const pdfId = parseInt(req.params.pdfId);
  const book = db.prepare('SELECT * FROM pdf_books WHERE id = ?').get(pdfId);
  if (!book) {
    return res.status(404).json({ error: 'PDF not found' });
  }

  // Verify access: students must be enrolled, teachers must teach the class, operators can always download
  if (req.user.role === 'student') {
    let hasAccess = false;
    if (book.base_class_name) {
      const row = db.prepare(`
        SELECT ce.id FROM class_enrollments ce
        JOIN classes c ON c.id = ce.class_id
        WHERE c.name = ? AND ce.student_id = ? LIMIT 1
      `).get(book.base_class_name, req.user.id);
      hasAccess = !!row;
    } else {
      const row = db.prepare(
        'SELECT id FROM class_enrollments WHERE class_id = ? AND student_id = ?'
      ).get(book.class_id, req.user.id);
      hasAccess = !!row;
    }
    if (!hasAccess) return res.status(403).json({ error: 'Not enrolled in this class' });
  } else if (req.user.role === 'teacher') {
    let teaches = false;
    if (book.base_class_name) {
      const row = db.prepare(`
        SELECT ct.id FROM class_teachers ct
        JOIN classes c ON c.id = ct.class_id
        WHERE c.name = ? AND ct.teacher_id = ? LIMIT 1
      `).get(book.base_class_name, req.user.id);
      teaches = !!row;
    } else {
      const s = db.prepare(
        'SELECT id FROM class_teachers WHERE class_id = ? AND teacher_id = ?'
      ).get(book.class_id, req.user.id);
      const l = db.prepare(
        'SELECT id FROM classes WHERE id = ? AND teacher_id = ?'
      ).get(book.class_id, req.user.id);
      teaches = !!(s || l);
    }
    if (!teaches) return res.status(403).json({ error: 'Not authorized for this class' });
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

exports.remove = (req, res) => {
  const pdfId = parseInt(req.params.pdfId);
  const book = db.prepare('SELECT * FROM pdf_books WHERE id = ?').get(pdfId);
  if (!book) return res.status(404).json({ error: 'PDF not found' });
  if (req.user.role !== 'teacher' && req.user.role !== 'operator') {
    return res.status(403).json({ error: 'Not authorized' });
  }

  db.prepare('DELETE FROM pdf_books WHERE id = ?').run(pdfId);
  res.json({ message: 'Deleted' });
};
