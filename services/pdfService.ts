import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Remark, WeeklyTraineeReportData, WeeklyTrainerReportData, Day, TimeSlot, SessionTraineeReportData, PeriodicTraineeReportData } from '../types';

/**
 * A helper function to draw HOD remarks on a PDF document.
 * @param doc The jsPDF instance.
 * @param y The starting Y position for the remark block.
 * @param remark The remark object to render.
 */
const drawRemark = (doc: jsPDF, y: number, remark: Remark) => {
    const startY = y;
    const pageWidth = doc.internal.pageSize.width;
    doc.setFontSize(12).setFont('helvetica', 'bold');
    doc.text("HOD's Remark", 15, startY);
    doc.setFontSize(10).setFont('helvetica', 'normal');
    const remarkLines = doc.splitTextToSize(remark.remarkText, pageWidth - 30);
    doc.text(remarkLines, 15, startY + 7);
    const remarkHeight = doc.getTextDimensions(remarkLines).h;
    doc.text(`- ${remark.authorSignature}, ${remark.date}`, pageWidth - 15, startY + 7 + remarkHeight + 2, { align: 'right' });
};


/**
 * Generates and downloads a PDF report.
 * @param reportType The type of report to generate ('trainee', 'trainer', 'sessionTrainee', 'periodicTrainee').
 * @param reportData The structured data for the report.
 * @param hodRemark An optional remark from the Head of Department.
 * @param logo An optional base64 encoded logo image.
 */
