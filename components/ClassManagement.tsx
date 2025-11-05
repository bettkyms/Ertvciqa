import React, { useContext, useState, useMemo } from 'react';
import { DataContext } from '../contexts/DataContext';
import { AuthContext } from '../contexts/AuthContext';
import { Class } from '../types';

const ClassManagement: React.FC = () => {
  const { classes, addClass, updateClassName } = useContext(DataContext);
  const { currentUser } = useContext(AuthContext);

  // State for adding a new class
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  // State for editing an existing class
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const departmentClasses = useMemo(() => {
    if (!currentUser?.department) return [];
    return classes.filter(c => c.department === currentUser.department);
  }, [classes, currentUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const department = currentUser?.department;
    if (!name || !department) {
      setMessage('Please fill all fields.');
      return;
    }
    const success = addClass(name, department);
    if (success) {
      setMessage(`Class "${name}" created successfully!`);
      setName('');
      setTimeout(() => setMessage(''), 3000); // Clear message after 3 seconds
    } else {
      setMessage(`A class with the name "${name}" might already exist in this department.`);
    }
  };

  const handleEditClick = (cls: Class) => {
    setEditingClassId(cls.id);
    setEditingName(cls.name);
  };

  const handleCancelEdit = () => {
    setEditingClassId(null);
    setEditingName('');
  };

  const handleSaveEdit = (classId: string) => {
    if (updateClassName(classId, editingName)) {
      handleCancelEdit();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Add Class Form */}
      <div className="lg:col-span-1">
        <h2 className="text-xl font-bold text-slate-700 mb-1">Add New Class</h2>
        <p className="text-slate-500 mb-6 text-sm">Create a new class (student cohort) for the <span className="font-semibold">{currentUser?.department}</span> department.</p>
        <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-slate-50 rounded-lg border border-slate-200">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Class Name / Code</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g., CS-L6-24S" className="w-full p-2 border border-slate-300 rounded-md" />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">
            Create Class
          </button>
          {message && <p className="text-sm text-center text-green-700 pt-2">{message}</p>}
        </form>
      </div>

      {/* Existing Classes List */}
      <div className="lg:col-span-1">
         <h3 className="text-lg font-semibold text-slate-700 mb-3">Classes in {currentUser?.department} ({departmentClasses.length})</h3>
         <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 max-h-96 overflow-y-auto">
          {departmentClasses.length > 0 ? (
            [...departmentClasses].sort((a,b) => a.name.localeCompare(b.name)).map(cls => (
              <div key={cls.id} className="flex justify-between items-center bg-white p-3 rounded shadow-sm">
                <div className="flex-grow">
                 {editingClassId === cls.id ? (
                    <input 
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full p-1 border border-indigo-300 rounded-md"
                      autoFocus
                    />
                 ) : (
                    <div>
                      <p className="font-medium text-slate-800">{cls.name}</p>
                      <p className="text-xs text-slate-500">{cls.department}</p>
                    </div>
                 )}
                </div>
                <div className="flex items-center flex-shrink-0 ml-4">
                   {editingClassId === cls.id ? (
                    <>
                      <button onClick={() => handleSaveEdit(cls.id)} className="text-green-600 hover:text-green-800 p-1">Save</button>
                      <button onClick={handleCancelEdit} className="text-red-600 hover:text-red-800 p-1">Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => handleEditClick(cls)} className="text-indigo-600 hover:text-indigo-800 p-1 text-sm font-medium">Edit</button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 px-2">No classes found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassManagement;