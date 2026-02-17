const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Use persistent DATA_DIR in production (Render Disk), otherwise local uploads/
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..');
const PDF_DIR = path.join(DATA_DIR, 'uploads', 'pdfs');
const GRADESHEET_DIR = path.join(DATA_DIR, 'uploads', 'gradesheets');

// Ensure upload directories exist
fs.mkdirSync(PDF_DIR, { recursive: true });
fs.mkdirSync(GRADESHEET_DIR, { recursive: true });

const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PDF_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const gradesheetStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, GRADESHEET_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const uploadPdf = multer({
  storage: pdfStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 },
});

const uploadGradesheet = multer({
  storage: gradesheetStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

module.exports = { uploadPdf, uploadGradesheet };
