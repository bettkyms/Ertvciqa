import { Class, Trainee, Trainer, User, Role, Unit, UnitAssignment } from './types';

export const TRAINERS: Trainer[] = [
  { id: 'trainer-1', name: 'Dr. Evelyn Reed', department: 'Computer Science' },
  { id: 'trainer-2', name: 'Mr. Samuel Chen', department: 'Design' },
  { id: 'trainer-3', name: 'Ms. Aisha Khan', department: 'Computer Science' },
  // New departments
  { id: 'trainer-4', name: 'Mr. Ben Carter', department: 'Electrical Engineering' },
  { id: 'trainer-5', name: 'Ms. Chloe Davis', department: 'Cosmetology' },
  { id: 'trainer-6', name: 'Mr. David Evans', department: 'Mechanical Engineering' },
  { id: 'trainer-7', name: 'Ms. Fiona Green', department: 'Hospitality Management' },
  { id: 'trainer-8', name: 'Mr. George Hill', department: 'Fashion and Design' },
  { id: 'trainer-9', name: 'Ms. Hannah Irwin', department: 'Business Studies' },
  { id: 'trainer-10', name: 'Mr. Ian Jackson', department: 'Building & Civil Engineering' },
  { id: 'trainer-11', name: 'Ms. Jane King', department: 'Automotive Engineering' },
  { id: 'trainer-12', name: 'Mr. Kevin Lewis', department: 'Agricultural Engineering' },
];

export const TRAINEES: Trainee[] = [
  // Existing Trainees
  { id: 'trainee-1', name: 'Alice Johnson', admissionNumber: 'CS101', classId: 'class-1' },
  { id: 'trainee-2', name: 'Bob Williams', admissionNumber: 'CS102', classId: 'class-1' },
  { id: 'trainee-3', name: 'Charlie Brown', admissionNumber: 'CS103', classId: 'class-1' },
  { id: 'trainee-4', name: 'Diana Miller', admissionNumber: 'CS104', classId: 'class-1' },
  { id: 'trainee-5', name: 'Ethan Davis', admissionNumber: 'CS105', classId: 'class-1' },
  { id: 'trainee-6', name: 'Fiona Garcia', admissionNumber: 'DS201', classId: 'class-2' },
  { id: 'trainee-7', name: 'George Rodriguez', admissionNumber: 'DS202', classId: 'class-2' },
  { id: 'trainee-8', name: 'Hannah Wilson', admissionNumber: 'DS203', classId: 'class-2' },
  { id: 'trainee-9', name: 'Ian Martinez', admissionNumber: 'DS204', classId: 'class-2' },
  { id: 'trainee-10', name: 'Jane Anderson', admissionNumber: 'DS205', classId: 'class-2' },
  { id: 'trainee-11', name: 'Kevin Thomas', admissionNumber: 'CS301', classId: 'class-3' },
  { id: 'trainee-12', name: 'Laura Taylor', admissionNumber: 'CS302', classId: 'class-3' },
  { id: 'trainee-13', name: 'Mason Moore', admissionNumber: 'CS303', classId: 'class-3' },
  { id: 'trainee-14', name: 'Nora Jackson', admissionNumber: 'CS304', classId: 'class-3' },
  { id: 'trainee-15', name: 'Oscar White', admissionNumber: 'CS305', classId: 'class-3' },
  // New Trainees for new departments
  { id: 'trainee-16', name: 'Liam Harris', admissionNumber: 'EE401', classId: 'class-4' },
  { id: 'trainee-17', name: 'Olivia Martin', admissionNumber: 'EE402', classId: 'class-4' },
  { id: 'trainee-18', name: 'Noah Thompson', admissionNumber: 'COS501', classId: 'class-5' },
  { id: 'trainee-19', name: 'Emma Garcia', admissionNumber: 'COS502', classId: 'class-5' },
  { id: 'trainee-20', name: 'William Martinez', admissionNumber: 'ME601', classId: 'class-6' },
  { id: 'trainee-21', name: 'Ava Robinson', admissionNumber: 'HM701', classId: 'class-7' },
  { id: 'trainee-22', name: 'James Clark', admissionNumber: 'FD801', classId: 'class-8' },
  { id: 'trainee-23', name: 'Sophia Rodriguez', admissionNumber: 'BS901', classId: 'class-9' },
  { id: 'trainee-24', name: 'Logan Lewis', admissionNumber: 'BCE1001', classId: 'class-10' },
  { id: 'trainee-25', name: 'Isabella Lee', admissionNumber: 'AE1101', classId: 'class-11' },
  { id: 'trainee-26', name: 'Lucas Walker', admissionNumber: 'AGE1201', classId: 'class-12' },
  // Trainees for 2024 historical data
  { id: 'trainee-27', name: 'Peter Pan', admissionNumber: 'CS601', classId: 'class-13' },
  { id: 'trainee-28', name: 'Wendy Darling', admissionNumber: 'CS602', classId: 'class-13' },
  { id: 'trainee-29', name: 'Tinker Bell', admissionNumber: 'DS701', classId: 'class-14' },
];

