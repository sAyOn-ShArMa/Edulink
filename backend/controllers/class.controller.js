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

exports.list = (req, res) => {
  let classes;
  if (req.user.role === 'teacher') {
    // Teachers see classes they're assigned to via class_teachers
    classes = db.prepare(`
      SELECT DISTINCT c.* FROM classes c
      LEFT JOIN class_teachers ct ON ct.class_id = c.id
      WHERE c.teacher_id = ? OR ct.teacher_id = ?
      ORDER BY c.created_at DESC
    `).all(req.user.id, req.user.id);
  } else if (req.user.role === 'student') {
    classes = db.prepare(`
      SELECT c.* FROM classes c
      JOIN class_enrollments ce ON ce.class_id = c.id
      WHERE ce.student_id = ?
      ORDER BY c.created_at DESC
    `).all(req.user.id);
  } else {
    // Operator sees all classes
    classes = db.prepare('SELECT * FROM classes ORDER BY created_at DESC').all();
  }

  // Attach teacher names (all teachers) and student count
  classes = classes.map((c) => {
    const teachers = getTeachersForClass(c.id);
    // Fallback: if class_teachers is empty, use legacy teacher_id
    let teacherNames;
    if (teachers.length > 0) {
      teacherNames = teachers.map(t => t.full_name).join(', ');
    } else {
      const teacher = db.prepare('SELECT full_name FROM users WHERE id = ?').get(c.teacher_id);
      teacherNames = teacher?.full_name || 'Unassigned';
    }
    const count = db.prepare('SELECT COUNT(*) as count FROM class_enrollments WHERE class_id = ?').get(c.id);
    return { ...c, teacher_name: teacherNames, teachers, student_count: count.count };
  });

  res.json({ classes });
};

exports.listAll = (req, res) => {
  let classes = db.prepare('SELECT * FROM classes ORDER BY created_at DESC').all();
  classes = classes.map((c) => {
    const teachers = getTeachersForClass(c.id);
    let teacherNames;
    if (teachers.length > 0) {
      teacherNames = teachers.map(t => t.full_name).join(', ');
    } else {
      const teacher = db.prepare('SELECT full_name FROM users WHERE id = ?').get(c.teacher_id);
      teacherNames = teacher?.full_name || 'Unassigned';
    }
    const count = db.prepare('SELECT COUNT(*) as count FROM class_enrollments WHERE class_id = ?').get(c.id);
    const enrolled = req.user.role === 'student'
      ? !!db.prepare('SELECT id FROM class_enrollments WHERE class_id = ? AND student_id = ?').get(c.id, req.user.id)
      : false;
    return { ...c, teacher_name: teacherNames, teachers, student_count: count.count, enrolled };
  });
  res.json({ classes });
};
