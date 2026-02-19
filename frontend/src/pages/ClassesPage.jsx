import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSections } from '../api/class.api';

const SECTION_COLORS = {
  A: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', badge: 'bg-blue-600', text: 'text-blue-700 dark:text-blue-300', header: 'bg-blue-600' },
  B: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', badge: 'bg-emerald-600', text: 'text-emerald-700 dark:text-emerald-300', header: 'bg-emerald-600' },
  C: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', badge: 'bg-purple-600', text: 'text-purple-700 dark:text-purple-300', header: 'bg-purple-600' },
  D: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', badge: 'bg-orange-600', text: 'text-orange-700 dark:text-orange-300', header: 'bg-orange-600' },
};

export default function ClassesPage() {
  const { user } = useAuth();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(null);

  useEffect(() => {
    getSections()
      .then((res) => {
        setSections(res.data.sections);
        // Students default to their own section; teachers/operators to first section with subjects
        const mine = res.data.sections.find(s => s.isMySection);
        const first = res.data.sections.find(s => s.subjects.length > 0);
        setActiveSection((mine || first)?.section || 'A');
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-gray-400">Loading sections...</div>
      </div>
    );
  }

  const isStudent = user?.role === 'student';

  // Students only see the section(s) they're enrolled in; others see all
  const visibleSections = isStudent
    ? sections.filter(s => s.isMySection)
    : sections;

  const activeData = sections.find(s => s.section === activeSection);
  const colors = SECTION_COLORS[activeSection] || SECTION_COLORS.A;

  // Students with no enrolled section
  if (isStudent && visibleSections.length === 0 && !loading) {
    return (
      <div className="p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6">Classes</h1>
        <div className="text-center py-16 text-gray-400">
          You are not enrolled in any section yet. Contact your operator.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6">Classes</h1>

      {/* Section Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(isStudent ? visibleSections.map(s => s.section) : ['A', 'B', 'C', 'D']).map((sec) => {
          const sData = sections.find(s => s.section === sec);
          const c = SECTION_COLORS[sec];
          const isActive = activeSection === sec;
          const hasSubjects = (sData?.subjects?.length || 0) > 0;

          return (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? `${c.header} text-white shadow-md`
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
              } ${!isStudent && !hasSubjects ? 'opacity-50' : ''}`}
            >
              Section {sec}
            </button>
          );
        })}
      </div>

      {/* Active Section Content */}
      {activeData && (
        <div className={`rounded-2xl border-2 ${colors.border} ${colors.bg} overflow-hidden`}>
          {/* Section Header */}
          <div className={`${colors.header} px-6 py-4 flex items-center justify-between`}>
            <div>
              <h2 className="text-lg font-bold text-white">Section {activeData.section}</h2>
              <p className="text-white/70 text-sm mt-0.5">
                {activeData.subjects.length} subject{activeData.subjects.length !== 1 ? 's' : ''}
                {activeData.isMySection && ' · Your section'}
              </p>
            </div>
            {activeData.isMySection && (
              <span className="bg-white/20 text-white text-xs font-medium px-3 py-1 rounded-full">
                Enrolled
              </span>
            )}
          </div>

          {/* Subjects Grid */}
          {activeData.subjects.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              No subjects assigned to this section yet.
            </div>
          ) : (
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeData.subjects.map((subject) => (
                <div
                  key={subject.classId}
                  className={`bg-white dark:bg-gray-900 rounded-xl border ${
                    subject.enrolled
                      ? `border-2 ${colors.border}`
                      : 'border-gray-200 dark:border-gray-700'
                  } p-5 shadow-sm`}
                >
                  {/* Class name */}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">{subject.className}</h3>
                    {subject.enrolled && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.text} ${colors.bg}`}>
                        Enrolled
                      </span>
                    )}
                  </div>

                  {/* Teacher(s) */}
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-1.5">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                      Teacher{subject.teachers.length > 1 ? 's' : ''}
                    </p>
                    {subject.teachers.length > 0 ? (
                      subject.teachers.map((t) => (
                        <div key={t.id} className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full ${colors.header} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                            {t.full_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{t.full_name}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400">Unassigned</span>
                    )}
                  </div>

                  {/* Student count */}
                  <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    {subject.studentCount} student{subject.studentCount !== 1 ? 's' : ''} enrolled
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!isStudent && sections.every(s => s.subjects.length === 0) && (
        <div className="text-center py-16 text-gray-400">
          No classes have been created yet.
        </div>
      )}
    </div>
  );
}