export const USERS: User[] = [
  // Existing Users
  { id: 'user-iqa-1', name: 'Admin IQA', username: 'iqa', password: '123', role: Role.IQA },
  { id: 'user-hod-1', name: 'Dr. Charles Bing', username: 'hod1', password: '123', role: Role.HOD, department: 'Computer Science' },
  { id: 'trainer-1', name: 'Dr. Evelyn Reed', username: 'trainer1', password: '123', role: Role.Trainer, department: 'Computer Science' },
  { id: 'trainer-2', name: 'Mr. Samuel Chen', username: 'schen', password: '123', role: Role.Trainer, department: 'Design' },
  { id: 'trainer-3', name: 'Ms. Aisha Khan', username: 'akhan', password: '123', role: Role.Trainer, department: 'Computer Science' },
  { id: 'user-rep-1', name: 'Alex Ray', username: 'classrep1', password: '123', role: Role.ClassRep, department: 'Computer Science' },
  { id: 'user-rep-2', name: 'Brenda Miles', username: 'brep', password: '123', role: Role.ClassRep, department: 'Design' },

  // New HODs for new departments
  { id: 'user-hod-2', name: 'Mr. Alan Turing', username: 'hod_ee', password: '123', role: Role.HOD, department: 'Electrical Engineering' },
  { id: 'user-hod-3', name: 'Ms. Estee Lauder', username: 'hod_cos', password: '123', role: Role.HOD, department: 'Cosmetology' },
  { id: 'user-hod-4', name: 'Mr. James Watt', username: 'hod_me', password: '123', role: Role.HOD, department: 'Mechanical Engineering' },
  { id: 'user-hod-5', name: 'Ms. Julia Child', username: 'hod_hm', password: '123', role: Role.HOD, department: 'Hospitality Management' },
  { id: 'user-hod-6', name: 'Mr. Coco Chanel', username: 'hod_fd', password: '123', role: Role.HOD, department: 'Fashion and Design' },
  { id: 'user-hod-7', name: 'Ms. Indra Nooyi', username: 'hod_bs', password: '123', role: Role.HOD, department: 'Business Studies' },
  { id: 'user-hod-8', name: 'Mr. Vitruvius', username: 'hod_bce', password: '123', role: Role.HOD, department: 'Building & Civil Engineering' },
  { id: 'user-hod-9', name: 'Ms. Bertha Benz', username: 'hod_ae', password: '123', role: Role.HOD, department: 'Automotive Engineering' },
  { id: 'user-hod-10', name: 'Mr. Norman Borlaug', username: 'hod_age', password: '123', role: Role.HOD, department: 'Agricultural Engineering' },
  
  // New Trainers (as users)
  { id: 'trainer-4', name: 'Mr. Ben Carter', username: 'bcarter', password: '123', role: Role.Trainer, department: 'Electrical Engineering' },
  { id: 'trainer-5', name: 'Ms. Chloe Davis', username: 'cdavis', password: '123', role: Role.Trainer, department: 'Cosmetology' },
  { id: 'trainer-6', name: 'Mr. David Evans', username: 'devans', password: '123', role: Role.Trainer, department: 'Mechanical Engineering' },
  { id: 'trainer-7', name: 'Ms. Fiona Green', username: 'fgreen', password: '123', role: Role.Trainer, department: 'Hospitality Management' },
  { id: 'trainer-8', name: 'Mr. George Hill', username: 'ghill', password: '123', role: Role.Trainer, department: 'Fashion and Design' },
  { id: 'trainer-9', name: 'Ms. Hannah Irwin', username: 'hirwin', password: '123', role: Role.Trainer, department: 'Business Studies' },
  { id: 'trainer-10', name: 'Mr. Ian Jackson', username: 'ijackson', password: '123', role: Role.Trainer, department: 'Building & Civil Engineering' },
  { id: 'trainer-11', name: 'Ms. Jane King', username: 'jking', password: '123', role: Role.Trainer, department: 'Automotive Engineering' },
  { id: 'trainer-12', name: 'Mr. Kevin Lewis', username: 'klewis', password: '123', role: Role.Trainer, department: 'Agricultural Engineering' },

  // New Class Reps
  { id: 'user-rep-3', name: 'Charlie Day', username: 'crep_ee', password: '123', role: Role.ClassRep, department: 'Electrical Engineering' },
  { id: 'user-rep-4', name: 'Denise Richards', username: 'crep_cos', password: '123', role: Role.ClassRep, department: 'Cosmetology' },
  { id: 'user-rep-5', name: 'Ethan Hunt', username: 'crep_me', password: '123', role: Role.ClassRep, department: 'Mechanical Engineering' },
];


