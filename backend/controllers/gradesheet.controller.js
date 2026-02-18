const db = require('../config/db');
const { extractText } = require('../services/pdf.service');
const { analyzeGradesheet, parseGradesheetText } = require('../services/ai.service');

exports.upload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    let extractedData = null;

    if (req.file.mimetype === 'application/pdf') {
      try {
        const rawText = await extractText(req.file.path);
        extractedData = await parseGradesheetText(rawText);
      } catch (aiErr) {
        console.warn('Gradesheet AI parsing skipped:', aiErr.message);
        // Continue without AI extraction — file is still saved
      }
    }

    const result = db.prepare(
      'INSERT INTO gradesheets (student_id, file_path, extracted_data) VALUES (?, ?, ?)'
    ).run(req.user.id, req.file.path, extractedData ? JSON.stringify(extractedData) : null);

    const gradesheet = db.prepare('SELECT * FROM gradesheets WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      gradesheet: {
        ...gradesheet,
        extracted_data: gradesheet.extracted_data ? JSON.parse(gradesheet.extracted_data) : null,
      },
    });
  } catch (err) {
    console.error('Gradesheet upload error:', err);
    res.status(500).json({ error: 'Failed to process gradesheet' });
  }
};

exports.get = (req, res) => {
  const studentId = parseInt(req.params.studentId);
  const gradesheet = db.prepare(
    'SELECT * FROM gradesheets WHERE student_id = ? ORDER BY uploaded_at DESC LIMIT 1'
  ).get(studentId);

  if (!gradesheet) return res.status(404).json({ error: 'No gradesheet found' });

  res.json({
    gradesheet: {
      ...gradesheet,
      extracted_data: gradesheet.extracted_data ? JSON.parse(gradesheet.extracted_data) : null,
    },
  });
};

exports.analyze = async (req, res) => {
  try {
    const gradesheet = db.prepare(
      'SELECT * FROM gradesheets WHERE student_id = ? ORDER BY uploaded_at DESC LIMIT 1'
    ).get(req.user.id);

    if (!gradesheet || !gradesheet.extracted_data) {
      return res.status(400).json({ error: 'No gradesheet data to analyze' });
    }

    const extractedData = JSON.parse(gradesheet.extracted_data);
    const schedule = await analyzeGradesheet(extractedData);

    const result = db.prepare(
      'INSERT INTO study_schedules (student_id, gradesheet_id, schedule_json, recommendations) VALUES (?, ?, ?, ?)'
    ).run(
      req.user.id,
      gradesheet.id,
      JSON.stringify(schedule.weekly_schedule),
      JSON.stringify({ analysis: schedule.analysis, recommendations: schedule.recommendations })
    );

    res.status(201).json({ schedule });
  } catch (err) {
    console.error('Gradesheet analysis error:', err);
    if (err.message && err.message.includes('GROQ_API_KEY')) {
      return res.status(503).json({ error: 'AI analysis is unavailable — GROQ_API_KEY is not configured on the server.' });
    }
    res.status(500).json({ error: 'Failed to analyze gradesheet' });
  }
};

exports.getSchedule = (req, res) => {
  const studentId = parseInt(req.params.studentId);
  const schedule = db.prepare(
    'SELECT * FROM study_schedules WHERE student_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(studentId);

  if (!schedule) return res.status(404).json({ error: 'No schedule found' });

  res.json({
    schedule: {
      ...schedule,
      schedule_json: JSON.parse(schedule.schedule_json),
      recommendations: schedule.recommendations ? JSON.parse(schedule.recommendations) : null,
    },
  });
};
