import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPortfolio, updatePortfolio } from '../api/portfolio.api';

export default function PortfolioPage() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ bio: '', interests: '', achievements: [], projects: [] });
  const [saving, setSaving] = useState(false);
  const [newAchievement, setNewAchievement] = useState({ title: '', description: '' });
  const [newProject, setNewProject] = useState({ title: '', description: '', link: '' });

  useEffect(() => {
    if (!user) return;
    getPortfolio(user.id)
      .then((res) => {
        setPortfolio(res.data);
        setForm({
          bio: res.data.portfolio.bio || '',
          interests: res.data.portfolio.interests || '',
          achievements: res.data.portfolio.achievements || [],
          projects: res.data.portfolio.projects || [],
        });
      })
      .catch(() => {});
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updatePortfolio(form);
      setPortfolio({ ...portfolio, portfolio: res.data.portfolio });
      setEditing(false);
    } catch (err) {
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addAchievement = () => {
    if (!newAchievement.title) return;
    setForm({ ...form, achievements: [...form.achievements, { ...newAchievement, date: new Date().toISOString().split('T')[0] }] });
    setNewAchievement({ title: '', description: '' });
  };

  const removeAchievement = (i) => setForm({ ...form, achievements: form.achievements.filter((_, idx) => idx !== i) });

  const addProject = () => {
    if (!newProject.title) return;
    setForm({ ...form, projects: [...form.projects, { ...newProject }] });
    setNewProject({ title: '', description: '', link: '' });
  };

  const removeProject = (i) => setForm({ ...form, projects: form.projects.filter((_, idx) => idx !== i) });

  if (!portfolio) return <div className="p-6 text-gray-400">Loading portfolio...</div>;

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">My Portfolio</h1>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
            Edit Portfolio
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="text-sm text-gray-500 dark:text-gray-400 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Profile card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
            <span className="text-primary-600 dark:text-primary-400 font-bold text-xl">{user?.full_name?.[0]}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{portfolio.user?.full_name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{portfolio.user?.email}</p>
          </div>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
              <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="Tell us about yourself..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Interests</label>
              <input type="text" value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="e.g. Mathematics, Science, Art" />
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{portfolio.portfolio.bio || 'No bio yet.'}</p>
            {portfolio.portfolio.interests && (
              <div className="flex flex-wrap gap-2 mt-3">
                {portfolio.portfolio.interests.split(',').map((i, idx) => (
                  <span key={idx} className="text-xs bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-2.5 py-1 rounded-full">{i.trim()}</span>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Achievements */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Achievements</h3>
        {form.achievements.length === 0 && !editing && <p className="text-sm text-gray-400">No achievements added yet.</p>}
        <div className="space-y-3">
          {form.achievements.map((a, i) => (
            <div key={i} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{a.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{a.description}</p>
              </div>
              {editing && (
                <button onClick={() => removeAchievement(i)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
              )}
            </div>
          ))}
        </div>
        {editing && (
          <div className="mt-3 space-y-2 sm:space-y-0 sm:flex sm:gap-2 sm:items-end">
            <input type="text" placeholder="Title" value={newAchievement.title} onChange={(e) => setNewAchievement({ ...newAchievement, title: e.target.value })}
              className="w-full sm:flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            <input type="text" placeholder="Description" value={newAchievement.description} onChange={(e) => setNewAchievement({ ...newAchievement, description: e.target.value })}
              className="w-full sm:flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            <button onClick={addAchievement} className="w-full sm:w-auto text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">Add</button>
          </div>
        )}
      </div>

      {/* Projects */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Projects</h3>
        {form.projects.length === 0 && !editing && <p className="text-sm text-gray-400">No projects added yet.</p>}
        <div className="space-y-3">
          {form.projects.map((p, i) => (
            <div key={i} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{p.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{p.description}</p>
                {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">{p.link}</a>}
              </div>
              {editing && (
                <button onClick={() => removeProject(i)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
              )}
            </div>
          ))}
        </div>
        {editing && (
          <div className="mt-3 space-y-2 sm:space-y-0 sm:flex sm:gap-2 sm:items-end">
            <input type="text" placeholder="Title" value={newProject.title} onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
              className="w-full sm:flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            <input type="text" placeholder="Description" value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              className="w-full sm:flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            <input type="text" placeholder="Link (optional)" value={newProject.link} onChange={(e) => setNewProject({ ...newProject, link: e.target.value })}
              className="w-full sm:flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            <button onClick={addProject} className="w-full sm:w-auto text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">Add</button>
          </div>
        )}
      </div>
    </div>
  );
}
