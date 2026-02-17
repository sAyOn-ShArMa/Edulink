import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyClasses } from '../api/class.api';
import { getPdfs, uploadPdf, deletePdf, downloadPdf } from '../api/pdf.api';
import { generateFlashcards } from '../api/flashcard.api';

export default function CourseBooksPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [books, setBooks] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [generating, setGenerating] = useState(null);

  useEffect(() => {
    getMyClasses().then((res) => {
      setClasses(res.data.classes);
      if (res.data.classes.length > 0) setSelectedClass(res.data.classes[0]);
    });
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    getPdfs(selectedClass.id).then((res) => setBooks(res.data.books));
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

  const handleDelete = async (id) => {
    if (!confirm('Delete this book?')) return;
    await deletePdf(id);
    setBooks(books.filter((b) => b.id !== id));
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
      alert(err.response?.data?.error || 'Failed to download PDF');
    }
  };

  const handleGenerateFlashcards = async (book, scope, unitNumber) => {
    setGenerating(book.id);
    try {
      await generateFlashcards(book.id, scope, unitNumber);
      alert('Flashcards generated! Go to the Flashcards page to study.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate flashcards');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6">Course Books</h1>

      <div className="mb-4">
        <select value={selectedClass?.id || ''} onChange={(e) => setSelectedClass(classes.find((c) => c.id === parseInt(e.target.value)))}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name} - {c.subject}</option>)}
        </select>
      </div>

      {user?.role === 'teacher' && (
        <form onSubmit={handleUpload} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">Upload a Book</h3>
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
            <button type="submit" disabled={uploading} className="w-full sm:w-auto bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      )}

      {books.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No books uploaded for this class yet.</div>
      ) : (
        <div className="space-y-4">
          {books.map((book) => (
            <div key={book.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{book.title}</h3>
                  <p className="text-sm text-gray-400 mt-1">Uploaded {new Date(book.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleDownload(book)}
                    className="text-xs text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 px-3 py-1 border border-green-200 dark:border-green-800 rounded-lg">
                    Download
                  </button>
                  {user?.role === 'teacher' && (
                    <button onClick={() => handleDelete(book.id)} className="text-xs text-red-500 hover:text-red-700 px-3 py-1 border border-red-200 dark:border-red-800 rounded-lg">Delete</button>
                  )}
                </div>
              </div>

              {book.unit_metadata?.units && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Units / Chapters</h4>
                  <div className="flex flex-wrap gap-2">
                    {book.unit_metadata.units.map((unit) => (
                      <button key={unit.unit_number} onClick={() => handleGenerateFlashcards(book, 'unit', unit.unit_number)}
                        disabled={generating === book.id}
                        className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-primary-50 hover:text-primary-700 dark:hover:bg-primary-900/30 dark:hover:text-primary-400 disabled:opacity-50">
                        Unit {unit.unit_number}: {unit.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
