# Edulink

A full-stack educational platform that connects students, teachers, and operators with integrated course management, AI-powered study tools, real-time messaging, and administrative features.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router, Socket.IO Client |
| **Backend** | Node.js, Express, SQLite (sql.js), JWT, Socket.IO |
| **AI** | Groq (flashcard generation), HuggingFace (chatbot), DuckDuckGo (web search) |
| **Chatbot** | Express, HuggingFace Inference API, Google Generative AI (optional) |

## Features

### For Students
- **Dashboard** — Role-specific overview with quick links
- **Course Books** — Browse and download class textbooks (PDF)
- **AI Flashcards** — Generate flashcards from course material at book, unit, or chapter level with interactive flip-card UI, scoring, and shuffle
- **Gradesheet** — Upload grades, get AI-powered analysis and personalized study schedules
- **Portfolio** — Manage bio, interests, achievements, and projects
- **Direct Messages** — Real-time chat with teachers, with in-conversation AI assistance

### For Teachers
- **Class Management** — View assigned classes and enrolled students
- **Course Books** — Upload and manage PDF textbooks with automatic text extraction
- **Direct Messages** — Real-time communication with students

### For Operators (Admin)
- **User Management** — Create, list, and delete users
- **Class Management** — Create classes, assign/remove teachers, enroll/unenroll students
- **System Statistics** — Overview dashboard of platform usage
- **PDF Management** — Upload and manage course materials

### Chatbot (Standalone Service)
- AI-powered responses via HuggingFace (free, no API key required)
- Web search integration via DuckDuckGo
- Conversation history support
- Fallback mode when AI is unavailable

## Project Structure

```
Edulink/
├── backend/
│   ├── config/          # Database and Groq AI setup
│   ├── controllers/     # Route handlers
│   ├── middleware/       # Auth, role, enrollment, upload
│   ├── routes/          # API endpoint definitions
│   ├── services/        # AI, PDF, and Socket.IO services
│   └── uploads/         # File storage (PDFs, gradesheets)
├── frontend/
│   ├── src/
│   │   ├── api/         # Axios API clients
│   │   ├── components/  # Layout components (Navbar, Sidebar, ProtectedRoute)
│   │   ├── context/     # Auth, Socket, and Theme contexts
│   │   └── pages/       # Route page components
│   └── public/          # Static assets
├── chatbot/
│   ├── server.js        # Express chatbot service
│   └── public/          # Chatbot frontend
└── package.json         # Root scripts for running all services
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)

### Installation

```bash
# Install all dependencies (backend + frontend)
npm run install-all

# Install chatbot dependencies separately
cd chatbot && npm install
```

### Environment Variables

Create a `.env` file in the **backend/** directory:

```env
GROQ_API_KEY=your_groq_api_key
JWT_SECRET=your_jwt_secret
PORT=3001
CLIENT_URL=http://localhost:5173
```

Create a `.env` file in the **chatbot/** directory (optional):

```env
GEMINI_API_KEY=your_gemini_api_key
PORT=3000
```

> The chatbot works without any API keys using free HuggingFace models.

### Running the App

**Run backend and frontend together:**

```bash
npm run dev
```

**Run services individually:**

```bash
npm run backend     # Backend on http://localhost:3001
npm run frontend    # Frontend on http://localhost:5173
cd chatbot && npm run dev  # Chatbot on http://localhost:3000
```

### Default Login

An admin account is auto-seeded on first run:

- **Email:** `admin@edulink.com`
- **Password:** `admin123`

## API Overview

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/login` | User authentication |
| `GET /api/auth/me` | Current user profile |
| `GET /api/classes` | User's classes |
| `POST /api/pdf/upload` | Upload course PDF |
| `GET /api/pdf/:classId` | List class PDFs |
| `POST /api/flashcards/generate` | Generate AI flashcards |
| `GET /api/flashcards/sets` | List flashcard sets |
| `GET /api/portfolio/:studentId` | View student portfolio |
| `POST /api/gradesheet/upload` | Upload gradesheet |
| `POST /api/gradesheet/analyze` | AI grade analysis |
| `GET /api/dm/conversations` | List conversations |
| `POST /api/dm/conversations/:id/messages` | Send message |
| `GET /api/operator/stats` | System statistics |
| `POST /api/operator/users` | Create user (admin) |
| `POST /api/operator/classes` | Create class (admin) |

## License

This project is for educational purposes.
