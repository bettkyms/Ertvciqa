import React, { createContext, useState, ReactNode } from 'react';
import { Class, Trainee, Trainer, Unit, Remark, TrainerSchedule, WeeklyScheduleInput, TraineeAttendanceRecord, UnitAssignment } from '../types';
import { CLASSES, TRAINEES, TRAINERS, UNITS, UNIT_ASSIGNMENTS } from '../constants';

// --- Historical Data for 2024 ---
const PREVIOUS_TRAINER_SCHEDULES: TrainerSchedule[] = [
  {
    id: 'schedule-2024-1',
    classId: 'class-1',
    week: '2024-W42', // A week in October 2024
    submittedBy: 'user-rep-1', // Alex Ray
    submittedAt: '2024-10-21T10:00:00Z',
    schedule: {
      monday: {
        '08:00-10:00': { unitId: 'unit-1', trainerId: 'trainer-1', status: 'Taught' },
        '10:00-12:00': { unitId: 'unit-2', trainerId: 'trainer-3', status: 'Taught' },
      },
      tuesday: {
        '13:00-15:00': { unitId: 'unit-1', trainerId: 'trainer-1', status: 'Assignment' },
      },
      wednesday: {},
      thursday: {
        '08:00-10:00': { unitId: 'unit-2', trainerId: 'trainer-3', status: 'Taught' },
      },
      friday: {},
    },
  },
];

const PREVIOUS_TRAINEE_RECORDS: TraineeAttendanceRecord[] = [
  // Session 1: 2024-10-14 08:00 for Class-1 (CS-L6-24S)
  { traineeId: 'trainee-1', classId: 'class-1', unitId: 'unit-1', trainerId: 'trainer-1', date: '2024-10-14', time: '08:00', status: 'present' },
  { traineeId: 'trainee-2', classId: 'class-1', unitId: 'unit-1', trainerId: 'trainer-1', date: '2024-10-14', time: '08:00', status: 'present' },
  { traineeId: 'trainee-3', classId: 'class-1', unitId: 'unit-1', trainerId: 'trainer-1', date: '2024-10-14', time: '08:00', status: 'present' },
  { traineeId: 'trainee-4', classId: 'class-1', unitId: 'unit-1', trainerId: 'trainer-1', date: '2024-10-14', time: '08:00', status: 'absent' },
  { traineeId: 'trainee-5', classId: 'class-1', unitId: 'unit-1', trainerId: 'trainer-1', date: '2024-10-14', time: '08:00', status: 'absent' },
  // Session 2: 2024-10-14 10:00 for Class-1
  { traineeId: 'trainee-1', classId: 'class-1', unitId: 'unit-2', trainerId: 'trainer-3', date: '2024-10-14', time: '10:00', status: 'present' },
  { traineeId: 'trainee-2', classId: 'class-1', unitId: 'unit-2', trainerId: 'trainer-3', date: '2024-10-14', time: '10:00', status: 'present' },
  { traineeId: 'trainee-3', classId: 'class-1', unitId: 'unit-2', trainerId: 'trainer-3', date: '2024-10-14', time: '10:00', status: 'absent' },
  { traineeId: 'trainee-4', classId: 'class-1', unitId: 'unit-2', trainerId: 'trainer-3', date: '2024-10-14', time: '10:00', status: 'present' },
  { traineeId: 'trainee-5', classId: 'class-1', unitId: 'unit-2', trainerId: 'trainer-3', date: '2024-10-14', time: '10:00', status: 'present' },
];

// --- Dummy Data for Easy Demonstration ---
const DEMO_TRAINER_SCHEDULES: TrainerSchedule[] = [
  {
    id: 'schedule-demo-1',
    classId: 'class-1', // CS-L6-24S
    week: '2025-W05', // A week in Feb 2025
    submittedBy: 'user-rep-1', // Alex Ray
    submittedAt: '2025-02-10T11:00:00Z',
    schedule: {
      monday: {
        '08:00-10:00': { unitId: 'unit-1', trainerId: 'trainer-1', status: 'Taught' },
        '10:00-12:00': { unitId: 'unit-2', trainerId: 'trainer-3', status: 'Taught' },
      },
      tuesday: {
        '13:00-15:00': { unitId: 'unit-1', trainerId: 'trainer-1', status: 'Taught' },
      },
      wednesday: {
        '08:00-10:00': { unitId: 'unit-2', trainerId: 'trainer-3', status: 'Assignment' },
      },
      thursday: {
        '10:00-12:00': { unitId: 'unit-1', trainerId: 'trainer-1', status: 'Taught' },
      },
      friday: {},
    },
  },
];

