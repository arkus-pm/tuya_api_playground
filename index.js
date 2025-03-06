import { TuyaContext } from "@tuya/tuya-connector-nodejs";
import { Buffer } from "buffer";

// Tuya API configuration
const config = {
  baseUrl: "https://openapi.tuyaeu.com",
  accessKey: "qasuggcjenxvrysta8dx",
  secretKey: "3e17519d1c6345caa3620dfb7265e79f",
};

// Initialize Tuya Context
const tuya = new TuyaContext(config);

async function listDevices() {
  try {
    // Get devices list for the project
    const response = await tuya.request({
      path: `/v1.0/iot-01/associated-users/devices`,
      method: "GET",
      query: {
        project_code: "p1741123917801c87x9p",
      },
    });

    console.log("Devices found:", JSON.stringify(response, null, 2));
  } catch (error) {
    console.error("Error fetching devices:", error);
  }
}

// Execute the function
listDevices();
