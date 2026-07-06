/**
 * Build a rich system context string from all available UMS data.
 */
function buildContext(data) {
    const lines = [];

    // Student info
    const info = data.studentInfo || {};
    if (info.Name) lines.push(`Student: ${info.Name}`);
    if (info.RegistrationNumber) lines.push(`Reg No: ${info.RegistrationNumber}`);
    if (info.Programme) lines.push(`Programme: ${info.Programme}`);
    if (info.CurrentSemester) lines.push(`Current Semester: ${info.CurrentSemester}`);
    if (info.CGPA) lines.push(`Overall CGPA: ${info.CGPA}`);
    if (info.AggAttendance) lines.push(`Overall Attendance: ${info.AggAttendance}`);

    // Term-wise CGPA
    const cgpaTerms = info.TermwiseCGPA || [];
    if (cgpaTerms.length > 0) {
        lines.push('\nTerm-wise CGPA:');
        cgpaTerms.forEach(t => {
            lines.push(`  Term ${t.term}: TGPA=${t.tgpa}, Credits=${t.totalCredit}`);
        });
    }

    // Attendance subject-wise
    const attendance = data.attendance || [];
    if (attendance.length > 0) {
        lines.push('\nSubject-wise Attendance:');
        attendance.forEach(a => {
            const pct = a.summaryPercent != null
                ? a.summaryPercent
                : a.totalRecords > 0
                    ? ((a.presentCount / a.totalRecords) * 100).toFixed(1) + '%'
                    : 'N/A';
            lines.push(`  ${a.courseCode} | ${a.courseTitle || ''} | ${pct} | Present: ${a.presentCount}/${a.totalRecords}`);
        });
    }

    // Result subject-wise
    const result = data.result || {};
    const semesters = result.semesters || [];
    if (semesters.length > 0) {
        lines.push('\nTerm-wise Result (Subject Grades):');
        semesters.forEach(sem => {
            lines.push(`  Term ${sem.termId} (TGPA: ${sem.tgpa || 'N/A'}):`);
            (sem.subjects || []).forEach(sub => {
                lines.push(`    ${sub.code} | ${sub.name} | Grade: ${sub.grade} | Credits: ${sub.credit}`);
            });
        });
    }

    // RPL grades
    const rplGrades = result.rplGrades || [];
    if (rplGrades.length > 0) {
        lines.push('\nRPL Grades:');
        rplGrades.forEach(grp => {
            lines.push(`  Term ${grp.termId}:`);
            (grp.subjects || []).forEach(sub => {
                lines.push(`    ${sub.code} | ${sub.name} | Grade: ${sub.grade}`);
            });
        });
    }

    return lines.join('\n');
}

/**
 * Main AI Buddy handler using Groq API instead of Gemini.
 * @param {string} message - The user's message
 * @param {object} data    - All UMS data from client localStorage
 * @param {Array}  history - Prior conversation turns [{role, text}]
 */
export async function getAIBuddyResponse(message, data, history = []) {
    const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

    const contextBlock = buildContext(data);

    const systemPrompt = `You are UMSY AI, a friendly and smart academic assistant for LPU UMS students.
You have access to the student's complete academic data provided below.
Use this data to answer questions accurately. Do not make up numbers.
When asked for analysis or suggestions, be concise, specific, and helpful.
Keep responses short and conversational unless detailed analysis is requested.

--- STUDENT DATA ---
${contextBlock}
--- END OF DATA ---

Rules:
- Answer attendance questions from the attendance data above.
- Answer CGPA/grade questions from the result/CGPA data above.
- For suggestions/improvement tips, be practical and based on the actual data.
- If something is not in the data, say so honestly.
- Format lists with bullet points. Keep it clean.`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map(h => ({
            role: h.role === 'assistant' ? 'assistant' : 'user',
            content: h.text
        })),
        { role: 'user', content: message }
    ];

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: messages,
                temperature: 0.2
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Groq API returned status ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        if (result?.choices?.[0]?.message?.content) {
            return result.choices[0].message.content;
        } else {
            throw new Error('Invalid response structure from Groq API');
        }
    } catch (err) {
        console.error('Error fetching Groq response:', err);
        throw new Error(`Failed to contact UMSY AI: ${err.message}`);
    }
}
