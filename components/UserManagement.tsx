import React, { useContext, useState, useMemo, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Role, User } from '../types';

const UserManagement: React.FC = () => {
  const { currentUser, users, addUser, updateUser, deleteUser } = useContext(AuthContext);

  // State for the "Add User" form
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(currentUser?.role === Role.IQA ? Role.HOD : Role.Trainer);
  const [department, setDepartment] = useState('');
  const [message, setMessage] = useState('');
  
  // State for the "Edit User" modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<Role>(Role.Trainer);
  const [editDepartment, setEditDepartment] = useState('');
  const [editEPortfolioLink, setEditEPortfolioLink] = useState('');

  // Set initial department for HOD
  useEffect(() => {
    if (currentUser?.role === Role.HOD) {
      setDepartment(currentUser.department || '');
    }
  }, [currentUser]);


  const isIQA = currentUser?.role === Role.IQA;

  const displayUsers = useMemo(() => {
    if (isIQA) {
      return users.filter(u => u.role !== Role.IQA);
    }
    // HOD sees users in their department, excluding themselves
    return users.filter(u => u.department === currentUser?.department && u.id !== currentUser?.id);
  }, [users, currentUser, isIQA]);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (!name || !username || !password || !role || !department) {
      setMessage('Please fill all fields, including department.');
      return;
    }
    const success = addUser({
      name,
      username,
      password,
      role,
      department,
      ePortfolioLink: '',
    });
    if (success) {
      setMessage(`User "${name}" created successfully!`);
      setName('');
      setUsername('');
      setPassword('');
      if (isIQA) {
          setDepartment('');
          setRole(Role.HOD);
      }
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage(`A user with the username "${username}" already exists.`);
    }
  };
  
  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditPassword('');
    setEditRole(user.role);
    setEditDepartment(user.department || '');
    setEditEPortfolioLink(user.ePortfolioLink || '');
    setIsModalOpen(true);
  };
  
  const closeEditModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };
  
  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    const updatedData: Partial<Omit<User, 'id' | 'username'>> = {
      name: editName,
      role: editRole,
      department: editDepartment,
      ePortfolioLink: editEPortfolioLink,
    };
    
    if (editPassword) {
      updatedData.password = editPassword;
    }
    
    updateUser(editingUser.id, updatedData);
    closeEditModal();
  };
  
  const handleDeleteUser = (userId: string, userName: string) => {
    if (window.confirm(`Are you sure you want to delete the user "${userName}"? This action cannot be undone.`)) {
      deleteUser(userId);
    }
  };

  const EditUserModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Edit User: {editingUser?.name}</h2>
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required className="w-full p-2 border border-slate-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username (cannot be changed)</label>
            <input type="text" value={editingUser?.username} readOnly disabled className="w-full p-2 border border-slate-300 rounded-md bg-slate-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password (optional)</label>
            <input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Leave blank to keep current password" className="w-full p-2 border border-slate-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
            <input 
              type="text" 
              value={editDepartment} 
              onChange={e => setEditDepartment(e.target.value)} 
              required 
              disabled={!isIQA}
              className="w-full p-2 border border-slate-300 rounded-md disabled:bg-slate-200" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select value={editRole} onChange={e => setEditRole(e.target.value as Role)} required className="w-full p-2 border border-slate-300 rounded-md bg-white">
              {isIQA && <option value={Role.HOD}>Head of Department</option>}
              <option value={Role.Trainer}>Trainer</option>
              <option value={Role.ClassRep}>Class Rep</option>
            </select>
          </div>
          {editRole === Role.Trainer && (
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-Portfolio Link</label>
                <input type="url" value={editEPortfolioLink} onChange={e => setEditEPortfolioLink(e.target.value)} placeholder="https://example.com/portfolio" className="w-full p-2 border border-slate-300 rounded-md" />
            </div>
          )}
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={closeEditModal} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {isModalOpen && <EditUserModal />}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Add User Form */}
        <div className="lg:col-span-1">
          <h2 className="text-xl font-bold text-slate-700 mb-1">Add New User</h2>
          <p className="text-slate-500 mb-6 text-sm">
            {isIQA ? 'Create a new user account for any role.' : `Create a new user for the ${currentUser?.department} department.`}
          </p>
          <form onSubmit={handleAddUser} className="space-y-4 p-6 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 border border-slate-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full p-2 border border-slate-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Initial Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full p-2 border border-slate-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
              <input 
                type="text" 
                value={department} 
                onChange={e => setDepartment(e.target.value)} 
                required 
                disabled={!isIQA}
                placeholder="e.g., Computer Science" 
                className="w-full p-2 border border-slate-300 rounded-md disabled:bg-slate-200" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select value={role} onChange={e => setRole(e.target.value as Role)} required className="w-full p-2 border border-slate-300 rounded-md bg-white">
                {isIQA && <option value={Role.HOD}>Head of Department</option>}
                <option value={Role.Trainer}>Trainer</option>
                <option value={Role.ClassRep}>Class Rep</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">
              Create User
            </button>
            {message && <p className="text-sm text-center text-green-700 pt-2">{message}</p>}
          </form>
        </div>

        {/* Existing Users List */}
        <div className="lg:col-span-1">
          <h3 className="text-lg font-semibold text-slate-700 mb-3">{isIQA ? `All Users` : `Users in ${currentUser?.department}`} ({displayUsers.length})</h3>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 max-h-96 overflow-y-auto">
            {displayUsers.length > 0 ? (
              [...displayUsers].sort((a, b) => a.name.localeCompare(b.name)).map(user => (
                <div key={user.id} className="bg-white p-3 rounded shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="mb-2 sm:mb-0 flex-grow">
                    <p className="font-medium text-slate-800">{user.name}</p>
                    <p className="text-xs text-slate-500">@{user.username} ({user.department})</p>
                    <div className="flex items-center mt-1">
                        <p className="text-sm text-slate-600 font-semibold">{user.role}</p>
                        {user.role === Role.Trainer && user.ePortfolioLink && (
                            <>
                                <span className="mx-2 text-slate-300">|</span>
                                <a href={user.ePortfolioLink} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:underline">
                                    Portfolio
                                </a>
                            </>
                        )}
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-center flex-shrink-0">
                    <button onClick={() => openEditModal(user)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-100 px-3 py-1 rounded-md">Edit</button>
                    <button onClick={() => handleDeleteUser(user.id, user.name)} className="text-xs font-semibold text-red-600 hover:text-red-800 bg-red-100 px-3 py-1 rounded-md">Delete</button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 px-2 text-center py-4">No users found.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UserManagement;