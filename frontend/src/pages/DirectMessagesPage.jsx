import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  getAvailableTeachers,
  getConversations,
  startConversation,
  getDmMessages,
  askAiAssistant,
  deleteConversation,
} from '../api/dm.api';

export default function DirectMessagesPage() {
  const { user } = useAuth();
  const socket = useSocket();
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef(null);

  // Load contacts and conversations
  useEffect(() => {
    getAvailableTeachers().then((res) => setContacts(res.data.contacts));
    getConversations().then((res) => setConversations(res.data.conversations));
  }, []);

  // Load messages when a conversation is selected
  useEffect(() => {
    if (!selectedConvo) return;
    getDmMessages(selectedConvo.id).then((res) => setMessages(res.data.messages));

    if (socket) {
      socket.emit('join_dm', selectedConvo.id);
      const handler = (msg) => {
        setMessages((prev) => [...prev, msg]);
      };
      socket.on('new_dm', handler);
      return () => {
        socket.emit('leave_dm', selectedConvo.id);
        socket.off('new_dm', handler);
      };
    }
  }, [selectedConvo, socket]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStartConversation = async (contact) => {
    const payload = user.role === 'student'
      ? { teacherId: contact.id }
      : { studentId: contact.id };

    const res = await startConversation(payload);
    const convo = res.data.conversation;

    // Refresh conversation list
    const convosRes = await getConversations();
    setConversations(convosRes.data.conversations);

    // Select the new/existing conversation
    const found = convosRes.data.conversations.find((c) => c.id === convo.id);
    setSelectedConvo(found || convo);
    setShowContacts(false);
    setShowSidebar(false);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !selectedConvo) return;
    socket.emit('send_dm', { conversationId: selectedConvo.id, content: newMessage });
    setNewMessage('');
  };

  const handleAiAssist = async (e) => {
    e.preventDefault();
    if (!aiQuestion.trim() || !selectedConvo) return;
    setAiLoading(true);
    try {
      const res = await askAiAssistant(selectedConvo.id, aiQuestion);
      // AI response is saved as a message, add it locally
      setMessages((prev) => [...prev, res.data.message]);
      setAiQuestion('');
    } catch (err) {
      alert(err.response?.data?.error || 'AI assistant failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleDeleteConversation = async (convoId) => {
    if (!confirm('Delete this conversation? All messages will be permanently removed.')) return;
    try {
      await deleteConversation(convoId);
      setConversations((prev) => prev.filter((c) => c.id !== convoId));
      if (selectedConvo?.id === convoId) {
        setSelectedConvo(null);
        setMessages([]);
      }
    } catch {
      alert('Failed to delete conversation');
    }
  };

  const selectConversation = (convo) => {
    setSelectedConvo(convo);
    setShowSidebar(false);
  };

  const contactName = (convo) => {
    return user.role === 'student' ? convo.teacher_name : convo.student_name;
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-57px)]">
      {/* Mobile header */}
      <div className="md:hidden flex items-center gap-2 p-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <button onClick={() => setShowSidebar(!showSidebar)} className="p-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
          {selectedConvo ? contactName(selectedConvo) : 'Direct Messages'}
        </span>
      </div>

      {/* Overlay for mobile sidebar */}
      {showSidebar && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setShowSidebar(false)} />
      )}

      {/* Left panel - conversation list */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50
        w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${showSidebar ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
            {user?.role === 'student' ? 'My Teachers' : 'My Students'}
          </h3>
          <button onClick={() => setShowContacts(!showContacts)}
            className="text-xs bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700">
            + New
          </button>
        </div>

        {/* New conversation - contact picker */}
        {showContacts && (
          <div className="border-b border-gray-100 dark:border-gray-700 max-h-48 overflow-y-auto">
            {contacts.length === 0 ? (
              <p className="text-xs text-gray-400 p-3 text-center">
                {user?.role === 'student' ? 'No teachers found. Enroll in a class first.' : 'No students found.'}
              </p>
            ) : (
              contacts.map((c) => (
                <button key={c.id} onClick={() => handleStartConversation(c)}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-50 dark:border-gray-800">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{c.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">{c.class_names}</p>
                </button>
              ))
            )}
          </div>
        )}

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="text-xs text-gray-400 text-center mt-8 px-4">
              No conversations yet. Click "+ New" to start one.
            </p>
          ) : (
            conversations.map((convo) => (
              <button key={convo.id} onClick={() => selectConversation(convo)}
                className={`w-full text-left px-3 py-3 border-b border-gray-50 dark:border-gray-800 ${
                  selectedConvo?.id === convo.id
                    ? 'bg-primary-50 dark:bg-primary-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-700 dark:text-primary-400 font-semibold text-sm shrink-0">
                    {contactName(convo)?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{contactName(convo)}</p>
                    <p className="text-xs text-gray-400 truncate">{convo.class_name} &middot; {convo.class_subject}</p>
                    {convo.last_message && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{convo.last_message}</p>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedConvo ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm">Select a conversation or start a new one</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-700 dark:text-primary-400 font-semibold text-sm">
                {contactName(selectedConvo)?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{contactName(selectedConvo)}</p>
                <p className="text-xs text-gray-400">{selectedConvo.class_name} &middot; {selectedConvo.class_subject}</p>
              </div>
              <button onClick={() => handleDeleteConversation(selectedConvo.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors" title="Delete conversation">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
              {messages.map((msg) => {
                const isOwn = msg.sender_id === user?.id && !msg.is_ai_response;
                const isAi = msg.is_ai_response === 1;

                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] sm:max-w-[70%] rounded-xl px-3 sm:px-4 py-2.5 ${
                      isAi
                        ? 'bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 border border-purple-200 dark:border-purple-700'
                        : isOwn
                          ? 'bg-primary-600 text-white'
                          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                    }`}>
                      <div className={`text-xs font-medium mb-1 ${
                        isAi ? 'text-purple-600 dark:text-purple-400'
                          : isOwn ? 'text-primary-100'
                          : 'text-gray-400'
                      }`}>
                        {isAi ? 'AI Assistant' : msg.sender_name}
                        {!isAi && msg.sender_role === 'teacher' && <span className="text-purple-400 ml-1">(Teacher)</span>}
                      </div>
                      <p className={`text-sm break-words whitespace-pre-line ${
                        isAi ? 'text-gray-800 dark:text-gray-200'
                          : !isOwn ? 'text-gray-900 dark:text-gray-100'
                          : ''
                      }`}>{msg.content}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
              {messages.length === 0 && (
                <p className="text-center text-gray-400 text-sm mt-8">
                  Start the conversation! {user?.role === 'student' && 'You can also ask the AI assistant for help.'}
                </p>
              )}
            </div>

            {/* AI Assistant bar (students only) */}
            {user?.role === 'student' && (
              <form onSubmit={handleAiAssist} className="px-3 sm:px-4 pt-2 pb-1 border-t border-gray-100 dark:border-gray-800 bg-purple-50/50 dark:bg-purple-900/10">
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span className="text-xs font-medium">AI</span>
                  </div>
                  <input type="text" value={aiQuestion} onChange={(e) => setAiQuestion(e.target.value)}
                    placeholder="Ask AI about this class..."
                    className="flex-1 min-w-0 px-3 py-1.5 border border-purple-200 dark:border-purple-700 rounded-lg outline-none focus:ring-2 focus:ring-purple-400 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                  <button type="submit" disabled={aiLoading}
                    className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50 whitespace-nowrap">
                    {aiLoading ? '...' : 'Ask'}
                  </button>
                </div>
              </form>
            )}

            {/* Message input */}
            <form onSubmit={sendMessage} className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="flex gap-2">
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                <button type="submit"
                  className="bg-primary-600 text-white px-4 sm:px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-700 whitespace-nowrap">
                  Send
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