export const generatePdf = async (
  reportType: 'trainee' | 'trainer' | 'sessionTrainee' | 'periodicTrainee',
  reportData: WeeklyTraineeReportData | WeeklyTrainerReportData | SessionTraineeReportData | PeriodicTraineeReportData,
  hodRemark: Remark | undefined,
  logo: string | null
) => {
    
    const doc = new jsPDF(reportType === 'trainer' ? { orientation: 'landscape' } : undefined);

    if (reportType === 'trainee') {
        const data = reportData as WeeklyTraineeReportData;
        // This part is simplified as it's not the focus of the change.
        doc.text('Trainee Attendance Report', 15, 15);
        autoTable(doc, {
            head: [['Name', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Weekly %']],
            body: data.attendanceGrid.map(item => [
                item.name, item.attendance.mon, item.attendance.tue, item.attendance.wed,
                item.attendance.thu, item.attendance.fri, `${item.weeklyPercentage}%`
            ]),
            startY: 20,
        });

        if (hodRemark) {
            const finalY = (doc as any).lastAutoTable.finalY + 20;
            drawRemark(doc, finalY, hodRemark);
        }

    } else if (reportType === 'periodicTrainee') {
        const data = reportData as PeriodicTraineeReportData;

        doc.setFontSize(18).setFont('helvetica', 'bold');
        doc.text(data.reportTitle, 15, 20);

        autoTable(doc, {
            body: [
                ['Class:', data.className],
                ['Trainer:', data.trainerName],
                ['Period:', data.period],
            ],
            startY: 25,
            theme: 'plain',
            styles: { fontSize: 11 },
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        
        autoTable(doc, {
            head: [['Trainee Name', 'Admission No.', 'Present', 'Absent', 'Total Sessions', 'Attendance %']],
            body: data.attendanceGrid.map(item => [
                item.traineeName,
                item.admissionNumber,
                item.presentCount,
                item.absentCount,
                item.totalSessions,
                `${item.attendancePercentage.toFixed(1)}%`
            ]),
            startY: finalY,
            headStyles: { fillColor: [41, 128, 185] }, // Blue
        });

        if (hodRemark) {
            const remarkY = (doc as any).lastAutoTable.finalY + 10;
            drawRemark(doc, remarkY, hodRemark);
        }

    } else if (reportType === 'sessionTrainee') {
        const data = reportData as SessionTraineeReportData;
        
        doc.setFontSize(18).setFont('helvetica', 'bold');
        doc.text('Trainee Attendance Report', 15, 20);

        doc.setFontSize(11).setFont('helvetica', 'normal');
        autoTable(doc, {
            body: [
                ['Class:', data.className],
                ['Unit:', data.unitName],
                ['Trainer:', data.trainerName],
                ['Date:', data.date],
                ['Time:', data.time],
            ],
            startY: 25,
            theme: 'plain',
            styles: { fontSize: 11 },
        });

        let finalY = (doc as any).lastAutoTable.finalY + 10;
        
        // Present Trainees
        if (data.presentTrainees.length > 0) {
            autoTable(doc, {
                head: [['Present Trainees', 'Admission No.']],
                body: data.presentTrainees.map(t => [t.name, t.admissionNumber]),
                startY: finalY,
                headStyles: { fillColor: [22, 160, 133] }, // Green
            });
            finalY = (doc as any).lastAutoTable.finalY + 10;
        }

        // Absent Trainees
        if (data.absentTrainees.length > 0) {
            autoTable(doc, {
                head: [['Absent Trainees', 'Admission No.']],
                body: data.absentTrainees.map(t => [t.name, t.admissionNumber]),
                startY: finalY,
                headStyles: { fillColor: [192, 57, 43] }, // Red
            });
             finalY = (doc as any).lastAutoTable.finalY + 10;
        }

        // Summary
        doc.setFontSize(12).setFont('helvetica', 'bold');
        doc.text('Summary', 15, finalY);
        doc.setFontSize(11).setFont('helvetica', 'normal');
        doc.text(`Present: ${data.summary.present}`, 15, finalY + 7);
        doc.text(`Absent: ${data.summary.absent}`, 15, finalY + 14);
        doc.text(`Total: ${data.summary.total}`, 15, finalY + 21);
        finalY += 28;

        if (hodRemark) {
            drawRemark(doc, finalY, hodRemark);
        }

    } else { // 'trainer' report
        const data = reportData as WeeklyTrainerReportData;
        const pageHeight = doc.internal.pageSize.height; // approx 210
        const pageWidth = doc.internal.pageSize.width; // approx 297
        
        // --- Header ---
        if (logo) {
            try {
                const imgProps = doc.getImageProperties(logo);
                const aspectRatio = imgProps.width / imgProps.height;
                const logoWidth = 20;
                const logoHeight = logoWidth / aspectRatio;
                doc.addImage(logo, 'PNG', 70, 10, logoWidth, logoHeight);
            } catch (error) {
                console.error("Failed to add logo to PDF:", error);
            }
        }
        
        doc.setFontSize(14).setFont('helvetica', 'bold');
        doc.text('ELDAMA RAVINE TECHNICAL AND VOCATIONAL COLLEGE', pageWidth / 2, 18, { align: 'center' });
        doc.setFontSize(11).setFont('helvetica', 'normal');
        doc.text('CLASS ATTENDANCE QUALITY CONTROL FORM', pageWidth / 2, 24, { align: 'center' });
        
        doc.setFontSize(10);
        let yPos = 35;

        // Line 1: Department, Class Rep, KEY section
        doc.text(`Department: ${data.department || ''}`, 15, yPos + 5);
        doc.text(`Class Rep Name: ${data.classRepName || ''}`, pageWidth / 2, yPos + 5, { align: 'center' });
        
        // Redesigned KEY section for clarity, without a box
        const keyStartX = pageWidth - 80;
        doc.setFontSize(10).setFont('helvetica', 'bold');
        doc.text('KEY', keyStartX, yPos + 5);
        doc.setFontSize(8).setFont('helvetica', 'normal');
        doc.text('T: Taught   |   NT: Not Taught   |   ASS: Assignment', keyStartX, yPos + 10);


        // Move yPos down past the first line content
        yPos += 15;

        // Line 2: Class, Sign
        doc.text(`Class: ${data.className || ''}`, 15, yPos);
        doc.text(`Sign: ...............................`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
        
        // Line 3: Tel
        doc.text(`Tel: ................................`, pageWidth / 2, yPos, { align: 'center' });


        // --- Table ---
        yPos = 60; // Hardcoded start position for the table, giving enough space
        const tableLeftMargin = 15;
        const tableRightMargin = 15;
        const tableWidth = pageWidth - tableLeftMargin - tableRightMargin;
        const timeColWidth = 30;
        const dayColWidth = (tableWidth - timeColWidth) / 5;
        const cellHeight = 18;
        const timeSlots: TimeSlot[] = ['08:00-10:00', '10:00-12:00', '12:00-13:00', '13:00-15:00', '15:00-17:00'];
        const days: Day[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

        // Draw Table Grid
        doc.setDrawColor(0);
        // Outer box and horizontal lines
        for(let i = 0; i <= timeSlots.length + 1; i++) {
             doc.rect(tableLeftMargin, yPos + (i * cellHeight), tableWidth, cellHeight);
        }
        // Vertical lines
        doc.line(tableLeftMargin + timeColWidth, yPos, tableLeftMargin + timeColWidth, yPos + cellHeight * (timeSlots.length + 1));
        for(let i = 1; i < 5; i++) {
            doc.line(tableLeftMargin + timeColWidth + (i * dayColWidth), yPos, tableLeftMargin + timeColWidth + (i * dayColWidth), yPos + cellHeight * (timeSlots.length + 1));
        }


        // Table Headers
        doc.setFontSize(9).setFont('helvetica', 'bold');
        doc.text('DAY/TIME', tableLeftMargin + 2, yPos + cellHeight / 2 + 2);
        days.forEach((day, i) => {
            const dayX = tableLeftMargin + timeColWidth + (i * dayColWidth);
            doc.text(day.toUpperCase(), dayX + dayColWidth / 2, yPos + 6, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.text(`Date: ${data.dates[day] || ' '}`, dayX + 2, yPos + 14);
            doc.setFont('helvetica', 'bold');
        });
        
        yPos += cellHeight;

        // Table Content
        doc.setFontSize(8).setFont('helvetica', 'normal');
        timeSlots.forEach((time, rowIndex) => {
            const rowY = yPos + (rowIndex * cellHeight);
            doc.setFont('helvetica', 'bold').text(time, tableLeftMargin + 2, rowY + cellHeight / 2 + 2);
            doc.setFont('helvetica', 'normal');

            days.forEach((day, colIndex) => {
                const cellX = tableLeftMargin + timeColWidth + (colIndex * dayColWidth);
                const session = data.schedule[day]?.[time];

                if (session) {
                    const statusMap = { 'Taught': 'T', 'Not Taught': 'NT', 'Assignment': 'ASS' };
                    const status = statusMap[session.status as keyof typeof statusMap] || session.status;
                    
                    doc.text(`Subject: ${session.subject}`, cellX + 2, rowY + 5, { maxWidth: dayColWidth - 4 });
                    doc.text(`Trainer: ${session.trainer}`, cellX + 2, rowY + 10, { maxWidth: dayColWidth - 4 });
                    doc.text(`T/NT/ASS: ${status}`, cellX + 2, rowY + 15, { maxWidth: dayColWidth - 4 });
                } else {
                    doc.text('Subject: ', cellX + 2, rowY + 5);
                    doc.text('Trainer: ', cellX + 2, rowY + 10);
                    doc.text('T/NT/ASS: ', cellX + 2, rowY + 15);
                }
            });
        });
        
        yPos += cellHeight * timeSlots.length + 5;
        
        // --- Footer (HOD Remarks) ---
        doc.text("HOD's Name: ...............................................", tableLeftMargin, yPos);
        doc.text("Sign: ............................", tableLeftMargin + 150, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'bold').text("HOD's Remarks", tableLeftMargin, yPos);
        yPos += 2;
        doc.setDrawColor(0).rect(tableLeftMargin, yPos, tableWidth, 20);
        if (hodRemark) {
            doc.setFont('helvetica', 'normal').setFontSize(9);
            doc.text(hodRemark.remarkText, tableLeftMargin + 2, yPos + 5, { maxWidth: tableWidth - 4 });
            doc.text(`- ${hodRemark.authorSignature}, ${hodRemark.date}`, tableLeftMargin + tableWidth - 2, yPos + 18, { align: 'right'});
        }
        yPos += 25;
        doc.text(`Date: .....................................................`, tableLeftMargin, yPos);
    }
    
    let fileName = 'report.pdf';
    if (reportType === 'trainer') {
        fileName = `${(reportData as WeeklyTrainerReportData).className}_trainer_report.pdf`;
    } else if (reportType === 'sessionTrainee') {
        const data = reportData as SessionTraineeReportData;
        fileName = `${data.className}_${data.date}_attendance.pdf`;
    } else if (reportType === 'periodicTrainee') {
        const data = reportData as PeriodicTraineeReportData;
        fileName = `${data.className}_${data.period.replace(/ /g, '_')}_attendance.pdf`;
    }
    else {
        fileName = `trainee_report.pdf`;
    }
        
    doc.save(fileName);
};