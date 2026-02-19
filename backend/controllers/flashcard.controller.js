const db = require('../config/db');
const { generateFlashcards, generateChapterFlashcards } = require('../services/ai.service');

exports.generate = async (req, res) => {
  try {
    const { pdfBookId, scope, unitNumber, chapterTitle } = req.body;
    if (!pdfBookId || !scope) {
      return res.status(400).json({ error: 'pdfBookId and scope are required' });
    }

    // Verify the user has access to this book's class
    const book = db.prepare('SELECT * FROM pdf_books WHERE id = ?').get(parseInt(pdfBookId));
    if (!book) return res.status(404).json({ error: 'PDF not found' });
    if (!book.extracted_text) return res.status(400).json({ error: 'No text extracted from PDF' });

    // Security: verify enrollment for students
    if (req.user.role === 'student') {
      const enrolled = db.prepare(
        'SELECT id FROM class_enrollments WHERE class_id = ? AND student_id = ?'
      ).get(book.class_id, req.user.id);
      if (!enrolled) {
        return res.status(403).json({ error: 'Not enrolled in this class' });
      }
    }

    let unitTitle = null;
    let resolvedChapterTitle = chapterTitle || null;

    if (book.unit_metadata) {
      const meta = JSON.parse(book.unit_metadata);
      if (scope === 'unit' && unitNumber) {
        const unit = meta.units?.find((u) => u.unit_number === unitNumber);
        unitTitle = unit?.title || `Unit ${unitNumber}`;
      }
    }

    let title;
    let cards;

    if (scope === 'chapter' && resolvedChapterTitle) {
      title = `Chapter: ${resolvedChapterTitle}`;
      cards = await generateChapterFlashcards(book.extracted_text, resolvedChapterTitle);
    } else if (scope === 'unit') {
      title = `Unit ${unitNumber} - ${unitTitle || 'Flashcards'}`;
      cards = await generateFlashcards(book.extracted_text, scope, unitTitle);
    } else {
      return res.status(400).json({ error: 'Please select a unit or chapter.' });
    }

    const setResult = db.prepare(
      'INSERT INTO flashcard_sets (pdf_book_id, title, scope, unit_number, chapter_title) VALUES (?, ?, ?, ?, ?)'
    ).run(pdfBookId, title, scope, unitNumber || null, resolvedChapterTitle);

    // Insert cards one by one (sql.js doesn't support transactions reliably)
    for (const card of cards) {
      db.prepare(
        'INSERT INTO flashcards (set_id, front_text, back_text, difficulty) VALUES (?, ?, ?, ?)'
      ).run(setResult.lastInsertRowid, card.front, card.back, card.difficulty || 'medium');
    }

    const flashcardSet = db.prepare('SELECT * FROM flashcard_sets WHERE id = ?').get(setResult.lastInsertRowid);
    const flashcards = db.prepare('SELECT * FROM flashcards WHERE set_id = ?').all(setResult.lastInsertRowid);

    res.status(201).json({ set: flashcardSet, flashcards });
  } catch (err) {
    console.error('Flashcard generation error:', err);
    res.status(500).json({ error: 'Failed to generate flashcards' });
  }
};

exports.listSets = (req, res) => {
  const { classId } = req.query;
  if (!classId) return res.status(400).json({ error: 'classId required' });

  // Security: verify enrollment for students
  if (req.user.role === 'student') {
    const enrolled = db.prepare(
      'SELECT id FROM class_enrollments WHERE class_id = ? AND student_id = ?'
    ).get(parseInt(classId), req.user.id);
    if (!enrolled) {
      return res.status(403).json({ error: 'Not enrolled in this class' });
    }
  }

  const sets = db.prepare(`
    SELECT fs.*, pb.title as book_title
    FROM flashcard_sets fs
    JOIN pdf_books pb ON pb.id = fs.pdf_book_id
    WHERE pb.class_id = ?
    ORDER BY fs.created_at DESC
  `).all(parseInt(classId));

  res.json({ sets });
};

exports.getSet = (req, res) => {
  const setId = parseInt(req.params.setId);
  const set = db.prepare('SELECT * FROM flashcard_sets WHERE id = ?').get(setId);
  if (!set) return res.status(404).json({ error: 'Set not found' });

  // Security: verify the user has access to this set's class
  if (req.user.role === 'student') {
    const book = db.prepare('SELECT class_id FROM pdf_books WHERE id = ?').get(set.pdf_book_id);
    if (book) {
      const enrolled = db.prepare(
        'SELECT id FROM class_enrollments WHERE class_id = ? AND student_id = ?'
      ).get(book.class_id, req.user.id);
      if (!enrolled) {
        return res.status(403).json({ error: 'Not enrolled in this class' });
      }
    }
  }

  const flashcards = db.prepare('SELECT * FROM flashcards WHERE set_id = ?').all(setId);
  res.json({ set, flashcards });
};

// DELETE /api/flashcards/sets/:setId — Delete a flashcard set and its cards
exports.deleteSet = (req, res) => {
  try {
    const setId = parseInt(req.params.setId);
    const set = db.prepare('SELECT * FROM flashcard_sets WHERE id = ?').get(setId);
    if (!set) return res.status(404).json({ error: 'Set not found' });

    // Delete flashcards first, then the set
    db.prepare('DELETE FROM flashcards WHERE set_id = ?').run(setId);
    db.prepare('DELETE FROM flashcard_sets WHERE id = ?').run(setId);

    res.json({ message: 'Flashcard set deleted' });
  } catch (err) {
    console.error('Delete flashcard set error:', err);
    res.status(500).json({ error: 'Failed to delete flashcard set' });
  }
};

/**
 * GET /api/flashcards/books/:classId
 * Get books with their unit/chapter metadata for the Course->Unit->Chapter selector.
 */
exports.getBookStructure = (req, res) => {
  const classId = parseInt(req.params.classId);

  // Security: verify enrollment for students
  if (req.user.role === 'student') {
    const enrolled = db.prepare(
      'SELECT id FROM class_enrollments WHERE class_id = ? AND student_id = ?'
    ).get(classId, req.user.id);
    if (!enrolled) {
      return res.status(403).json({ error: 'Not enrolled in this class' });
    }
  }

  const books = db.prepare(`
    SELECT id, class_id, title, unit_metadata, created_at
    FROM pdf_books WHERE class_id = ?
    ORDER BY created_at DESC
  `).all(classId);

  const parsed = books.map((b) => ({
    ...b,
    unit_metadata: b.unit_metadata ? JSON.parse(b.unit_metadata) : null,
  }));

  res.json({ books: parsed });
};
