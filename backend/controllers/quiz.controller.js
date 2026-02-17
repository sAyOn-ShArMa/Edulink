const db = require('../config/db');
const { generateQuizQuestions, generateChapterQuiz } = require('../services/ai.service');

// POST /api/quiz/generate — Generate a quiz from course material
exports.generate = async (req, res) => {
  try {
    const { pdfBookId, scope, unitNumber, chapterTitle } = req.body;
    if (!pdfBookId || !scope) {
      return res.status(400).json({ error: 'pdfBookId and scope are required' });
    }

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
    let questions;

    if (scope === 'chapter' && resolvedChapterTitle) {
      title = `Quiz: ${resolvedChapterTitle}`;
      questions = await generateChapterQuiz(book.extracted_text, resolvedChapterTitle);
    } else if (scope === 'unit') {
      title = `Quiz: Unit ${unitNumber} - ${unitTitle || 'Assessment'}`;
      questions = await generateQuizQuestions(book.extracted_text, scope, unitTitle);
    } else {
      title = `Quiz: ${book.title} - Full Book`;
      questions = await generateQuizQuestions(book.extracted_text, scope, null);
    }

    // Save quiz set
    const setResult = db.prepare(
      'INSERT INTO quiz_sets (pdf_book_id, title, scope, unit_number, chapter_title) VALUES (?, ?, ?, ?, ?)'
    ).run(pdfBookId, title, scope, unitNumber || null, resolvedChapterTitle);

    // Save questions
    for (const q of questions) {
      db.prepare(
        'INSERT INTO quiz_questions (quiz_set_id, question, option_a, option_b, option_c, option_d, correct_option, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        setResult.lastInsertRowid,
        q.question,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.correct_option,
        q.difficulty || 'medium'
      );
    }

    const quizSet = db.prepare('SELECT * FROM quiz_sets WHERE id = ?').get(setResult.lastInsertRowid);
    const quizQuestions = db.prepare('SELECT * FROM quiz_questions WHERE quiz_set_id = ?').all(setResult.lastInsertRowid);

    res.status(201).json({ set: quizSet, questions: quizQuestions });
  } catch (err) {
    console.error('Quiz generation error:', err);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
};

// GET /api/quiz/sets?classId= — List quiz sets for a class
exports.listSets = (req, res) => {
  const { classId } = req.query;
  if (!classId) return res.status(400).json({ error: 'classId required' });

  if (req.user.role === 'student') {
    const enrolled = db.prepare(
      'SELECT id FROM class_enrollments WHERE class_id = ? AND student_id = ?'
    ).get(parseInt(classId), req.user.id);
    if (!enrolled) {
      return res.status(403).json({ error: 'Not enrolled in this class' });
    }
  }

  const sets = db.prepare(`
    SELECT qs.*, pb.title as book_title
    FROM quiz_sets qs
    JOIN pdf_books pb ON pb.id = qs.pdf_book_id
    WHERE pb.class_id = ?
    ORDER BY qs.created_at DESC
  `).all(parseInt(classId));

  res.json({ sets });
};

// GET /api/quiz/sets/:setId — Get a specific quiz with questions
exports.getSet = (req, res) => {
  const setId = parseInt(req.params.setId);
  const set = db.prepare('SELECT * FROM quiz_sets WHERE id = ?').get(setId);
  if (!set) return res.status(404).json({ error: 'Quiz not found' });

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

  const questions = db.prepare('SELECT * FROM quiz_questions WHERE quiz_set_id = ?').all(setId);

  // Don't send correct_option to students during quiz (they submit answers and we check)
  const safeQuestions = questions.map(({ correct_option, ...q }) => q);

  res.json({ set, questions: safeQuestions });
};

// POST /api/quiz/sets/:setId/submit — Submit quiz answers and get results
exports.submitQuiz = (req, res) => {
  try {
    const setId = parseInt(req.params.setId);
    const { answers } = req.body; // { questionId: 'A'|'B'|'C'|'D' }

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'answers object is required' });
    }

    const questions = db.prepare('SELECT * FROM quiz_questions WHERE quiz_set_id = ?').all(setId);
    if (questions.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    let score = 0;
    const results = questions.map((q) => {
      const userAnswer = answers[q.id] || null;
      const isCorrect = userAnswer === q.correct_option;
      if (isCorrect) score++;
      return {
        questionId: q.id,
        question: q.question,
        userAnswer,
        correctOption: q.correct_option,
        isCorrect,
      };
    });

    res.json({
      score,
      total: questions.length,
      percentage: Math.round((score / questions.length) * 100),
      results,
    });
  } catch (err) {
    console.error('Quiz submit error:', err);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
};
