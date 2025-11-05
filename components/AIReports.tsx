

import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../contexts/DataContext';
import { generateWeeklyTraineeReportData, generateWeeklyTrainerReportData } from '../services/geminiService';
import { generatePdf } from '../services/pdfService';
import { WeeklyTraineeReportData, WeeklyTrainerReportData } from '../types';

const AIReports: React.FC = () => {
  const { classes, trainees, remarks, logo, units } = useContext(DataContext);
  
  const [selectedClassId, setSelectedClassId] = useState('');
  const [week, setWeek] = useState('');
  const [reportType, setReportType] = useState<'trainee' | 'trainer'>('trainee');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const sortedClasses = useMemo(() => {
    return [...classes].sort((a,b) => a.name.localeCompare(b.name));
  }, [classes]);

  const handleGenerateReport = async () => {
    if (!selectedClassId || !week) {
        setError('Please select a class and a week.');
        return;
    }
    setIsLoading(true);
    setError('');

    const selectedClass = classes.find(c => c.id === selectedClassId);
    if (!selectedClass) {
        setError('Selected class not found.');
        setIsLoading(false);
        return;
    }

    const traineesInClass = trainees.filter(t => t.classId === selectedClassId);
    const hodRemark = remarks.find(r => r.classId === selectedClassId && r.week === week && r.type === reportType);

    try {
        if (reportType === 'trainee') {
            if (traineesInClass.length === 0) {
                setError('No trainees found for this class to generate a report.');
                setIsLoading(false);
                return;
            }
            const reportData: WeeklyTraineeReportData = await generateWeeklyTraineeReportData(traineesInClass);
            // Fix: Update generatePdf call to match function signature with 4 arguments.
            await generatePdf('trainee', reportData, hodRemark, logo);
        } else { // 'trainer' report type
            const unitsInClass = units.filter(u => u.classId === selectedClassId);
            if(unitsInClass.length === 0){
                setError('No units found for this class. Cannot generate trainer report.');
                setIsLoading(false);
                return;
            }
            const reportData: WeeklyTrainerReportData = await generateWeeklyTrainerReportData(selectedClass, unitsInClass);
            // Fix: Update generatePdf call to match function signature with 4 arguments.
            await generatePdf('trainer', reportData, hodRemark, logo);
        }
    } catch (e) {
        console.error('Failed to generate report:', e);
        setError('An error occurred while generating the report. Please try again.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-700 mb-1">AI-Powered Report Generation</h2>
      <p className="text-slate-500 mb-6 text-sm">Generate simulated weekly reports for trainees and trainers using AI.</p>
      
      <div className="p-6 bg-slate-50 rounded-lg border border-slate-200 space-y-4 max-w-lg mx-auto">
        <div>
          <label htmlFor="class-select" className="block text-sm font-medium text-slate-700 mb-1">1. Select Class</label>
          <select id="class-select" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} required className="w-full p-2 border border-slate-300 rounded-md bg-white">
            <option value="">-- Select Class --</option>
            {sortedClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        
        <div>
          <label htmlFor="week-select" className="block text-sm font-medium text-slate-700 mb-1">2. Select Week</label>
          <input id="week-select" type="week" value={week} onChange={e => setWeek(e.target.value)} required className="w-full p-2 border border-slate-300 rounded-md" />
        </div>

        <div>
            <span className="block text-sm font-medium text-slate-700 mb-1">3. Report Type</span>
            <div className="flex gap-4" role="radiogroup">
                <label className="flex items-center">
                    <input type="radio" name="reportType" value="trainee" checked={reportType === 'trainee'} onChange={() => setReportType('trainee')} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"/>
                    <span className="ml-2 text-sm text-slate-700">Trainee Attendance</span>
                </label>
                 <label className="flex items-center">
                    <input type="radio" name="reportType" value="trainer" checked={reportType === 'trainer'} onChange={() => setReportType('trainer')} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"/>
                    <span className="ml-2 text-sm text-slate-700">Trainer Activity</span>
                </label>
            </div>
        </div>

        {error && <p className="text-red-500 text-sm text-center" role="alert">{error}</p>}

        <button 
          onClick={handleGenerateReport}
          disabled={isLoading || !selectedClassId || !week}
          className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300 disabled:bg-indigo-300"
        >
          {isLoading ? 'Generating Report...' : 'Generate and Download PDF'}
        </button>
      </div>
    </div>
  );
};

export default AIReports;