import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyClasses, getAllClasses } from '../api/class.api';

export default function ClassesPage() {
  const { user } = useAuth();
  const [myClasses, setMyClasses] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [tab, setTab] = useState('my');

  const fetchClasses = async () => {
    const [my, all] = await Promise.all([getMyClasses(), getAllClasses()]);
    setMyClasses(my.data.classes);
    setAllClasses(all.data.classes);
  };

  useEffect(() => { fetchClasses(); }, []);

  const displayClasses = tab === 'my' ? myClasses : allClasses;

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Classes</h1>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('my')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'my' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}>
          My Classes
        </button>
        <button onClick={() => setTab('all')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'all' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}>
          All Classes
        </button>
      </div>

      {displayClasses.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {tab === 'my' ? 'No classes yet. Contact your operator to get assigned to a class.' : 'No classes available.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayClasses.map((c) => (
            <div key={c.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white">{c.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{c.subject}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-400">By {c.teacher_name} &middot; {c.student_count} students</span>
                {c.enrolled && <span className="text-xs text-green-600 dark:text-green-400 font-medium">Enrolled</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
