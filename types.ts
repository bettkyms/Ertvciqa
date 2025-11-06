export enum Role {
  IQA = 'IQA',
  HOD = 'HOD',
  Trainer = 'Trainer',
  ClassRep = 'ClassRep',
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: Role;
  department?: string;
  ePortfolioLink?: string;
}

export interface Trainer {
  id:string;
  name: string;
  department: string;
  ePortfolioLink?: string;
}

export interface Trainee {
  id: string;
  name: string;
  admissionNumber: string;
  classId: string;
}

export interface Class {
  id: string;
  name: string;
  department: string;
}

export interface Unit {
  id: string;
  name: string;
  classId: string;
}

export interface UnitAssignment {
  unitId: string;
  trainerId: string;
}

export interface TraineeAttendanceRecord {
  traineeId: string;
  classId: string;
  unitId: string;
  trainerId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: 'present' | 'absent';
}

export interface Remark {
  id: string;
  classId: string;
  week: string; // YYYY-W##
  type: 'trainee' | 'trainer';
  remarkText: string;
  authorName: string;
  authorSignature: string;
  date: string;
}

// For Class Rep Schedule Input
export type TimeSlot = '08:00-10:00' | '10:00-12:00' | '12:00-13:00' | '13:00-15:00' | '15:00-17:00';
export type Day = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export interface SessionInput {
  unitId: string;
  trainerId: string;
  status: 'Taught' | 'Not Taught' | 'Assignment';
}

export interface WeeklyScheduleInput {
  monday: Partial<Record<TimeSlot, SessionInput>>;
  tuesday: Partial<Record<TimeSlot, SessionInput>>;
  wednesday: Partial<Record<TimeSlot, SessionInput>>;
  thursday: Partial<Record<TimeSlot, SessionInput>>;
  friday: Partial<Record<TimeSlot, SessionInput>>;
}

export interface TrainerSchedule {
    id: string;
    classId: string;
    week: string; // YYYY-W##
    schedule: WeeklyScheduleInput;
    submittedBy: string; // User ID of the class rep
    submittedAt: string;
}


// For PDF Generation
export interface WeeklyTraineeReportData {
  attendanceGrid: {
    name: string;
    attendance: {
      mon: string;
      tue: string;
      wed: string;
      thu: string;
      fri: string;
    };
    weeklyPercentage: number;
  }[];
  summary: {
    overallPercentage: number;
    perfectAttendance: string[];
    lowAttendance: string[];
  };
  recommendations: string;
}

export interface PeriodicTraineeReportData {
  reportTitle: string;
  period: string;
  className: string;
  trainerName: string;
  attendanceGrid: {
    traineeName: string;
    admissionNumber: string;
    presentCount: number;
    absentCount: number;
    totalSessions: number;
    attendancePercentage: number;
  }[];
}

export interface SessionTraineeReportData {
  className: string;
  unitName: string;
  trainerName: string;
  date: string;
  time: string;
  presentTrainees: { name: string; admissionNumber: string }[];
  absentTrainees: { name: string; admissionNumber: string }[];
  summary: {
    present: number;
    absent: number;
    total: number;
  };
}


export interface Session {
    subject: string;
    status: string;
    trainer: string;
}

export interface DaySchedule {
    [time: string]: Session;
}

export interface WeeklyTrainerReportData {
  department?: string;
  className?: string;
  classRepName?: string;
  schedule: {
    monday: DaySchedule;
    tuesday: DaySchedule;
    wednesday: DaySchedule;
    thursday: DaySchedule;
    friday: DaySchedule;
  };
  dates: {
    [day: string]: string;
  };
}

// For Aggregate Percentage Reports
export interface PercentageReportItem {
  id: string;
  name: string;
  presentCount: number;
  totalSessions: number;
  percentage: number;
}

export interface PercentageReportData {
  title: string;
  period: string;
  items: PercentageReportItem[];
  overall: {
    present: number;
    total: number;
    percentage: number;
  };
}