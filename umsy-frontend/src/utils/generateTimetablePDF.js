import jsPDF from 'jspdf';
import { downloadFile } from './downloadHelper';

/**
 * Generates and downloads a PDF of the student's timetable
 * @param {Object} timetableData - Timetable data organized by day
 * @param {string} studentName - Student's name for the header
 */
export const generateTimetablePDF = (timetableData, studentName) => {
    try {
        // Create new PDF document
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Colors
        const headerBg = [31, 41, 55];      // Gray-900
        const headerText = [255, 255, 255]; // White
        const altRowBg = [249, 250, 251];   // Light gray
        const borderColor = [200, 200, 200]; // Gray border

        // Add header
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Weekly Timetable', pageWidth / 2, 15, { align: 'center' });

        // Student info and date
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const currentDate = new Date().toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        doc.text(`Student: ${studentName}`, 15, 25);
        doc.text(`Generated on: ${currentDate}`, pageWidth - 15, 25, { align: 'right' });

        // Extract time slots and days
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const timeSlots = new Set();

        // Collect all unique time slots
        Object.values(timetableData).forEach(dayClasses => {
            dayClasses.forEach(cls => {
                if (cls.time) timeSlots.add(cls.time);
            });
        });

        const sortedTimeSlots = Array.from(timeSlots).sort();

        // Table configuration
        const startY = 35;
        const rowHeight = 12;
        const timeColWidth = 25;
        const dayColWidth = (pageWidth - 30 - timeColWidth) / days.length; // 30 is margins (15 each side)

        let currentY = startY;

        // Draw header row
        doc.setFillColor(...headerBg);
        doc.rect(15, currentY, pageWidth - 30, rowHeight, 'F');

        doc.setTextColor(...headerText);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');

        // Time column header
        doc.text('Time', 15 + (timeColWidth / 2), currentY + 8, { align: 'center' });

        // Day column headers
        days.forEach((day, index) => {
            const x = 15 + timeColWidth + (index * dayColWidth);
            doc.text(day.substring(0, 3), x + (dayColWidth / 2), currentY + 8, { align: 'center' });
        });

        currentY += rowHeight;

        // Draw data rows
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);

        sortedTimeSlots.forEach((timeSlot, rowIndex) => {
            // Alternate row background
            if (rowIndex % 2 === 0) {
                doc.setFillColor(...altRowBg);
                doc.rect(15, currentY, pageWidth - 30, rowHeight, 'F');
            }

            // Draw borders
            doc.setDrawColor(...borderColor);
            doc.setLineWidth(0.1);
            doc.rect(15, currentY, pageWidth - 30, rowHeight);

            // Time column
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text(timeSlot, 15 + (timeColWidth / 2), currentY + 7, { align: 'center' });
            doc.setFont('helvetica', 'normal');

            // Draw vertical line after time column
            doc.line(15 + timeColWidth, currentY, 15 + timeColWidth, currentY + rowHeight);

            // Day columns
            days.forEach((day, dayIndex) => {
                const x = 15 + timeColWidth + (dayIndex * dayColWidth);

                // Draw vertical lines between day columns
                if (dayIndex > 0) {
                    doc.line(x, currentY, x, currentY + rowHeight);
                }

                const classInfo = timetableData[day]?.find(cls => cls.time === timeSlot);

                if (classInfo) {
                    const lines = [];
                    if (classInfo.type) lines.push(classInfo.type);
                    if (classInfo.group) lines.push(`G: ${classInfo.group}`);
                    if (classInfo.room) lines.push(`R: ${classInfo.room}`);
                    if (classInfo.section) lines.push(`S: ${classInfo.section}`);

                    // Draw text lines
                    const lineHeight = 2.5;
                    const startTextY = currentY + 3;

                    lines.slice(0, 4).forEach((line, lineIndex) => {
                        doc.text(line, x + 2, startTextY + (lineIndex * lineHeight), {
                            maxWidth: dayColWidth - 4
                        });
                    });
                } else {
                    // Empty cell
                    doc.setTextColor(150, 150, 150);
                    doc.text('-', x + (dayColWidth / 2), currentY + 7, { align: 'center' });
                    doc.setTextColor(0, 0, 0);
                }
            });

            currentY += rowHeight;

            // Check if we need a new page
            if (currentY > pageHeight - 20) {
                doc.addPage();
                currentY = 20;
            }
        });

        // Add footer with page numbers
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(100);

        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.text(
                `Page ${i} of ${pageCount}`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            );
        }

        // Generate filename
        const sanitizedName = studentName.replace(/[^a-z0-9]/gi, '_');
        const dateString = new Date().toLocaleDateString('en-IN').replace(/\//g, '-');
        const filename = `Timetable_${sanitizedName}_${dateString}.pdf`;

        // Save PDF using universal helper
        const blob = doc.output('blob');
        downloadFile(blob, filename);

        console.log('✅ PDF generated successfully:', filename);
        return true;
    } catch (error) {
        console.error('❌ Error generating PDF:', error);
        throw new Error('Failed to generate PDF. Please try again.');
    }
};
