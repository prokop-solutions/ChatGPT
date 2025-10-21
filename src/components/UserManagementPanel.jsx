import { useState, useMemo } from 'react';
import { ArrowLeft, Eye, EyeOff, ListChecks, LogIn, Plus, ShieldCheck, UserPlus } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_USER_SERVICE_URL || 'http://localhost:4000';

const defaultRegisterState = { email: '', password: '', status: 'pending' };
const defaultLoginState = { email: '', password: '' };

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

export default function UserManagementPanel({ onBack }) {
  const [activeTab, setActiveTab] = useState('register');
  const [registerForm, setRegisterForm] = useState(defaultRegisterState);
  const [loginForm, setLoginForm] = useState(defaultLoginState);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  const [statusInput, setStatusInput] = useState('');

  const isAuthenticated = useMemo(() => Boolean(authToken && currentUser), [authToken, currentUser]);

  const resetMessages = () => {
    setMessage(null);
    setError(null);
  };

  const handleRegisterChange = (event) => {
    const { name, value } = event.target;
    setRegisterForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  };

  const fetchWithHandling = async (path, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const messageText = payload?.message || 'Anfrage fehlgeschlagen.';
      throw new Error(messageText);
    }
    return payload;
  };

  const loadStatuses = async (token) => {
    try {
      const { statuses } = await fetchWithHandling('/api/users/me/statuses', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setStatusHistory(statuses || []);
    } catch (statusError) {
      setError(statusError.message);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    resetMessages();
    setIsLoading(true);
    try {
      const payload = await fetchWithHandling('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(registerForm)
      });
      setMessage(`Benutzer ${payload.user.email} wurde angelegt.`);
      setRegisterForm(defaultRegisterState);
    } catch (registerError) {
      setError(registerError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    resetMessages();
    setIsLoading(true);
    try {
      const payload = await fetchWithHandling('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginForm)
      });
      setAuthToken(payload.token);
      setCurrentUser(payload.user);
      setMessage('Login erfolgreich.');
      setLoginForm(defaultLoginState);
      await loadStatuses(payload.token);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStatus = async (event) => {
    event.preventDefault();
    if (!statusInput.trim()) {
      setError('Bitte einen Status eingeben.');
      return;
    }
    resetMessages();
    setIsLoading(true);
    try {
      const payload = await fetchWithHandling('/api/users/me/statuses', {
        method: 'POST',
        body: JSON.stringify({ status: statusInput.trim() }),
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      const entryId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `status-${Date.now()}`;
      setStatusHistory((prev) => [
        { id: entryId, ...payload.status },
        ...prev
      ]);
      setStatusInput('');
      setMessage('Status aktualisiert.');
      setCurrentUser((prev) =>
        prev ? { ...prev, status: payload.status.status, statusUpdatedAt: payload.status.createdAt } : prev
      );
    } catch (statusError) {
      setError(statusError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setStatusHistory([]);
    setMessage('Abgemeldet.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900 font-semibold"
          >
            <ArrowLeft className="w-5 h-5" />
            Zurück
          </button>
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="text-sm font-semibold text-red-600 hover:text-red-700"
            >
              Abmelden
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Benutzerverwaltung</h2>
            <p className="text-slate-600">
              Speichere Logins sicher (mit Bcrypt-Hashing) und führe einen getrennten Statusverlauf pro Benutzer.
            </p>
          </div>

          <div className="flex justify-center mb-6">
            <div className="inline-flex bg-slate-100 rounded-full p-1">
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeTab === 'register'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => setActiveTab('register')}
              >
                <UserPlus className="w-4 h-4" />
                Registrieren
              </button>
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeTab === 'login'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => setActiveTab('login')}
              >
                <LogIn className="w-4 h-4" />
                Anmelden
              </button>
            </div>
          </div>

          {message && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {activeTab === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">E-Mail</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={registerForm.email}
                  onChange={handleRegisterChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Passwort</label>
                <div className="relative">
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    name="password"
                    required
                    minLength={8}
                    value={registerForm.password}
                    onChange={handleRegisterChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-700"
                    aria-label="Passwort anzeigen"
                  >
                    {showRegisterPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Passwörter werden serverseitig gehasht und nie im Klartext gespeichert.
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Start-Status</label>
                <input
                  type="text"
                  name="status"
                  required
                  value={registerForm.status}
                  onChange={handleRegisterChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 text-lg font-bold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
              >
                <div className="flex items-center justify-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  {isLoading ? 'Speichere …' : 'Benutzer anlegen'}
                </div>
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">E-Mail</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={loginForm.email}
                  onChange={handleLoginChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Passwort</label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    name="password"
                    required
                    value={loginForm.password}
                    onChange={handleLoginChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-700"
                    aria-label="Passwort anzeigen"
                  >
                    {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3 text-lg font-bold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
              >
                <div className="flex items-center justify-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  {isLoading ? 'Prüfe …' : 'Anmelden'}
                </div>
              </button>
            </form>
          )}
        </div>

        {isAuthenticated && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="bg-white rounded-2xl shadow-2xl p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                <ListChecks className="w-5 h-5 text-blue-600" />
                Aktueller Status
              </h3>
              <p className="text-sm text-slate-500">{currentUser.email}</p>
              <div className="mt-4 rounded-xl bg-blue-50 p-4 text-slate-800">
                <p className="text-xl font-semibold">{currentUser.status || 'Kein Status hinterlegt'}</p>
                <p className="text-xs text-slate-500">
                  Aktualisiert: {formatDate(currentUser.statusUpdatedAt)}
                </p>
              </div>
              <form onSubmit={handleAddStatus} className="mt-6 space-y-3">
                <label className="block text-sm font-semibold text-slate-700">Status aktualisieren</label>
                <input
                  type="text"
                  value={statusInput}
                  onChange={(event) => setStatusInput(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring"
                  placeholder="z. B. aktiv, gesperrt, Prüfung …"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-lg font-bold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" />
                    {isLoading ? 'Speichere …' : 'Neuen Status hinzufügen'}
                  </div>
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-2xl p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                <ListChecks className="w-5 h-5 text-indigo-600" />
                Statusverlauf
              </h3>
              {statusHistory.length === 0 ? (
                <p className="text-sm text-slate-500">Noch keine Statusänderungen vorhanden.</p>
              ) : (
                <ul className="space-y-3">
                  {statusHistory.map((entry) => (
                    <li key={entry.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{entry.status}</span>
                        <span className="text-xs text-slate-500">{formatDate(entry.createdAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
