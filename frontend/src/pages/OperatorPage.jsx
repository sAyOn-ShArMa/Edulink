import { useState, useEffect } from 'react';
import {
  createUser, listUsers, deleteUser,
  createClass, updateClass, deleteClass, assignTeacher, removeTeacher, getClassTeachers,
  enrollStudent, unenrollStudent, getClassStudents,
  getStats, downloadPdf, uploadPdf,
} from '../api/operator.api';
import { getMyClasses, getAllClasses } from '../api/class.api';
import { getPdfs, deletePdf } from '../api/pdf.api';

const tabs = ['Users', 'Classes', 'Enrollments', 'Course Materials'];

export default function OperatorPage() {
  const [tab, setTab] = useState('Users');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getStats().then((res) => setStats(res.data)).catch(() => {});
  }, []);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Operator Management</h1>
        {stats && (
          <div className="flex flex-wrap gap-3 mt-3">
            {[
              { label: 'Students', value: stats.students, color: 'bg-blue-500' },
              { label: 'Teachers', value: stats.teachers, color: 'bg-green-500' },
              { label: 'Classes', value: stats.classes, color: 'bg-purple-500' },
              { label: 'PDFs', value: stats.pdfs, color: 'bg-orange-500' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                <div className={`w-3 h-3 rounded-full ${s.color}`} />
                <span className="text-sm text-gray-600 dark:text-gray-400">{s.label}:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{s.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab === t ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Users' && <UsersTab onUpdate={() => getStats().then((r) => setStats(r.data))} />}
      {tab === 'Classes' && <ClassesTab onUpdate={() => getStats().then((r) => setStats(r.data))} />}
      {tab === 'Enrollments' && <EnrollmentsTab />}
      {tab === 'Course Materials' && <MaterialsTab />}
    </div>
  );
}

// ─── USERS TAB ──────────────────────────────────────────
function UsersTab({ onUpdate }) {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'student' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = () => {
    listUsers(filter || undefined).then((res) => setUsers(res.data.users)).catch(() => {});
  };

  useEffect(() => { fetchUsers(); }, [filter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createUser(form.email, form.password, form.full_name, form.role);
      setForm({ full_name: '', email: '', password: '', role: 'student' });
      setShowForm(false);
      fetchUsers();
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await deleteUser(id);
      fetchUsers();
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none">
          <option value="">All Users</option>
          <option value="student">Students</option>
          <option value="teacher">Teachers</option>
        </select>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
          + Create User
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
          {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg mb-3">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
              <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <div className="flex gap-2">
                {['student', 'teacher'].map((r) => (
                  <button key={r} type="button" onClick={() => setForm({ ...form, role: r })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${form.role === r ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'}`}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={loading}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
              {loading ? 'Creating...' : 'Create User'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Created</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">No users found</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{u.full_name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.role === 'teacher' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(u.id, u.full_name)}
                      className="text-xs text-red-500 hover:text-red-700 px-3 py-1 border border-red-200 dark:border-red-800 rounded-lg">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── CLASSES TAB ────────────────────────────────────────
function ClassesTab({ onUpdate }) {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', teacher_id: '', section: 'A' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [managingTeachers, setManagingTeachers] = useState(null); // classId being managed
  const [classTeachers, setClassTeachers] = useState([]);
  const [addTeacherForm, setAddTeacherForm] = useState({ teacher_id: '', subject: '' });
  const [addTeacherError, setAddTeacherError] = useState('');
  const [editingSubject, setEditingSubject] = useState(null); // teacherId being edited
  const [editSubjectValue, setEditSubjectValue] = useState('');
  const [editingClass, setEditingClass] = useState(null); // classId being edited
  const [editClassForm, setEditClassForm] = useState({ name: '', section: 'A' });
  const [editClassError, setEditClassError] = useState('');

  const fetchData = () => {
    getAllClasses().then((res) => setClasses(res.data.classes)).catch(() => {});
    listUsers('teacher').then((res) => setTeachers(res.data.users)).catch(() => {});
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createClass(form.name, '', parseInt(form.teacher_id), form.section);
      setForm({ name: '', teacher_id: '', section: 'A' });
      setShowForm(false);
      fetchData();
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (id, name) => {
    if (!confirm(`Delete class "${name}"? This will remove all related data.`)) return;
    try {
      await deleteClass(id);
      fetchData();
      onUpdate();
    } catch (err) {
      const detail = err.response?.data?.detail ? `\n${err.response.data.detail}` : '';
      alert((err.response?.data?.error || 'Failed to delete class') + detail);
    }
  };

  const handleManageTeachers = async (classId) => {
    if (managingTeachers === classId) {
      setManagingTeachers(null);
      setClassTeachers([]);
      setAddTeacherForm({ teacher_id: '', subject: '' });
      setAddTeacherError('');
      return;
    }
    setManagingTeachers(classId);
    setAddTeacherForm({ teacher_id: '', subject: '' });
    setAddTeacherError('');
    try {
      const res = await getClassTeachers(classId);
      setClassTeachers(res.data.teachers);
    } catch {
      setClassTeachers([]);
    }
  };

  const handleAddTeacher = async (classId) => {
    setAddTeacherError('');
    if (!addTeacherForm.teacher_id) return setAddTeacherError('Select a teacher');
    if (!addTeacherForm.subject.trim()) return setAddTeacherError('Enter the subject they teach');
    try {
      const res = await assignTeacher(classId, parseInt(addTeacherForm.teacher_id), addTeacherForm.subject.trim());
      setClassTeachers(res.data.teachers);
      setAddTeacherForm({ teacher_id: '', subject: '' });
      fetchData();
    } catch (err) {
      setAddTeacherError(err.response?.data?.error || 'Failed to add teacher');
    }
  };

  const handleRemoveTeacher = async (classId, teacherId) => {
    try {
      const res = await removeTeacher(classId, teacherId);
      setClassTeachers(res.data.teachers);
      setEditingSubject(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove teacher');
    }
  };

  const handleUpdateSubject = async (classId, teacherId) => {
    if (!editSubjectValue.trim()) return;
    try {
      const res = await assignTeacher(classId, teacherId, editSubjectValue.trim());
      setClassTeachers(res.data.teachers);
      setEditingSubject(null);
      setEditSubjectValue('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update subject');
    }
  };

  const handleStartEditClass = (c) => {
    setEditingClass(c.id);
    setEditClassForm({ name: c.name, section: c.section || 'A' });
    setEditClassError('');
  };

  const handleSaveClass = async (classId) => {
    setEditClassError('');
    if (!editClassForm.name.trim()) {
      return setEditClassError('Class name is required');
    }
    try {
      await updateClass(classId, editClassForm);
      setEditingClass(null);
      fetchData();
    } catch (err) {
      setEditClassError(err.response?.data?.error || 'Failed to update class');
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setShowForm(!showForm)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
          + Create Class
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
          {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg mb-3">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="e.g. Class 10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Section</label>
              <div className="flex gap-1">
                {['A', 'B', 'C', 'D'].map((s) => (
                  <button key={s} type="button" onClick={() => setForm({ ...form, section: s })}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-colors ${form.section === s ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary Teacher</label>
              <select value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                <option value="">Select teacher...</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={loading}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Class'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">No classes yet. Create one above!</div>
        ) : classes.map((c) => (
          <div key={c.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            {editingClass === c.id ? (
              <div className="space-y-2">
                {editClassError && (
                  <p className="text-xs text-red-500">{editClassError}</p>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Class Name</label>
                  <input
                    type="text"
                    value={editClassForm.name}
                    onChange={(e) => setEditClassForm({ ...editClassForm, name: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Section</label>
                  <div className="flex gap-1">
                    {['A', 'B', 'C', 'D'].map((s) => (
                      <button key={s} type="button" onClick={() => setEditClassForm({ ...editClassForm, section: s })}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${editClassForm.section === s ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => handleSaveClass(c.id)}
                    className="flex-1 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700">
                    Save
                  </button>
                  <button onClick={() => setEditingClass(null)}
                    className="flex-1 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-800">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{c.name}</h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 ml-2 flex-shrink-0">
                    §{c.section || 'A'}
                  </span>
                </div>
              </>
            )}
            {editingClass !== c.id && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{c.student_count} students</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleManageTeachers(c.id)}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium">
                    {managingTeachers === c.id ? 'Close' : `Teachers (${c.teachers?.length || 0})`}
                  </button>
                  <button onClick={() => handleStartEditClass(c)}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg">
                    Edit
                  </button>
                  <button onClick={() => handleDeleteClass(c.id, c.name)}
                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1 border border-red-200 dark:border-red-800 rounded-lg">
                    Delete
                  </button>
                </div>
              </div>

              {managingTeachers === c.id && (
                <div className="mt-3 space-y-3">
                  {/* Current subject-teachers list */}
                  <div className="space-y-1">
                    {classTeachers.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No teachers assigned yet</p>
                    ) : classTeachers.map((t) => (
                      <div key={t.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{t.full_name}</p>
                          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                            <button
                              onClick={() => {
                                if (editingSubject === t.id) { setEditingSubject(null); setEditSubjectValue(''); }
                                else { setEditingSubject(t.id); setEditSubjectValue(t.subject || ''); }
                              }}
                              className="text-xs text-primary-500 hover:text-primary-700">
                              {editingSubject === t.id ? 'Cancel' : 'Edit'}
                            </button>
                            <button onClick={() => handleRemoveTeacher(c.id, t.id)}
                              className="text-xs text-red-500 hover:text-red-700">
                              Remove
                            </button>
                          </div>
                        </div>
                        {editingSubject === t.id ? (
                          <div className="flex gap-1 mt-1.5">
                            <input
                              autoFocus
                              type="text"
                              value={editSubjectValue}
                              onChange={(e) => setEditSubjectValue(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleUpdateSubject(c.id, t.id)}
                              placeholder="Enter subject..."
                              className="flex-1 px-2 py-1 border border-primary-400 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-primary-500"
                            />
                            <button
                              onClick={() => handleUpdateSubject(c.id, t.id)}
                              className="px-2 py-1 bg-primary-600 text-white rounded text-xs hover:bg-primary-700">
                              Save
                            </button>
                          </div>
                        ) : (
                          <p
                            onClick={() => { setEditingSubject(t.id); setEditSubjectValue(t.subject || ''); }}
                            className={`text-xs mt-0.5 cursor-pointer ${t.subject ? 'text-primary-600 dark:text-primary-400' : 'text-amber-500 dark:text-amber-400 italic'}`}>
                            {t.subject || 'No subject set — click to add'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add teacher + subject form */}
                  <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Add Subject Teacher</p>
                    {addTeacherError && (
                      <p className="text-xs text-red-500">{addTeacherError}</p>
                    )}
                    <select
                      value={addTeacherForm.teacher_id}
                      onChange={(e) => setAddTeacherForm({ ...addTeacherForm, teacher_id: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none">
                      <option value="">Select teacher...</option>
                      {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                    </select>
                    <input
                      type="text"
                      placeholder="Subject they teach (e.g. Physics)"
                      value={addTeacherForm.subject}
                      onChange={(e) => setAddTeacherForm({ ...addTeacherForm, subject: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <button
                      onClick={() => handleAddTeacher(c.id)}
                      className="w-full py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700">
                      + Assign Teacher
                    </button>
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ENROLLMENTS TAB ────────────────────────────────────
function EnrollmentsTab() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [enrolled, setEnrolled] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');

  useEffect(() => {
    getAllClasses().then((res) => {
      setClasses(res.data.classes);
      if (res.data.classes.length > 0) setSelectedClass(res.data.classes[0]);
    });
    listUsers('student').then((res) => setAllStudents(res.data.users));
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    getClassStudents(selectedClass.id).then((res) => setEnrolled(res.data.students)).catch(() => {});
  }, [selectedClass]);

  const handleEnroll = async () => {
    if (!selectedStudent || !selectedClass) return;
    try {
      await enrollStudent(selectedClass.id, parseInt(selectedStudent));
      setSelectedStudent('');
      getClassStudents(selectedClass.id).then((res) => setEnrolled(res.data.students));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to enroll student');
    }
  };

  const handleUnenroll = async (studentId) => {
    if (!confirm('Remove this student from the class?')) return;
    try {
      await unenrollStudent(selectedClass.id, studentId);
      getClassStudents(selectedClass.id).then((res) => setEnrolled(res.data.students));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove student');
    }
  };

  const enrolledIds = enrolled.map((s) => s.id);
  const availableStudents = allStudents.filter((s) => !enrolledIds.includes(s.id));

  return (
    <div>
      <div className="mb-4">
        <select value={selectedClass?.id || ''} onChange={(e) => setSelectedClass(classes.find((c) => c.id === parseInt(e.target.value)))}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name} - {c.subject}</option>)}
        </select>
      </div>

      {selectedClass && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">Add Student to {selectedClass.name}</h3>
          <div className="flex gap-2">
            <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
              <option value="">Select a student...</option>
              {availableStudents.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>)}
            </select>
            <button onClick={handleEnroll} disabled={!selectedStudent}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
              Enroll
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300">
            Enrolled Students ({enrolled.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Enrolled</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {enrolled.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">No students enrolled</td></tr>
              ) : enrolled.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{s.full_name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.email}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(s.enrolled_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleUnenroll(s.id)}
                      className="text-xs text-red-500 hover:text-red-700 px-3 py-1 border border-red-200 dark:border-red-800 rounded-lg">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── COURSE MATERIALS TAB ───────────────────────────────
function MaterialsTab() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [books, setBooks] = useState([]);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getAllClasses().then((res) => {
      setClasses(res.data.classes);
      if (res.data.classes.length > 0) setSelectedClass(res.data.classes[0]);
    });
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    getPdfs(selectedClass.id).then((res) => setBooks(res.data.books)).catch(() => {});
  }, [selectedClass]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title || !selectedClass) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('classId', selectedClass.id);
      await uploadPdf(formData);
      setTitle('');
      setFile(null);
      getPdfs(selectedClass.id).then((res) => setBooks(res.data.books));
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (book) => {
    try {
      const res = await downloadPdf(book.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${book.title}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download PDF');
    }
  };

  const handleDelete = async (bookId) => {
    if (!confirm('Delete this book?')) return;
    try {
      await deletePdf(bookId);
      setBooks(books.filter((b) => b.id !== bookId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete book');
    }
  };

  return (
    <div>
      <div className="mb-4">
        <select value={selectedClass?.id || ''} onChange={(e) => setSelectedClass(classes.find((c) => c.id === parseInt(e.target.value)))}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name} - {c.subject}</option>)}
        </select>
      </div>

      <form onSubmit={handleUpload} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
        <h3 className="font-medium text-gray-900 dark:text-white mb-3">Upload PDF</h3>
        <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-3 sm:items-end">
          <div className="sm:flex-1">
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="e.g. Physics Textbook" />
          </div>
          <div className="sm:flex-1">
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">PDF File</label>
            <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} required
              className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900/30 dark:file:text-primary-400" />
          </div>
          <button type="submit" disabled={uploading}
            className="w-full sm:w-auto bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </form>

      {books.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No books uploaded for this class yet.</div>
      ) : (
        <div className="space-y-3">
          {books.map((book) => (
            <div key={book.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">{book.title}</h4>
                <p className="text-xs text-gray-400 mt-1">Uploaded {new Date(book.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleDownload(book)}
                  className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                  Download
                </button>
                <button onClick={() => handleDelete(book.id)}
                  className="text-sm text-red-500 hover:text-red-700 px-3 py-2 border border-red-200 dark:border-red-800 rounded-lg">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