export const CLASSES: Class[] = [
  // Existing classes
  { id: 'class-1', name: 'CS-L6-24S', department: 'Computer Science' },
  { id: 'class-2', name: 'DS-L5-24S', department: 'Design' },
  { id: 'class-3', name: 'CS-L6-23F', department: 'Computer Science' },
  
  // New classes for new departments
  { id: 'class-4', name: 'EE-L6-24S', department: 'Electrical Engineering' },
  { id: 'class-5', name: 'COS-L4-24S', department: 'Cosmetology' },
  { id: 'class-6', name: 'ME-L6-24S', department: 'Mechanical Engineering' },
  { id: 'class-7', name: 'HM-L5-24S', department: 'Hospitality Management' },
  { id: 'class-8', name: 'FD-L4-24S', department: 'Fashion and Design' },
  { id: 'class-9', name: 'BS-L6-24S', department: 'Business Studies' },
  { id: 'class-10', name: 'BCE-L6-24S', department: 'Building & Civil Engineering' },
  { id: 'class-11', name: 'AE-L5-24S', department: 'Automotive Engineering' },
  { id: 'class-12', name: 'AGE-L4-24S', department: 'Agricultural Engineering' },

  // Classes for 2024 historical data
  { id: 'class-13', name: 'CS-L5-24F', department: 'Computer Science' },
  { id: 'class-14', name: 'DS-L4-24F', department: 'Design' },
];

export const UNITS: Unit[] = [
    // Existing Units
    { id: 'unit-1', name: 'Advanced React Patterns', classId: 'class-1' },
    { id: 'unit-2', name: 'State Management with Redux', classId: 'class-1' },
    { id: 'unit-3', name: 'Data Structures & Algorithms', classId: 'class-3' },
    { id: 'unit-4', name: 'Introduction to UI/UX Design', classId: 'class-2' },
    { id: 'unit-5', name: 'Wireframing & Prototyping', classId: 'class-2' },

    // New Units
    { id: 'unit-6', name: 'Circuit Analysis', classId: 'class-4' },
    { id: 'unit-7', name: 'Power Systems', classId: 'class-4' },
    { id: 'unit-8', name: 'Advanced Hairdressing', classId: 'class-5' },
    { id: 'unit-9', name: 'Thermodynamics I', classId: 'class-6' },
    { id: 'unit-10', name: 'Front Office Operations', classId: 'class-7' },
    { id: 'unit-11', name: 'Pattern Making', classId: 'class-8' },
    { id: 'unit-12', name: 'Principles of Accounting', classId: 'class-9' },
    { id: 'unit-13', name: 'Construction Materials', classId: 'class-10' },
    { id: 'unit-14', name: 'Engine Systems Diagnosis', classId: 'class-11' },
    { id: 'unit-15', name: 'Soil Science', classId: 'class-12' },
    
    // Units for 2024 historical data
    { id: 'unit-16', name: 'Intro to Python', classId: 'class-13' },
    { id: 'unit-17', name: 'Typography Basics', classId: 'class-14' },
];

export const UNIT_ASSIGNMENTS: UnitAssignment[] = [
    // Assign some units to trainers for demonstration
    { unitId: 'unit-1', trainerId: 'trainer-1' }, // React -> Dr. Reed
    { unitId: 'unit-2', trainerId: 'trainer-3' }, // Redux -> Ms. Khan
    { unitId: 'unit-3', trainerId: 'trainer-1' }, // DS&A -> Dr. Reed
    { unitId: 'unit-4', trainerId: 'trainer-2' }, // UI/UX -> Mr. Chen
    { unitId: 'unit-5', trainerId: 'trainer-2' }, // Wireframing -> Mr. Chen
    { unitId: 'unit-6', trainerId: 'trainer-4' }, // Circuit Analysis -> Mr. Carter
    { unitId: 'unit-7', trainerId: 'trainer-4' }, // Power Systems -> Mr. Carter
    { unitId: 'unit-8', trainerId: 'trainer-5' }, // Hairdressing -> Ms. Davis
    { unitId: 'unit-9', trainerId: 'trainer-6' }, // Thermo -> Mr. Evans
    { unitId: 'unit-10', trainerId: 'trainer-7' }, // Front Office -> Ms. Green
    
    // Assignments for 2024 historical data
    { unitId: 'unit-16', trainerId: 'trainer-3' }, // Python -> Ms. Khan
    { unitId: 'unit-17', trainerId: 'trainer-2' }, // Typography -> Mr. Chen
];