const DEMO_TRAINEE_RECORDS: TraineeAttendanceRecord[] = [
  // Data for 2025-W05 for class-1
  // Monday, Feb 3, 2025
  // Session 1: 08:00
  { traineeId: 'trainee-1', classId: 'class-1', unitId: 'unit-1', trainerId: 'trainer-1', date: '2025-02-03', time: '08:00', status: 'present' },
  { traineeId: 'trainee-2', classId: 'class-1', unitId: 'unit-1', trainerId: 'trainer-1', date: '2025-02-03', time: '08:00', status: 'present' },
  { traineeId: 'trainee-3', classId: 'class-1', unitId: 'unit-1', trainerId: 'trainer-1', date: '2025-02-03', time: '08:00', status: 'absent' },
  { traineeId: 'trainee-4', classId: 'class-1', unitId: 'unit-1', trainerId: 'trainer-1', date: '2025-02-03', time: '08:00', status: 'present' },
  { traineeId: 'trainee-5', classId: 'class-1', unitId: 'unit-1', trainerId: 'trainer-1', date: '2025-02-03', time: '08:00', status: 'present' },
  // Session 2: 10:00
  { traineeId: 'trainee-1', classId: 'class-1', unitId: 'unit-2', trainerId: 'trainer-3', date: '2025-02-03', time: '10:00', status: 'present' },
  { traineeId: 'trainee-2', classId: 'class-1', unitId: 'unit-2', trainerId: 'trainer-3', date: '2025-02-03', time: '10:00', status: 'absent' },
  { traineeId: 'trainee-3', classId: 'class-1', unitId: 'unit-2', trainerId: 'trainer-3', date: '2025-02-03', time: '10:00', status: 'present' },
  { traineeId: 'trainee-4', classId: 'class-1', unitId: 'unit-2', trainerId: 'trainer-3', date: '2025-02-03', time: '10:00', status: 'present' },
  { traineeId: 'trainee-5', classId: 'class-1', unitId: 'unit-2', trainerId: 'trainer-3', date: '2025-02-03', time: '10:00', status: 'present' },
  // Tuesday, Feb 4, 2025
  { traineeId: 'trainee-1', classId: 'class-1', unitId: 'unit-1', trainerId: 'trainer-1', date: '2025-02-04', time: '13:00', status: 'present' },
  { traineeId: 'trainee-2', classId: 'class-1', unitId: 'unit-1', trainerId: 'trainer-1', date: '2025-02-04', time: '13:00', status: 'present' },
  { traineeId: 'trainee-3', classId: 'class-1', unitId: 'unit-1', trainerId: 'trainer-1', date: '2025-02-04', time: '13:00', status: 'present' },
  { traineeId: 'trainee-4', classId: 'class-1', unitId: 'unit-1', trainerId: 'trainer-1', date: '2025-02-04', time: '13:00', status: 'present' },
  { traineeId: 'trainee-5', classId: 'class-1', unitId: 'unit-1', trainerId: 'trainer-1', date: '2025-02-04', time: '13:00', status: 'present' },
   // Wednesday, Feb 5, 2025
  { traineeId: 'trainee-1', classId: 'class-1', unitId: 'unit-2', trainerId: 'trainer-3', date: '2025-02-05', time: '08:00', status: 'present' },
  { traineeId: 'trainee-2', classId: 'class-1', unitId: 'unit-2', trainerId: 'trainer-3', date: '2025-02-05', time: '08:00', status: 'present' },
  { traineeId: 'trainee-3', classId: 'class-1', unitId: 'unit-2', trainerId: 'trainer-3', date: '2025-02-05', time: '08:00', status: 'present' },
  { traineeId: 'trainee-4', classId: 'class-1', unitId: 'unit-2', trainerId: 'trainer-3', date: '2025-02-05', time: '08:00', status: 'absent' },
  { traineeId: 'trainee-5', classId: 'class-1', unitId: 'unit-2', trainerId: 'trainer-3', date: '2025-02-05', time: '08:00', status: 'absent' },
];


interface DataContextType {
  classes: Class[];
  trainees: Trainee[];
  trainers: Trainer[];
  units: Unit[];
  unitAssignments: UnitAssignment[];
  remarks: Remark[];
  trainerSchedules: TrainerSchedule[];
  traineeAttendanceRecords: TraineeAttendanceRecord[];
  logo: string | null;
  setLogo: (logo: string | null) => void;
  addTrainer: (id: string, name: string, department: string) => void;
  updateTrainer: (id: string, newName: string, newDepartment: string) => void;
  deleteTrainer: (id: string) => void;
  addTrainee: (name: string, admissionNumber: string, classId: string) => boolean;
  addClass: (name: string, department: string) => boolean;
  addUnit: (name: string, classId: string) => boolean;
  assignUnitToTrainer: (unitId: string, trainerId: string) => void;
  addRemark: (newRemarkData: Omit<Remark, 'id'>) => void;
  updateClassName: (classId: string, newName: string) => boolean;
  addTrainerSchedule: (newScheduleData: Omit<TrainerSchedule, 'id' | 'submittedAt'>) => void;
  addTraineeAttendance: (records: TraineeAttendanceRecord[]) => void;
}

