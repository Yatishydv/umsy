import * as cheerio from "cheerio";

export async function fetchStudentAttendanceSummary(client) {
  // console.log("📊 Fetching Attendance Summary...");

  const response = await client.post(
    "https://ums.lpu.in/lpuums/StudentDashboard.aspx/StudentAttendanceSummary",
    {},
    {
      headers: {
        Referer: "https://ums.lpu.in/lpuums/StudentDashboard.aspx",
        "X-Requested-With": "XMLHttpRequest",
      },
    }
  );

  const html = response.data?.d;
  if (!html || typeof html !== 'string') {
    throw new Error('Invalid response from UMS: Expected HTML string. Your session might have expired.');
  }

  // Wrap rows so cheerio can parse them
  const $ = cheerio.load(`<table>${html}</table>`);

  const rows = [];

  $("tr").each((_, tr) => {
    const cols = $(tr).find("td").map((_, td) => $(td).text().trim()).get();

    if (cols.length === 6) {
      const [course, lastDate, od, total, present, percent] = cols;

      // Extract course code from the course title text (e.g. "CHEM201 - Chemistry" → "CHEM201")
      const codeMatch = course.match(/\b([A-Z]{2,}[0-9]{2,}[A-Z0-9]*)\b/);
      const courseCode = codeMatch ? codeMatch[1] : null;

      rows.push({
        course,
        courseCode,
        lastDate,
        od,
        total,
        present,
        percent,
      });
    }
  });

  // Pretty output
  // console.log("\n══════════════════════════════════════════════════════════════");
  // console.log("📊 ATTENDANCE SUMMARY");
  // console.log("══════════════════════════════════════════════════════════════\n");

  rows.forEach((r, i) => {
    const isAggregate = r.course.includes("Aggregate");

    if (isAggregate) {
      // console.log("\n📌 OVERALL SUMMARY");
      // console.log("────────────────────────────────────────────");
    }

    // console.log(
    //   `${(i + 1).toString().padStart(2)}. ${r.course.padEnd(45)}`
    // );
    // console.log(
    //   `    Last: ${r.lastDate.padEnd(12)} | Total: ${r.total.padEnd(4)} | Present: ${r.present.padEnd(4)} | %: ${r.percent}`
    // );

    // if (isAggregate) {
    //   console.log("══════════════════════════════════════════════════════════════");
    // }
  });

  // console.log("\n══════════════════════════════════════════════════════════════\n");

  return rows;
}