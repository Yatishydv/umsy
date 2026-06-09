import * as cheerio from 'cheerio';

/**
 * Fetches and parses student result from frmStudentResult.aspx
 * The page renders all result data on a simple authenticated GET —
 * no POST / ViewState submission needed.
 *
 * @param {import('axios').AxiosInstance} client - Authenticated Axios client
 * @returns {Promise<{cgpa: string|null, semesters: Array}>}
 */
export async function fetchStudentResult(client) {
    // console.log('📋 Fetching Student Result...');

    try {
        const response = await client.get(
            'https://ums.lpu.in/lpuums/frmStudentResult.aspx',
            {
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx',
                    'Upgrade-Insecure-Requests': '1',
                }
            }
        );

        if (!response.data || typeof response.data !== 'string') {
            console.warn('⚠️ Invalid or non-HTML response from UMS result page, returning empty data');
            return { cgpa: null, semesters: [], rplGrades: [] };
        }

        return parseResultHTML(response.data);

    } catch (error) {
        console.warn('⚠️ Error fetching student result, returning empty data:', error.message);
        return { cgpa: null, semesters: [], rplGrades: [] };
    }
}

/**
 * Parse the HTML response from frmStudentResult.aspx.
 *
 * The page uses a Telerik RadGrid where semesters are rendered as
 * rgGroupHeader rows followed by rgRow/rgAltRow subject rows.
 *
 * Column order (0-indexed td):
 *   0 - GroupSplitter (toggle button)
 *   1 - Sr. No.
 *   2 - Course Name link  (e.g. "CSE111 :: ORIENTATION TO COMPUTING-I")
 *   3 - Credit            (e.g. "2.00")
 *   4 - Grade span        (e.g. "A+")
 *   5 - Details
 *   6 - (trailing)
 */
function parseResultHTML(html) {
    const $ = cheerio.load(html);

    // ── CGPA from the grid footer ─────────────────────────────────────────
    let cgpa = null;
    $('[id*="lblfooter"]').each((_, el) => {
        const text = $(el).text().trim();
        const m = text.match(/CGPA\s*::\s*([\d.]+)/i);
        if (m) { cgpa = m[1]; return false; } // stop after first match
    });

    // ── Walk every tbody row of the main result grid ──────────────────────
    const semesters = [];
    let current = null;

    $('#ctl00_cphHeading_rdDetails_ctl00 tbody tr').each((_, row) => {
        const $row = $(row);

        // ── Semester header ────────────────────────────────────────────────
        if ($row.hasClass('rgGroupHeader')) {
            if (current) semesters.push(current);

            // "TermId: 123241; TGPA: 7.59"  OR  "TermId: 12526A" (no TGPA yet)
            const headerText = $row.find('p').text().trim();
            const termMatch  = headerText.match(/TermId:\s*(\w+)/i);
            const tgpaMatch  = headerText.match(/TGPA:\s*([\d.]+)/i);

            current = {
                termId: termMatch ? termMatch[1] : headerText,
                tgpa:   tgpaMatch ? tgpaMatch[1] : null,
                subjects: []
            };
            return; // next row
        }

        // ── Subject row ────────────────────────────────────────────────────
        if (($row.hasClass('rgRow') || $row.hasClass('rgAltRow')) && current) {
            const tds = $row.find('td');
            if (tds.length < 5) return;

            const courseRaw = tds.eq(2).find('a').text().trim()
                           || tds.eq(2).text().trim();
            const creditRaw = tds.eq(3).text().trim();
            const gradeRaw  = tds.eq(4).find('span').text().trim()
                           || tds.eq(4).text().trim();

            if (!courseRaw) return;

            // Split "CSE111 :: ORIENTATION TO COMPUTING-I"
            const sepIdx = courseRaw.indexOf('::');
            const code   = sepIdx !== -1 ? courseRaw.slice(0, sepIdx).trim() : '';
            const name   = sepIdx !== -1 ? courseRaw.slice(sepIdx + 2).trim() : courseRaw;
            const credit = creditRaw ? parseFloat(creditRaw) : null;
            const grade  = gradeRaw  || null;

            current.subjects.push({ code, name, credit, grade });
        }
    });

    if (current) semesters.push(current);

    // console.log(`✅ Result parsed: CGPA=${cgpa}, ${semesters.length} semesters found`);
    // semesters.forEach(s =>
    //     console.log(`   Term ${s.termId} | TGPA ${s.tgpa ?? 'N/A'} | ${s.subjects.length} subjects`)
    // );

    // ── RPL Grades ────────────────────────────────────────────────────────
    const rplGrades = parseRPLGrades($);
    if (rplGrades.length > 0) {
        // console.log(`📌 RPL Grades parsed: ${rplGrades.length} group(s)`);
    }

    return { cgpa, semesters, rplGrades };
}

/**
 * Parse the Recognition of Prior Learning (RPL) grades grid.
 * Column layout (0-indexed td):
 *   0 - GroupSplitter
 *   1 - Sr.No  (span)
 *   2 - CourseName link
 *   3 - space span (empty)
 *   4 - Grade span
 */
function parseRPLGrades($) {
    const groups = [];
    let current = null;

    $('#ctl00_cphHeading_rg_RPLGrades_ctl00 tbody tr').each((_, row) => {
        const $row = $(row);

        // Group header — carries TermId (no TGPA for RPL)
        if ($row.hasClass('rgGroupHeader')) {
            if (current) groups.push(current);
            const headerText = $row.find('p').text().trim();
            const termMatch  = headerText.match(/TermId:\s*(\w+)/i);
            current = {
                termId:   termMatch ? termMatch[1] : headerText,
                subjects: []
            };
            return;
        }

        // Subject row
        if (($row.hasClass('rgRow') || $row.hasClass('rgAltRow')) && current) {
            const tds = $row.find('td');
            if (tds.length < 5) return;

            const courseRaw = tds.eq(2).find('a').text().trim()
                           || tds.eq(2).text().trim();
            const gradeRaw  = tds.eq(4).find('span').text().trim()
                           || tds.eq(4).text().trim();

            if (!courseRaw) return;

            const sepIdx = courseRaw.indexOf('::');
            const code   = sepIdx !== -1 ? courseRaw.slice(0, sepIdx).trim() : '';
            const name   = sepIdx !== -1 ? courseRaw.slice(sepIdx + 2).trim() : courseRaw;

            current.subjects.push({ code, name, grade: gradeRaw || null });
        }
    });

    if (current) groups.push(current);
    return groups;
}