export const DataContext = createContext<DataContextType>(null!);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [classes, setClasses] = useState<Class[]>(CLASSES);
  const [trainees, setTrainees] = useState<Trainee[]>(TRAINEES);
  const [trainers, setTrainers] = useState<Trainer[]>(TRAINERS);
  const [units, setUnits] = useState<Unit[]>(UNITS);
  const [unitAssignments, setUnitAssignments] = useState<UnitAssignment[]>(UNIT_ASSIGNMENTS);
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [trainerSchedules, setTrainerSchedules] = useState<TrainerSchedule[]>([...PREVIOUS_TRAINER_SCHEDULES, ...DEMO_TRAINER_SCHEDULES]);
  const [traineeAttendanceRecords, setTraineeAttendanceRecords] = useState<TraineeAttendanceRecord[]>([...PREVIOUS_TRAINEE_RECORDS, ...DEMO_TRAINEE_RECORDS]);
  const [logo, setLogo] = useState<string | null>(null);

  const addTrainer = (id: string, name: string, department: string) => {
    setTrainers(prev => [...prev, { id, name, department }]);
  };
  
  const updateTrainer = (id: string, newName: string, newDepartment: string) => {
    setTrainers(prev => prev.map(t => t.id === id ? { ...t, name: newName, department: newDepartment } : t));
  };

  const deleteTrainer = (id: string) => {
    setTrainers(prev => prev.filter(t => t.id !== id));
  };

  const addTrainee = (name: string, admissionNumber: string, classId: string): boolean => {
    if (trainees.some(t => t.admissionNumber === admissionNumber)) {
      return false;
    }
    const newTrainee: Trainee = {
      id: `trainee-${Date.now()}`,
      name,
      admissionNumber,
      classId,
    };
    setTrainees(prev => [...prev, newTrainee]);
    return true;
  };

  const addClass = (name: string, department: string): boolean => {
    if (classes.some(c => c.name.toLowerCase() === name.toLowerCase() && c.department === department)) {
      return false;
    }
    const newClass: Class = {
      id: `class-${Date.now()}`,
      name,
      department,
    };
    setClasses(prev => [...prev, newClass]);
    return true;
  };

  const addUnit = (name: string, classId: string): boolean => {
    if (units.some(u => u.name.toLowerCase() === name.toLowerCase() && u.classId === classId)) {
      return false;
    }
    const newUnit: Unit = {
      id: `unit-${Date.now()}`,
      name,
      classId,
    };
    setUnits(prev => [...prev, newUnit]);
    return true;
  };

  const assignUnitToTrainer = (unitId: string, trainerId: string) => {
    setUnitAssignments(prev => {
        const newAssignment = { unitId, trainerId };
        const existingIndex = prev.findIndex(a => a.unitId === unitId);

        if (existingIndex > -1) {
            // Update existing assignment
            const updated = [...prev];
            // If trainerId is empty, it means un-assigning
            if (!trainerId) {
                updated.splice(existingIndex, 1);
            } else {
                updated[existingIndex] = newAssignment;
            }
            return updated;
        }
        // Add new assignment only if a trainer is selected
        if (trainerId) {
            return [...prev, newAssignment];
        }
        return prev;
    });
  };

  const addRemark = (newRemarkData: Omit<Remark, 'id'>) => {
    setRemarks(prev => {
      // Check if a remark for the same class, week, and type already exists
      const existingIndex = prev.findIndex(r => 
        r.classId === newRemarkData.classId && 
        r.week === newRemarkData.week && 
        r.type === newRemarkData.type
      );

      const remarkWithId: Remark = { ...newRemarkData, id: `remark-${Date.now()}` };

      if (existingIndex !== -1) {
        // Update existing remark
        const updatedRemarks = [...prev];
        updatedRemarks[existingIndex] = { ...remarkWithId, id: prev[existingIndex].id }; // keep original id
        return updatedRemarks;
      } else {
        // Add new remark
        return [...prev, remarkWithId];
      }
    });
  };

  const updateClassName = (classId: string, newName: string): boolean => {
    if (!newName.trim()) return false;
    setClasses(prev => prev.map(c => c.id === classId ? { ...c, name: newName } : c));
    return true;
  };
  
  const addTrainerSchedule = (newScheduleData: Omit<TrainerSchedule, 'id' | 'submittedAt'>) => {
    const newSchedule: TrainerSchedule = {
      ...newScheduleData,
      id: `schedule-${Date.now()}`,
      submittedAt: new Date().toISOString(),
    };
    setTrainerSchedules(prev => [...prev, newSchedule]);
  };

  const addTraineeAttendance = (records: TraineeAttendanceRecord[]) => {
    setTraineeAttendanceRecords(prev => [...prev, ...records]);
  };

  const value = {
    classes,
    trainees,
    trainers,
    units,
    unitAssignments,
    remarks,
    trainerSchedules,
    traineeAttendanceRecords,
    logo,
    setLogo,
    addTrainer,
    updateTrainer,
    deleteTrainer,
    addTrainee,
    addClass,
    addUnit,
    assignUnitToTrainer,
    addRemark,
    updateClassName,
    addTrainerSchedule,
    addTraineeAttendance,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};