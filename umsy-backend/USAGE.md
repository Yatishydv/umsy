## UMS Scraper Tool

A lightweight Node.js scraper for the LPU UMS login system.

### How to Use

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the scraper:**
   ```bash
   npm start
   ```

3. **Follow the prompts:**
   - The tool will fetch the login page
   - Download the captcha image as `captcha.png`
   - Prompt you for:
     - Registration Number
     - Password
     - Captcha text (check the captcha.png file)

4. **Session cookies:**
   - Cookies are automatically stored after successful login
   - Use the exported functions to make authenticated requests

### Features

✅ **DOM-faithful form submission** - Parses ALL form fields exactly as rendered  
✅ **Dynamic field detection** - No hardcoded field names (password, login button)  
✅ **ASP.NET WebForms compatible** - Passes server-side validation  
✅ **Automatic cookie management** - Session persistence like a browser  
✅ **Captcha handling** - Downloads and displays captcha image  

### Example

```javascript
import { makeAuthenticatedRequest, exportCookies } from './scraper.js';

// After login, make authenticated requests
const data = await makeAuthenticatedRequest('https://ums.lpu.in/lpuums/StudentDashboard.aspx');

// Get cookies for external use
const cookies = exportCookies();
console.log(cookies);
```
