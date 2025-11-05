import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { DataContext } from '../contexts/DataContext';

const LoginPage: React.FC = () => {
  const { login } = useContext(AuthContext);
  const { logo } = useContext(DataContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = login(username, password);
    if (!success) {
      setError('Invalid username or password. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
        {logo && (
            <div className="mb-6 flex justify-center">
                <img src={logo} alt="Institution Logo" className="max-h-24 object-contain" />
            </div>
        )}
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Eldama Ravine Technical and Vocational College</h1>
        <p className="text-slate-500 mb-8">
          IQA Attendance Tracker
        </p>
        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              placeholder="e.g., iqaadmin"
            />
          </div>
          <div>
            <label htmlFor="password"  className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              placeholder="e.g., password123"
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300 disabled:bg-indigo-300"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;