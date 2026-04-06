import axios from "axios";

async function test() {
  try {
    const response = await axios.get("http://localhost:3000/api/test-auth2");
    console.log("Status Code:", response.data.status);
    console.log("Response Body:", JSON.stringify(response.data.data, null, 2));
  } catch (e: any) {
    console.log("Error Status:", e.response?.data?.status || e.response?.status);
    console.log("Error Message:", e.message);
    console.log("Error Data:", JSON.stringify(e.response?.data?.data || e.response?.data, null, 2));
  }
}

test();
