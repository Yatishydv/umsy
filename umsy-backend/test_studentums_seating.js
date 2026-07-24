import { chromium } from "playwright";

async function checkSeatingPlan() {
  const token = "2475698a96017cc2570d6ea9a41fd315ebc04036aef5f5c9763ffc70d68e85442d0e097d543fcac748d52982dc5eab684b97b3ebf0444c7e522b6904e5369bf9d00ec72c489d0cf8d2667fcc21b673b84a5d5b37b0b37bc0d0d97a067537d3b3";
  const url = `https://studentums.lpu.in/dashboard/examination/conduct/seatingplan?token=${token}`;
  
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  
  // Create a new context and listen to network events
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  });
  const page = await context.newPage();
  
  console.log("Navigating to studentums with token parameter...");
  
  // Listen for set-cookie headers during navigation
  page.on("response", async (res) => {
    const resUrl = res.url();
    if (resUrl.includes("studentums.lpu.in")) {
      const headers = res.headers();
      if (headers["set-cookie"]) {
        console.log(`\n⭐ CAPTURED Set-Cookie for: ${resUrl}`);
        console.log("Set-Cookie:", headers["set-cookie"]);
      }
      
      // Check for JSON response data
      if (headers["content-type"]?.includes("json") || resUrl.includes("/api/")) {
        console.log(`\n[API Response] Url: ${resUrl} | Status: ${res.status()}`);
        try {
          const json = await res.json();
          console.log("API JSON Data:", JSON.stringify(json).substring(0, 1000));
        } catch (e) {
          console.log("Could not parse JSON response:", e.message);
        }
      }
    }
  });

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(6000);
  
  // Print HTML content and check text inside body
  const bodyText = await page.evaluate(() => document.body ? document.body.innerText : "");
  console.log("\nPage title:", await page.title());
  console.log("Text content matches exam or seating details:", bodyText.toLowerCase().includes("seat") || bodyText.toLowerCase().includes("room"));
  console.log("Cleaned page text content preview:\n", bodyText.replace(/\s+/g, " ").substring(0, 1000));
  
  // Print context cookies
  const cookies = await context.cookies();
  console.log("\nContext cookies populated:", JSON.stringify(cookies, null, 2));

  await browser.close();
}

checkSeatingPlan().catch(console.error);
