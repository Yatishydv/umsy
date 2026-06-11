import axios from "axios";

export async function fetchStudentRanking(client) {
    const regno = "12301135"
    const url = `https://ranking2-0.vercel.app/api/search?regNo=${regno}`;
    // console.log("Fetching data...");
    axios.get(url).then((response) => { console.log(response.data) }).catch((error) => { console.log(error) })
}