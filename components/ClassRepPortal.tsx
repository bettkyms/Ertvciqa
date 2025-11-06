import React, { useState, useMemo, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { DataContext } from '../contexts/DataContext';
import { WeeklyScheduleInput, TimeSlot, Day, SessionInput, WeeklyTrainerReportData, Unit, DaySchedule, Trainer, Class, User, TrainerSchedule, Session } from '../types';
import { generateWeeklyScheduleSubmissionSummary } from '../services/geminiService';
import { generatePdf } from '../services/pdfService';
import ImageExtractor from './ImageExtractor';

const timeSlots: TimeSlot[] = ['08:00-10:00', '10:00-12:00', '12:00-13:00', '13:00-15:00', '15:00-17:00'];
const days: Day[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

const initialSchedule: WeeklyScheduleInput = {
    monday: {}, tuesday: {}, wednesday: {}, thursday: {}, friday: {}
};

type EntryMode = 'manual' | 'image';

const ClassRepPortal: React.FC = () => {
  const { currentUser, logout } = useContext(AuthContext);
  const { classes, units, trainers, addTrainerSchedule, remarks, logo, unitAssignments, trainerSchedules } = useContext(DataContext);

  const [entryMode, setEntryMode] = useState<EntryMode>('manual');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [week, setWeek] = useState('');
  const [schedule, setSchedule] = useState<WeeklyScheduleInput>(initialSchedule);
  const [summary, setSummary] = useState('');
  const [reportData, setReportData] = useState<WeeklyTrainerReportData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState('');
  const [viewingSchedule, setViewingSchedule] = useState<TrainerSchedule | null>(null);


  const repClasses = useMemo(() => {
    if (!currentUser?.department) return [];
    return classes.filter(c => c.department === currentUser.department);
  }, [classes, currentUser]);

  const pastSubmissions = useMemo(() => {
    if (!currentUser) return [];
    return trainerSchedules
      .filter(s => s.submittedBy === currentUser.id)
      .sort((a,b) => b.submittedAt.localeCompare(a.submittedAt));
  }, [trainerSchedules, currentUser]);
  
  const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);
  const unitsInClass = useMemo(() => units.filter(u => u.classId === selectedClassId), [units, selectedClassId]);

  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);
  const trainerMap = useMemo(() => new Map(trainers.map(t => [t.id, t.name])), [trainers]);
  const classMap = useMemo(() => new Map(classes.map(c => [c.id, c.name])), [classes]);

  const handleSessionChange = (day: Day, time: TimeSlot, field: keyof SessionInput, value: string) => {
    setSchedule(prev => {
        const newSchedule = JSON.parse(JSON.stringify(prev));

        if (field === 'unitId' && !value) {
            delete newSchedule[day][time];
            return newSchedule;
        }

        if (!newSchedule[day][time]) {
            newSchedule[day][time] = { unitId: '', trainerId: '', status: 'Taught' };
        }
        
        const session = newSchedule[day][time] as SessionInput;

        switch(field) {
            case 'unitId':
                session.unitId = String(value);
                // When unit changes, auto-assign the trainer
                const assignment = unitAssignments.find(a => a.unitId === value);
                session.trainerId = assignment ? assignment.trainerId : '';
                break;
            case 'trainerId':
                session.trainerId = String(value);
                break;
            case 'status':
                session.status = value as 'Taught' | 'Not Taught' | 'Assignment';
                break;
        }
        
        return newSchedule;
    });
  };
  
  const handleDataExtracted = (extractedData: WeeklyTrainerReportData) => {
    const newSchedule: WeeklyScheduleInput = { monday: {}, tuesday: {}, wednesday: {}, thursday: {}, friday: {} };
    const unitMapByName = new Map(unitsInClass.map(u => [u.name.toLowerCase().trim(), u.id]));
    const trainerMapByName = new Map(trainers.map(t => [t.name.toLowerCase().trim(), t.id]));
    let unitsMatched = 0;
    let trainersMatched = 0;
    let totalEntries = 0;

    for (const day of days) {
        const daySchedule = extractedData.schedule[day as Day];
        if (!daySchedule) continue;

        for (const time in daySchedule) {
            const session = daySchedule[time as TimeSlot];
            if (!session) continue;
            totalEntries++;
            
            // The properties on the session object from the API response can be of type 'unknown'.
            // Safely convert them to strings to avoid type errors.
            // FIX: Explicitly and safely convert potentially unknown properties to strings before use.
            // @ts-ignore
            const sessionData = session as unknown as Record<string, unknown>;
            const subject = String(sessionData.subject ?? '');
            const trainer = String(sessionData.trainer ?? '');
            const status = String(sessionData.status ?? '');

            if (!subject || !trainer) continue;

            const subjectName = subject.toLowerCase().trim();
            const trainerName = trainer.toLowerCase().trim();
            const unitId = unitMapByName.get(subjectName);
            const trainerId = trainerMapByName.get(trainerName);

            if (unitId) unitsMatched++;
            if (trainerId) trainersMatched++;

            if (unitId && trainerId) {
                 if (!newSchedule[day as Day]) newSchedule[day as Day] = {};
                 newSchedule[day as Day]![time as TimeSlot] = {
                    unitId: unitId,
                    trainerId: trainerId,
                    status: (status === 'Taught' || status === 'Not Taught' || status === 'Assignment') ? status : 'Taught',
                };
            }
        }
    }
    setSchedule(newSchedule);
    setExtractionMessage(`Successfully populated schedule. Matched ${unitsMatched} units & ${trainersMatched} trainers out of ${totalEntries} entries. Please review.`);
    setEntryMode('manual');
  };

  const getDatesForWeek = (weekString: string): { [day: string]: string } => {
      if (!weekString || !weekString.includes('-W')) {
        const now = new Date();
        const formatDate = (date: Date) => date.toLocaleDateString('en-CA');
        return days.reduce((acc, day) => ({ ...acc, [day]: formatDate(now) }), {});
      }
      const [year, week] = weekString.split('-W').map(Number);
      const simpleDate = new Date(year, 0, 1 + (week - 1) * 7);
      const dayOfWeek = simpleDate.getDay();
      const diff = simpleDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(simpleDate.setDate(diff));
      const formatDate = (date: Date) => date.toLocaleDateString('en-CA');
      const dates: { [day: string]: string } = {};
      for (let i = 0; i < 5; i++) {
        const currentDate = new Date(monday);
        currentDate.setDate(monday.getDate() + i);
        dates[days[i]] = formatDate(currentDate);
      }
      return dates;
  };
  
  const transformScheduleToReportData = (
    scheduleInput: WeeklyScheduleInput, 
    unitsList: Unit[], 
    trainersList: Trainer[], 
    weekString: string,
    cls: Class,
    classRep: User,
  ): WeeklyTrainerReportData => {
    const unitMap = new Map(unitsList.map(u => [u.id, u.name]));
    const trainerMap = new Map(trainersList.map(t => [t.id, t.name]));
    const reportSchedule: WeeklyTrainerReportData['schedule'] = { monday: {}, tuesday: {}, wednesday: {}, thursday: {}, friday: {} };
    
    for (const day of days) {
        const dayScheduleInput = scheduleInput[day];
        const dayScheduleOutput: DaySchedule = {};
        for (const time in dayScheduleInput) {
            const sessionInput = dayScheduleInput[time as TimeSlot];
            if (sessionInput && sessionInput.unitId && sessionInput.trainerId) {
                dayScheduleOutput[time] = {
                    subject: unitMap.get(sessionInput.unitId) || 'Unknown Unit',
                    status: sessionInput.status,
                    trainer: trainerMap.get(sessionInput.trainerId) || 'Unknown Trainer'
                };
            }
        }
        reportSchedule[day] = dayScheduleOutput;
    }
    return { 
      department: cls.department,
      className: cls.name,
      classRepName: classRep.name,
      schedule: reportSchedule, 
      dates: getDatesForWeek(weekString),
    };
  };

  const handleSubmit = async () => {
    if (!selectedClassId || !week || !currentUser || !selectedClass) return;
    setIsSubmitting(true);
    addTrainerSchedule({ classId: selectedClassId, week, schedule, submittedBy: currentUser.id });
    const generatedReportData = transformScheduleToReportData(schedule, unitsInClass, trainers, week, selectedClass, currentUser);
    setReportData(generatedReportData);
    const result = await generateWeeklyScheduleSubmissionSummary(selectedClass.name, week);
    setSummary(result);
    setIsSubmitting(false);
  };

  const handleDownloadPdf = async (scheduleToDownload: TrainerSchedule) => {
    const classForSchedule = classes.find(c => c.id === scheduleToDownload.classId);
    const unitsForClass = units.filter(u => u.classId === scheduleToDownload.classId);
    if (!classForSchedule || !currentUser) return;

    const reportDataForPdf = transformScheduleToReportData(scheduleToDownload.schedule, unitsForClass, trainers, scheduleToDownload.week, classForSchedule, currentUser);
    const hodRemark = remarks.find(r => r.classId === scheduleToDownload.classId && r.week === scheduleToDownload.week && r.type === 'trainer');
    await generatePdf('trainer', reportDataForPdf, hodRemark, logo);
  };
  
  const resetForm = () => {
    setSummary('');
    setSelectedClassId('');
    setWeek('');
    setSchedule(initialSchedule);
    setReportData(null);
    setIsSubmitting(false);
    setExtractionMessage('');
    setEntryMode('manual');
    setViewingSchedule(null);
  }

  if (summary) {
    return (
       <div className="w-full max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg text-center">
            <h2 className="text-2xl font-semibold text-green-800 mb-4">Submission Confirmed!</h2>
            <div className="text-left bg-green-50 p-4 rounded-md border border-green-200 mb-6">
              <p className="text-slate-600 whitespace-pre-wrap">{summary}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={() => {if(reportData && selectedClass) handleDownloadPdf({classId: selectedClassId, week, schedule, submittedBy: currentUser!.id, id: '', submittedAt:''})}} disabled={!reportData} className="flex-1 bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 transition-colors disabled:bg-teal-300">
                  Download PDF Report
                </button>
                <button onClick={resetForm} className="flex-1 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors">
                  Submit Another Log
                </button>
            </div>
       </div>
    );
  }
  
  if(viewingSchedule) {
    const classForSchedule = classes.find(c => c.id === viewingSchedule.classId);
    return (
       <div className="w-full max-w-7xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
           <h2 className="text-2xl font-bold text-slate-800 mb-2">Viewing Previous Record</h2>
           <p className="text-slate-500 mb-6">
            Class: <span className="font-semibold">{classForSchedule?.name}</span> | Week: <span className="font-semibold">{viewingSchedule.week}</span>
           </p>
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                    <thead>
                        <tr className="bg-slate-100">
                            <th className="p-2 border border-slate-200 text-left text-sm font-semibold text-slate-600">Time</th>
                            {days.map(day => <th key={day} className="p-2 border border-slate-200 text-left text-sm font-semibold text-slate-600 capitalize">{day}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {timeSlots.map(time => (
                            <tr key={time}>
                                <td className="p-2 border border-slate-200 font-medium text-xs text-slate-500 align-top">{time}</td>
                                {days.map(day => {
                                  const session = viewingSchedule.schedule[day]?.[time];
                                  return (
                                    <td key={`${day}-${time}`} className="p-2 border border-slate-200 align-top text-xs">
                                      {session ? (
                                        <div className="space-y-1">
                                          <p><span className="font-semibold">Unit:</span> {unitMap.get(session.unitId) || 'N/A'}</p>
                                          <p><span className="font-semibold">Trainer:</span> {trainerMap.get(session.trainerId) || 'N/A'}</p>
                                          <p><span className="font-semibold">Status:</span> {session.status}</p>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400">No session</span>
                                      )}
                                    </td>
                                  )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <button onClick={() => handleDownloadPdf(viewingSchedule)} className="flex-1 bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 transition-colors">
                  Download PDF
                </button>
                <button onClick={() => setViewingSchedule(null)} className="flex-1 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors">
                  Back to Form
                </button>
            </div>
       </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="absolute top-4 right-4">
        <button onClick={logout} className="flex items-center text-sm text-slate-600 hover:text-indigo-800 font-semibold transition-colors group">
          <span className="mr-2 hidden sm:inline">Logout ({currentUser?.name})</span>
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
      <div className="bg-white p-8 rounded-2xl shadow-lg">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Class Rep: Weekly Trainer Log</h1>
        <p className="text-slate-500 mb-6">Fill out the attendance log for all trainers for the entire week.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg">
                <option value="">-- Select Class --</option>
                {repClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="week" value={week} onChange={e => setWeek(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg" disabled={!selectedClassId} />
        </div>
        
        {selectedClassId && week && (
            <div>
                 <div className="mb-4">
                    <div className="inline-flex bg-slate-100 p-1 rounded-lg">
                        <button onClick={() => setEntryMode('manual')} className={`px-4 py-1.5 text-sm font-semibold rounded-md ${entryMode === 'manual' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}>
                            Manual Entry
                        </button>
                        <button onClick={() => setEntryMode('image')} className={`px-4 py-1.5 text-sm font-semibold rounded-md ${entryMode === 'image' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}>
                            Extract from Image
                        </button>
                    </div>
                </div>

                {entryMode === 'image' && <ImageExtractor onDataExtracted={handleDataExtracted} />}

                {entryMode === 'manual' && (
                    <>
                    <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200 text-center">
                        <p className="font-semibold text-indigo-800">
                            Recording attendance for class <span className="font-bold">{selectedClass?.name || 'N/A'}</span>
                        </p>
                        {extractionMessage && <p className="text-sm text-green-700 mt-2">{extractionMessage}</p>}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="p-2 border border-slate-200 text-left text-sm font-semibold text-slate-600">Time</th>
                                    {days.map(day => <th key={day} className="p-2 border border-slate-200 text-left text-sm font-semibold text-slate-600 capitalize">{day}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {timeSlots.map(time => (
                                    <tr key={time}>
                                        <td className="p-2 border border-slate-200 font-medium text-xs text-slate-500 align-top">{time}</td>
                                        {days.map(day => (
                                            <td key={`${day}-${time}`} className="p-2 border border-slate-200 align-top">
                                                <div className="space-y-2">
                                                    <select
                                                      value={schedule[day]?.[time]?.unitId || ''}
                                                      onChange={e => handleSessionChange(day, time, 'unitId', e.target.value)}
                                                      className="w-full text-xs p-1 border border-slate-300 rounded-md bg-white"
                                                    >
                                                        <option value="">-- Select Unit --</option>
                                                        {unitsInClass.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                    </select>
                                                    {schedule[day]?.[time]?.unitId && (
                                                        <>
                                                        <select
                                                            value={schedule[day]?.[time]?.trainerId || ''}
                                                            onChange={e => handleSessionChange(day, time, 'trainerId', e.target.value)}
                                                            className="w-full text-xs p-1 border border-slate-300 rounded-md bg-white"
                                                        >
                                                            <option value="">-- Select Trainer --</option>
                                                            {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                        </select>
                                                        <select
                                                          value={schedule[day]?.[time]?.status || 'Taught'}
                                                          onChange={e => handleSessionChange(day, time, 'status', e.target.value)}
                                                          className="w-full text-xs p-1 border border-slate-300 rounded-md bg-white"
                                                        >
                                                            <option value="Taught">Taught</option>
                                                            <option value="Not Taught">Not Taught</option>
                                                            <option value="Assignment">Assignment</option>
                                                        </select>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-8">
                      <button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-300">
                        {isSubmitting ? 'Submitting...' : 'Submit Weekly Log'}
                      </button>
                    </div>
                    </>
                )}
            </div>
        )}

        {/* Previous Submissions */}
        <div className="mt-8 border-t border-slate-200 pt-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Your Previous Submissions</h2>
            {pastSubmissions.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto bg-slate-50 p-3 rounded-lg border">
                    {pastSubmissions.map(submission => (
                        <div key={submission.id} className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                            <div>
                                <p className="font-semibold text-slate-800">{classMap.get(submission.classId) || 'Unknown Class'}</p>
                                <p className="text-sm text-slate-500">
                                    Week: {submission.week} | Submitted on: {new Date(submission.submittedAt).toLocaleDateString()}
                                </p>
                            </div>
                            <button 
                                onClick={() => setViewingSchedule(submission)} 
                                className="bg-slate-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors"
                            >
                                View Details
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-slate-500 text-center bg-slate-50 p-6 rounded-lg border">You have not submitted any records yet.</p>
            )}
        </div>
      </div>
    </div>
  );
};

export default ClassRepPortal;