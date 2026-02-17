import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyClasses } from '../api/class.api';
import { getFlashcardSets, getFlashcardSet, getBookStructure, generateFlashcards, deleteFlashcardSet } from '../api/flashcard.api';
import { completeFlashcardSet } from '../api/gamification.api';

export default function FlashcardPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [sets, setSets] = useState([]);
  const [activeSet, setActiveSet] = useState(null);
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });
  const [finished, setFinished] = useState(false);
  const [xpResult, setXpResult] = useState(null);

  // Course -> Unit -> Chapter selector state
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);

  useEffect(() => {
    getMyClasses().then((res) => {
      setClasses(res.data.classes);
      if (res.data.classes.length > 0) setSelectedClass(res.data.classes[0]);
    });
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    getFlashcardSets(selectedClass.id).then((res) => setSets(res.data.sets));
    getBookStructure(selectedClass.id).then((res) => {
      setBooks(res.data.books);
      setSelectedBook(null);
      setSelectedUnit(null);
      setSelectedChapter(null);
    });
  }, [selectedClass]);

  const openSet = async (setId) => {
    const res = await getFlashcardSet(setId);
    setActiveSet(res.data.set);
    setCards(res.data.flashcards);
    setCurrentIndex(0);
    setFlipped(false);
    setScore({ correct: 0, incorrect: 0 });
    setFinished(false);
  };

  const nextCard = (correct) => {
    const newScore = {
      correct: score.correct + (correct ? 1 : 0),
      incorrect: score.incorrect + (correct ? 0 : 1),
    };
    setScore(newScore);
    setFlipped(false);
    setTimeout(() => {
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Last card answered — show completion screen and award XP
        setFinished(true);
        if (user?.role === 'student' && activeSet) {
          completeFlashcardSet(activeSet.id, newScore.correct, cards.length)
            .then((res) => setXpResult(res.data))
            .catch(() => {}); // silently fail XP award
        }
      }
    }, 200);
  };

  const restart = () => {
    setCurrentIndex(0);
    setFlipped(false);
    setScore({ correct: 0, incorrect: 0 });
    setFinished(false);
    setXpResult(null);
  };

  const shuffle = () => {
    // Fisher-Yates shuffle for proper uniform randomization
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setCards(shuffled);
    setCurrentIndex(0);
    setFlipped(false);
    setScore({ correct: 0, incorrect: 0 });
    setFinished(false);
    setXpResult(null);
  };

  const closeSet = () => {
    setActiveSet(null);
    setCards([]);
    setXpResult(null);
  };

  const handleDeleteSet = async (e, setId) => {
    e.stopPropagation();
    if (!confirm('Delete this flashcard set?')) return;
    try {
      await deleteFlashcardSet(setId);
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

      const res = await generateFlashcards(selectedBook.id, scope, unitNumber, chapterTitle);
      // Refresh sets list
      const setsRes = await getFlashcardSets(selectedClass.id);
      setSets(setsRes.data.sets);
      // Open the newly generated set
      setActiveSet(res.data.set);
      setCards(res.data.flashcards);
      setCurrentIndex(0);
      setFlipped(false);
      setScore({ correct: 0, incorrect: 0 });
      setShowGenerator(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate flashcards');
    } finally {
      setGenerating(false);
    }
  };

  const units = selectedBook?.unit_metadata?.units || [];
  const chapters = selectedUnit?.key_topics || [];
  const currentCard = cards[currentIndex];

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6">Flashcards</h1>

      {!activeSet ? (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <select value={selectedClass?.id || ''} onChange={(e) => setSelectedClass(classes.find((c) => c.id === parseInt(e.target.value)))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={() => setShowGenerator(!showGenerator)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700">
              {showGenerator ? 'Hide Generator' : 'Generate New'}
            </button>
          </div>

          {/* Course -> Unit -> Chapter Generator */}
          {showGenerator && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Generate Flashcards</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                {/* Step 1: Select Book (Course) */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">1. Course Book</label>
                  <select value={selectedBook?.id || ''}
                    onChange={(e) => {
                      const book = books.find((b) => b.id === parseInt(e.target.value));
                      setSelectedBook(book || null);
                      setSelectedUnit(null);
                      setSelectedChapter(null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                    <option value="">Select a book...</option>
                    {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                  </select>
                </div>

                {/* Step 2: Select Unit */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">2. Unit (required)</label>
                  <select value={selectedUnit?.unit_number || ''}
                    onChange={(e) => {
                      const unit = units.find((u) => u.unit_number === parseInt(e.target.value));
                      setSelectedUnit(unit || null);
                      setSelectedChapter(null);
                    }}
                    disabled={!selectedBook || units.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50">
                    <option value="">Select a unit...</option>
                    {units.map((u) => <option key={u.unit_number} value={u.unit_number}>Unit {u.unit_number}: {u.title}</option>)}
                  </select>
                </div>

                {/* Step 3: Select Chapter / Topic */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">3. Chapter / Topic</label>
                  <select value={selectedChapter || ''}
                    onChange={(e) => setSelectedChapter(e.target.value || null)}
                    disabled={!selectedUnit || chapters.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50">
                    <option value="">All chapters</option>
                    {chapters.map((ch, i) => <option key={i} value={ch}>{ch}</option>)}
                  </select>
                </div>
              </div>

              {/* Selection summary and generate button */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedChapter
                    ? `Generating for chapter: ${selectedChapter}`
                    : selectedUnit
                      ? `Generating for Unit ${selectedUnit.unit_number}: ${selectedUnit.title}`
                      : selectedBook
                        ? 'Select a unit to continue'
                        : 'Select a book to start'}
                </p>
                <button onClick={handleGenerate} disabled={!selectedBook || !selectedUnit || generating}
                  className="bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                  {generating ? 'Generating...' : 'Generate Flashcards'}
                </button>
              </div>
            </div>
          )}

          {/* Existing flashcard sets */}
          {sets.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No flashcard sets yet. Click "Generate New" to create some!</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sets.map((s) => (
                <div key={s.id} className="relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
                  <button onClick={() => openSet(s.id)} className="text-left w-full">
                    <h3 className="font-semibold text-gray-900 dark:text-white pr-8">{s.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.book_title}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {s.scope === 'chapter' ? 'Chapter' : s.scope === 'unit' ? `Unit ${s.unit_number}` : 'Full Book'}
                    </p>
                  </button>
                  <button onClick={(e) => handleDeleteSet(e, s.id)}
                    className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors" title="Delete set">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
            <div>
              <button onClick={closeSet} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-2">&larr; Back to sets</button>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{activeSet.title}</h2>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium">{score.correct} correct</span>
              <span className="text-xs sm:text-sm text-red-500 dark:text-red-400 font-medium">{score.incorrect} wrong</span>
              <span className="text-xs sm:text-sm text-gray-400">{currentIndex + 1}/{cards.length}</span>
            </div>
          </div>

          {finished ? (
            <div className="max-w-lg mx-auto px-2 sm:px-0">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-8 text-center">
                <div className="text-4xl mb-4">
                  {score.correct >= score.incorrect ? '🎉' : '📚'}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Set Complete!</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">You reviewed all {cards.length} cards</p>
                <div className="flex justify-center gap-6 mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{score.correct}</p>
                    <p className="text-xs text-gray-400">Correct</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-500 dark:text-red-400">{score.incorrect}</p>
                    <p className="text-xs text-gray-400">Wrong</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                      {cards.length > 0 ? Math.round((score.correct / cards.length) * 100) : 0}%
                    </p>
                    <p className="text-xs text-gray-400">Accuracy</p>
                  </div>
                </div>
                {xpResult && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 mb-6">
                    <p className="text-yellow-700 dark:text-yellow-400 font-medium">+{xpResult.xpEarned} XP earned!</p>
                    <p className="text-sm text-yellow-600 dark:text-yellow-500">Total: {xpResult.totalXp} XP (Level {xpResult.level})</p>
                    {xpResult.newBadges?.length > 0 && (
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                        New badge: {xpResult.newBadges.map((b) => `${b.icon} ${b.name}`).join(', ')}
                      </p>
                    )}
                  </div>
                )}
                <div className="flex justify-center gap-3">
                  <button onClick={restart}
                    className="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-medium text-sm hover:bg-primary-700">
                    Try Again
                  </button>
                  <button onClick={shuffle}
                    className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-700">
                    Shuffle & Retry
                  </button>
                  <button onClick={closeSet}
                    className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-700">
                    Back to Sets
                  </button>
                </div>
              </div>
            </div>
          ) : currentCard && (
            <div className="max-w-lg mx-auto px-2 sm:px-0">
              {/* Flashcard */}
              <div className="flashcard-flip cursor-pointer mb-6" onClick={() => setFlipped(!flipped)} style={{ minHeight: '220px' }}>
                <div className={`flashcard-inner relative w-full ${flipped ? 'flipped' : ''}`} style={{ minHeight: '220px' }}>
                  <div className="flashcard-front absolute inset-0 bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-5 sm:p-8 flex flex-col items-center justify-center shadow-sm">
                    <span className={`text-xs px-2 py-1 rounded-full mb-4 ${currentCard.difficulty === 'easy' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : currentCard.difficulty === 'hard' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                      {currentCard.difficulty}
                    </span>
                    <p className="text-lg text-center text-gray-900 dark:text-white font-medium">{currentCard.front_text}</p>
                    <p className="text-xs text-gray-400 mt-4">Click to flip</p>
                  </div>
                  <div className="flashcard-back absolute inset-0 bg-primary-50 dark:bg-primary-900/30 rounded-2xl border-2 border-primary-200 dark:border-primary-700 p-5 sm:p-8 flex flex-col items-center justify-center">
                    <p className="text-lg text-center text-primary-900 dark:text-primary-300">{currentCard.back_text}</p>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-2 sm:gap-3">
                <button onClick={() => nextCard(false)}
                  className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl font-medium text-sm hover:bg-red-200 dark:hover:bg-red-900/50">
                  Wrong
                </button>
                <button onClick={shuffle}
                  className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-700">
                  Shuffle
                </button>
                <button onClick={() => nextCard(true)}
                  className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl font-medium text-sm hover:bg-green-200 dark:hover:bg-green-900/50">
                  Correct
                </button>
              </div>

              {/* Progress bar */}
              <div className="mt-6 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-primary-600 h-2 rounded-full transition-all" style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
