import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyClasses } from '../api/class.api';
import { getBookStructure } from '../api/flashcard.api';
import { generateQuiz, getQuizSets, getQuizSet, deleteQuizSet, submitQuiz } from '../api/quiz.api';
import { completeQuiz } from '../api/gamification.api';

export default function QuizPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [sets, setSets] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [xpResult, setXpResult] = useState(null);

  // Generator state
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getMyClasses().then((res) => {
      setClasses(res.data.classes);
      if (res.data.classes.length > 0) setSelectedClass(res.data.classes[0]);
    });
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    getQuizSets(selectedClass.id).then((res) => setSets(res.data.sets));
    getBookStructure(selectedClass.id).then((res) => {
      setBooks(res.data.books);
      setSelectedBook(null);
      setSelectedUnit(null);
      setSelectedChapter(null);
    });
  }, [selectedClass]);

  const openQuiz = async (setId) => {
    const res = await getQuizSet(setId);
    setActiveQuiz(res.data.set);
    setQuestions(res.data.questions);
    setAnswers({});
    setResults(null);
    setXpResult(null);
  };

  const handleAnswer = (questionId, option) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length === 0) return;
    setSubmitting(true);
    try {
      const res = await submitQuiz(activeQuiz.id, answers);
      setResults(res.data);

      // Award XP for students
      if (user?.role === 'student') {
        try {
          const xpRes = await completeQuiz(activeQuiz.id, res.data.score, res.data.total);
          setXpResult(xpRes.data);
        } catch (e) {
          // XP award failed, quiz results still show
        }
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSet = async (e, setId) => {
    e.stopPropagation();
    if (!confirm('Delete this quiz?')) return;
    try {
      await deleteQuizSet(setId);
      setSets((prev) => prev.filter((s) => s.id !== setId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const handleGenerate = async () => {
    if (!selectedBook || !selectedUnit) return;
    setGenerating(true);
    try {
      let scope, unitNumber, chapterTitle;
      if (selectedChapter) {
        scope = 'chapter';
        chapterTitle = selectedChapter;
      } else {
        scope = 'unit';
        unitNumber = selectedUnit.unit_number;
      }

      const res = await generateQuiz(selectedBook.id, scope, unitNumber, chapterTitle);
      const setsRes = await getQuizSets(selectedClass.id);
      setSets(setsRes.data.sets);
      // Open the newly generated quiz
      setActiveQuiz(res.data.set);
      setQuestions(res.data.questions);
      setAnswers({});
      setResults(null);
      setXpResult(null);
      setShowGenerator(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate quiz');
    } finally {
      setGenerating(false);
    }
  };

  const closeQuiz = () => {
    setActiveQuiz(null);
    setQuestions([]);
    setAnswers({});
    setResults(null);
    setXpResult(null);
  };

  const units = selectedBook?.unit_metadata?.units || [];
  const chapters = selectedUnit?.key_topics || [];

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6">Quizzes</h1>

      {!activeQuiz ? (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <select
              value={selectedClass?.id || ''}
              onChange={(e) => setSelectedClass(classes.find((c) => c.id === parseInt(e.target.value)))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button
              onClick={() => setShowGenerator(!showGenerator)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              {showGenerator ? 'Hide Generator' : 'Generate New Quiz'}
            </button>
          </div>

          {/* Quiz Generator */}
          {showGenerator && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Generate Quiz</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">1. Course Book</label>
                  <select
                    value={selectedBook?.id || ''}
                    onChange={(e) => {
                      const book = books.find((b) => b.id === parseInt(e.target.value));
                      setSelectedBook(book || null);
                      setSelectedUnit(null);
                      setSelectedChapter(null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select a book...</option>
                    {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">2. Unit (required)</label>
                  <select
                    value={selectedUnit?.unit_number || ''}
                    onChange={(e) => {
                      const unit = units.find((u) => u.unit_number === parseInt(e.target.value));
                      setSelectedUnit(unit || null);
                      setSelectedChapter(null);
                    }}
                    disabled={!selectedBook || units.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                  >
                    <option value="">Select a unit...</option>
                    {units.map((u) => <option key={u.unit_number} value={u.unit_number}>Unit {u.unit_number}: {u.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">3. Chapter / Topic</label>
                  <select
                    value={selectedChapter || ''}
                    onChange={(e) => setSelectedChapter(e.target.value || null)}
                    disabled={!selectedUnit || chapters.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                  >
                    <option value="">All chapters</option>
                    {chapters.map((ch, i) => <option key={i} value={ch}>{ch}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedChapter
                    ? `Quiz for chapter: ${selectedChapter}`
                    : selectedUnit
                      ? `Quiz for Unit ${selectedUnit.unit_number}: ${selectedUnit.title}`
                      : selectedBook
                        ? 'Select a unit to continue'
                        : 'Select a book to start'}
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={!selectedBook || !selectedUnit || generating}
                  className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {generating ? 'Generating...' : 'Generate Quiz'}
                </button>
              </div>
            </div>
          )}

          {/* Quiz sets list */}
          {sets.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No quizzes yet. Click "Generate New Quiz" to create one!</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sets.map((s) => (
                <div key={s.id} className="relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
                  <button onClick={() => openQuiz(s.id)} className="text-left w-full">
                    <h3 className="font-semibold text-gray-900 dark:text-white pr-8">{s.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.book_title}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {s.scope === 'chapter' ? 'Chapter' : s.scope === 'unit' ? `Unit ${s.unit_number}` : 'Full Book'}
                    </p>
                  </button>
                  <button onClick={(e) => handleDeleteSet(e, s.id)}
                    className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors" title="Delete quiz">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div>
          <button onClick={closeQuiz} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4">
            &larr; Back to quizzes
          </button>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-6">{activeQuiz.title}</h2>

          {results ? (
            /* Results screen */
            <div className="max-w-2xl mx-auto">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-8 text-center mb-6">
                <div className="text-4xl mb-4">{results.percentage >= 80 ? '🎉' : results.percentage >= 50 ? '👍' : '📚'}</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Quiz Complete!</h3>
                <div className="flex justify-center gap-8 mb-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{results.score}/{results.total}</p>
                    <p className="text-xs text-gray-400">Score</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{results.percentage}%</p>
                    <p className="text-xs text-gray-400">Accuracy</p>
                  </div>
                </div>
                {xpResult && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 mt-4">
                    <p className="text-yellow-700 dark:text-yellow-400 font-medium">
                      +{xpResult.xpEarned} XP earned! {xpResult.isPerfect && '🌟 Perfect score bonus!'}
                    </p>
                    <p className="text-sm text-yellow-600 dark:text-yellow-500">Total: {xpResult.totalXp} XP (Level {xpResult.level})</p>
                  </div>
                )}
                <div className="flex justify-center gap-3 mt-6">
                  <button onClick={() => { setResults(null); setXpResult(null); setAnswers({}); }}
                    className="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-medium text-sm hover:bg-primary-700">
                    Retry Quiz
                  </button>
                  <button onClick={closeQuiz}
                    className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-700">
                    Back to Quizzes
                  </button>
                </div>
              </div>

              {/* Question-by-question results */}
              <div className="space-y-4">
                {results.results.map((r, i) => (
                  <div key={r.questionId} className={`p-4 rounded-xl border-2 ${r.isCorrect ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20' : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'}`}>
                    <p className="font-medium text-gray-900 dark:text-white mb-2">{i + 1}. {r.question}</p>
                    <p className="text-sm">
                      <span className={r.isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        Your answer: {r.userAnswer || 'Not answered'}
                      </span>
                      {!r.isCorrect && (
                        <span className="text-green-700 dark:text-green-400 ml-4">Correct: {r.correctOption}</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Quiz questions */
            <div className="max-w-2xl mx-auto space-y-6">
              {questions.map((q, i) => (
                <div key={q.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-bold px-2.5 py-1 rounded-full">{i + 1}</span>
                    <p className="font-medium text-gray-900 dark:text-white">{q.question}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-8">
                    {['A', 'B', 'C', 'D'].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleAnswer(q.id, opt)}
                        className={`text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                          answers[q.id] === opt
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium'
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span className="font-bold mr-2">{opt}.</span>
                        {q[`option_${opt.toLowerCase()}`]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex justify-between items-center pt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {Object.keys(answers).length}/{questions.length} answered
                </p>
                <button
                  onClick={handleSubmit}
                  disabled={Object.keys(answers).length === 0 || submitting}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Quiz'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
