const db = require('../config/db');

// Helper: get all teacher names for a class from class_teachers junction table
function getTeachersForClass(classId) {
  const teachers = db.prepare(`
    SELECT u.id, u.full_name FROM class_teachers ct
    JOIN users u ON u.id = ct.teacher_id
    WHERE ct.class_id = ?
    ORDER BY ct.added_at
  `).all(classId);
  return teachers;
}

// Helper: enrich a class row with teachers + student count
function enrichClass(c, studentId = null) {
  const teachers = getTeachersForClass(c.id);
  let teacherNames;
  if (teachers.length > 0) {
    teacherNames = teachers.map(t => t.full_name).join(', ');
  } else {
    const teacher = db.prepare('SELECT full_name FROM users WHERE id = ?').get(c.teacher_id);
    teacherNames = teacher?.full_name || 'Unassigned';
  }
  const count = db.prepare('SELECT COUNT(*) as count FROM class_enrollments WHERE class_id = ?').get(c.id);
  const enrolled = studentId
    ? !!db.prepare('SELECT id FROM class_enrollments WHERE class_id = ? AND student_id = ?').get(c.id, studentId)
    : false;
  return { ...c, teacher_name: teacherNames, teachers, student_count: count.count, enrolled };
}

exports.list = (req, res) => {
  let classes;
  if (req.user.role === 'teacher') {
    classes = db.prepare(`
      SELECT DISTINCT c.* FROM classes c
      LEFT JOIN class_teachers ct ON ct.class_id = c.id
      WHERE c.teacher_id = ? OR ct.teacher_id = ?
      ORDER BY c.section ASC, c.subject ASC
    `).all(req.user.id, req.user.id);
  } else if (req.user.role === 'student') {
    classes = db.prepare(`
      SELECT c.* FROM classes c
      JOIN class_enrollments ce ON ce.class_id = c.id
      WHERE ce.student_id = ?
      ORDER BY c.section ASC, c.subject ASC
    `).all(req.user.id);
  } else {
    classes = db.prepare('SELECT * FROM classes ORDER BY section ASC, subject ASC').all();
  }

  classes = classes.map((c) => enrichClass(c, req.user.role === 'student' ? req.user.id : null));
  res.json({ classes });
};

exports.listAll = (req, res) => {
  let classes = db.prepare('SELECT * FROM classes ORDER BY section ASC, subject ASC').all();
  classes = classes.map((c) => enrichClass(c, req.user.role === 'student' ? req.user.id : null));
  res.json({ classes });
};

// GET /api/classes/sections — returns all 4 sections with their subjects grouped.
// For students: each section shows all subjects taught in it, and whether the student is enrolled.
exports.getSections = (req, res) => {
  const SECTIONS = ['A', 'B', 'C', 'D'];

  // Get the class name prefix (e.g. "Class 9") — infer from the most common name
  const allClasses = db.prepare('SELECT * FROM classes ORDER BY section ASC, subject ASC').all();

  const sections = SECTIONS.map((section) => {
    const sectionClasses = allClasses.filter(c => (c.section || 'A') === section);

    const subjects = sectionClasses.map((c) => {
      const teachers = getTeachersForClass(c.id);
      let teacherName;
      if (teachers.length > 0) {
        teacherName = teachers.map(t => t.full_name).join(', ');
      } else {
        const teacher = db.prepare('SELECT full_name FROM users WHERE id = ?').get(c.teacher_id);
        teacherName = teacher?.full_name || 'Unassigned';
      }

      const enrolled = req.user.role === 'student'
        ? !!db.prepare('SELECT id FROM class_enrollments WHERE class_id = ? AND student_id = ?').get(c.id, req.user.id)
        : false;

      const studentCount = db.prepare('SELECT COUNT(*) as count FROM class_enrollments WHERE class_id = ?').get(c.id);

      return {
        classId: c.id,
        subject: c.subject,
        className: c.name,
        teacherName,
        teachers,
        enrolled,
        studentCount: studentCount.count,
      };
    });

    // A student is "in this section" if they're enrolled in at least one class in it
    const isMySection = req.user.role === 'student'
      ? subjects.some(s => s.enrolled)
      : false;

    return { section, subjects, isMySection };
  });

  res.json({ sections });
};
