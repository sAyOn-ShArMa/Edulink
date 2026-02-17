import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadGradesheet, getGradesheet, analyzeGradesheet, getSchedule } from '../api/gradesheet.api';

export default function GradesheetPage() {
  const { user } = useAuth();
  const [gradesheet, setGradesheet] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!user) return;
    getGradesheet(user.id).then((res) => setGradesheet(res.data.gradesheet)).catch(() => {});
    getSchedule(user.id).then((res) => setSchedule(res.data.schedule)).catch(() => {});
  }, [user]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadGradesheet(formData);
      setGradesheet(res.data.gradesheet);
      setFile(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await analyzeGradesheet();
      setSchedule({
        schedule_json: res.data.schedule.weekly_schedule,
        recommendations: { analysis: res.data.schedule.analysis, recommendations: res.data.schedule.recommendations },
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const grades = gradesheet?.extracted_data;
  const analysis = schedule?.recommendations?.analysis;
  const recommendations = schedule?.recommendations?.recommendations;
  const weeklySchedule = schedule?.schedule_json;

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6">Gradesheet & Study Plan</h1>

      {/* Upload */}
      <form onSubmit={handleUpload} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 mb-6">
        <h3 className="font-medium text-gray-900 dark:text-white mb-3">Upload Your Gradesheet</h3>
        <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-3 sm:items-end">
          <div className="sm:flex-1">
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files[0])} required
              className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900/30 dark:file:text-primary-400" />
          </div>
          <button type="submit" disabled={uploading} className="w-full sm:w-auto bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </form>

      {/* Extracted Grades */}
      {grades && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Your Grades</h3>
            {grades.overall_percentage && (
              <span className="text-sm font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-3 py-1 rounded-full self-start">
                Overall: {grades.overall_percentage}% ({grades.overall_grade})
              </span>
            )}
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 text-gray-500 dark:text-gray-400 font-medium">Subject</th>
                <th className="text-center py-2 text-gray-500 dark:text-gray-400 font-medium">Grade</th>
                <th className="text-center py-2 text-gray-500 dark:text-gray-400 font-medium">Percentage</th>
                <th className="text-left py-2 text-gray-500 dark:text-gray-400 font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {grades.subjects?.map((s, i) => (
                <tr key={i} className="border-b border-gray-50 dark:border-gray-800">
                  <td className="py-2.5 text-gray-900 dark:text-gray-100">{s.name}</td>
                  <td className="py-2.5 text-center text-gray-700 dark:text-gray-300">{s.grade}</td>
                  <td className="py-2.5 text-center">
                    <span className={`font-medium ${s.percentage >= 80 ? 'text-green-600 dark:text-green-400' : s.percentage >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                      {s.percentage}%
                    </span>
                  </td>
                  <td className="py-2.5 text-gray-500 dark:text-gray-400">{s.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <button onClick={handleAnalyze} disabled={analyzing}
            className="mt-4 bg-purple-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
            {analyzing ? 'AI is analyzing...' : 'Generate AI Study Schedule'}
          </button>
        </div>
      )}

      {/* AI Analysis */}
      {analysis && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-5 mb-6">
          <h3 className="font-semibold text-purple-800 dark:text-purple-400 mb-3">AI Analysis</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{analysis.overall_assessment}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">Strengths</h4>
              <ul className="space-y-1">
                {analysis.strengths?.map((s, i) => <li key={i} className="text-sm text-gray-600 dark:text-gray-400">+ {s}</li>)}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Areas to Improve</h4>
              <ul className="space-y-1">
                {analysis.weaknesses?.map((w, i) => <li key={i} className="text-sm text-gray-600 dark:text-gray-400">- {w}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Schedule */}
      {weeklySchedule && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Your Weekly Study Schedule</h3>
          <div className="space-y-4">
            {weeklySchedule.map((day, i) => (
              <div key={i}>
                <h4 className="text-sm font-bold text-primary-700 dark:text-primary-400 mb-2">{day.day}</h4>
                <div className="space-y-2">
                  {day.blocks?.map((block, j) => (
                    <div key={j} className="flex flex-col sm:flex-row items-start gap-1 sm:gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400 sm:w-32 shrink-0">{block.time}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{block.subject}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{block.focus}</p>
                        <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">{block.technique}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Study Tips</h3>
          <ul className="space-y-2">
            {recommendations.map((r, i) => (
              <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                <span className="text-primary-600 dark:text-primary-400 mt-0.5">*</span> {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
