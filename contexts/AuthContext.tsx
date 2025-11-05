import React, { createContext, useState, ReactNode, useContext } from 'react';
import { User, Role } from '../types';
import { USERS } from '../constants';
import { DataContext } from './DataContext';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (username: string, password: string) => boolean;
  loginAs: (userId: string) => void;
  logout: () => void;
  addUser: (newUser: Omit<User, 'id'>) => boolean;
  updateUser: (userId: string, updatedData: Partial<Omit<User, 'id' | 'username'>>) => boolean;
  deleteUser: (userId: string) => void;
}

export const AuthContext = createContext<AuthContextType>(null!);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(USERS);
  const { addTrainer, updateTrainer, deleteTrainer } = useContext(DataContext);

  const login = (username: string, password: string): boolean => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const loginAs = (userId: string): void => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const addUser = (newUser: Omit<User, 'id'>): boolean => {
    if (users.some(u => u.username.toLowerCase() === newUser.username.toLowerCase())) {
      return false; // Username already exists
    }
    
    const newId = `user-${Date.now()}`;
    const userWithId: User = {
      ...newUser,
      id: newId,
    };
    
    // If the new user is a trainer, add them to the trainers list in DataContext
    if (userWithId.role === Role.Trainer && userWithId.department) {
      addTrainer(newId, userWithId.name, userWithId.department);
    }
    
    setUsers(prevUsers => [...prevUsers, userWithId]);
    return true;
  };

  const updateUser = (userId: string, updatedData: Partial<Omit<User, 'id' | 'username'>>): boolean => {
    setUsers(prevUsers => {
      const userIndex = prevUsers.findIndex(u => u.id === userId);
      if (userIndex === -1) return prevUsers;
      
      const updatedUsers = [...prevUsers];
      const oldUser = updatedUsers[userIndex];
      const newUser = { ...oldUser, ...updatedData };
      updatedUsers[userIndex] = newUser;
      
      // Sync with trainers list if it's a trainer
      if (newUser.role === Role.Trainer) {
        if (newUser.name !== oldUser.name || newUser.department !== oldUser.department) {
          updateTrainer(userId, newUser.name, newUser.department!);
        }
      }
      
      return updatedUsers;
    });
    return true;
  };
  
  const deleteUser = (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;
    
    // if trainer, delete from trainers list
    if (userToDelete.role === Role.Trainer) {
      deleteTrainer(userId);
    }

    setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
  };


  const value = {
    currentUser,
    users,
    login,
    loginAs,
    logout,
    addUser,
    updateUser,
    deleteUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};