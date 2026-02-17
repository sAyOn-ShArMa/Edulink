import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const studentCards = [
  { title: 'Messages', desc: 'Message your teachers directly', path: '/messages', color: 'bg-blue-500' },
  { title: 'Course Books', desc: 'Browse and download textbooks', path: '/books', color: 'bg-green-500' },
  { title: 'Flashcards', desc: 'Study with AI-generated flashcards', path: '/flashcards', color: 'bg-purple-500' },
  { title: 'My Portfolio', desc: 'View and edit your profile', path: '/portfolio', color: 'bg-orange-500' },
  { title: 'Gradesheet', desc: 'Upload grades and get a study plan', path: '/gradesheet', color: 'bg-red-500' },
  { title: 'Classes', desc: 'View your enrolled classes', path: '/classes', color: 'bg-teal-500' },
];

const teacherCards = [
  { title: 'Messages', desc: 'Message your students directly', path: '/messages', color: 'bg-blue-500' },
  { title: 'Course Books', desc: 'Upload textbooks for your classes', path: '/books', color: 'bg-green-500' },
  { title: 'Flashcards', desc: 'View generated flashcard sets', path: '/flashcards', color: 'bg-purple-500' },
  { title: 'Classes', desc: 'View your assigned classes', path: '/classes', color: 'bg-teal-500' },
];

const operatorCards = [
  { title: 'Management', desc: 'Manage users, classes, enrollments & materials', path: '/operator', color: 'bg-amber-500' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const cards = user?.role === 'operator' ? operatorCards : user?.role === 'teacher' ? teacherCards : studentCards;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Welcome back, {user?.full_name}!</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Here's your Edulink dashboard</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link key={card.path} to={card.path}
            className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow group">
            <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center mb-3`}>
              <span className="text-white font-bold text-lg">{card.title[0]}</span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{card.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
