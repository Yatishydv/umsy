import axios from 'axios';
const client = axios.create({
    headers: {
        'Cookie': '_ga_B0Z6G6GCD8=leodr5vivvrexfoamqsjkdt5; ASP.NET_SessionId=pek0h00qjbagac0opooc1htj;',
        'Referer': 'https://ums.lpu.in/lpuums/StudentDashboard.aspx',
        'User-Agent': 'Mozilla/5.0'
    }
});
async function run() {
    try {
        const response = await client.post('https://ums.lpu.in/lpuums/StudentDashboard.aspx/GetStudentBasicInformation', {});
        console.log("Success:", response.data);
    } catch(e) {
        console.log("Error:", e.message, e.response?.status);
    }
}
run();
