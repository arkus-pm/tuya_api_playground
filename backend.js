import express from "express";
import cors from "cors";
import { TuyaContext } from "@tuya/tuya-connector-nodejs";

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Initialize Tuya Context
const tuya = new TuyaContext({
  baseUrl: "https://openapi.tuyaeu.com",
  accessKey: "qasuggcjenxvrysta8dx",
  secretKey: "3e17519d1c6345caa3620dfb7265e79f",
});

// Initialize with known properties
const knownProperties = [
  {
    code: "control_data",
    name: "Adjust",
    type: "string",
    type_desc: '{"maxlen":255,"type":"string","typeDefaultValue":""}',
  },
  {
    code: "countdown",
    name: "Timer",
    type: "value",
    type_desc:
      '{"max":86400,"min":0,"scale":0,"step":1,"type":"value","typeDefaultValue":0,"unit":"s"}',
  },
  {
    code: "work_mode",
    name: "Mode",
    type: "enum",
    type_desc:
      '{"range":["white","colour","scene","music"],"type":"enum","typeDefaultValue":"white"}',
  },
  {
    code: "rhythm_mode",
    name: "Rhythms",
    type: "raw",
    type_desc: '{"maxlen":255,"type":"raw"}',
  },
  {
    code: "temp_value",
    name: "Color Temp",
    type: "value",
    type_desc:
      '{"max":1000,"min":0,"scale":0,"step":1,"type":"value","typeDefaultValue":0}',
  },
  {
    code: "power_memory",
    name: "Power Off Memory",
    type: "raw",
    type_desc: '{"maxlen":255,"type":"raw"}',
  },
  {
    code: "music_data",
    name: "Music",
    type: "string",
    type_desc: '{"maxlen":255,"type":"string","typeDefaultValue":""}',
  },
  {
    code: "scene_data",
    name: "Scene",
    type: "string",
    type_desc: '{"maxlen":255,"type":"string","typeDefaultValue":""}',
  },
  {
    code: "bright_value",
    name: "Brightness",
    type: "value",
    type_desc:
      '{"max":1000,"min":10,"scale":0,"step":1,"type":"value","typeDefaultValue":10}',
  },
  {
    code: "colour_data",
    name: "Colorful",
    type: "string",
    type_desc: '{"maxlen":255,"type":"string","typeDefaultValue":""}',
  },
  {
    code: "switch_led",
    name: "ON/OFF",
    type: "bool",
    type_desc: '{"type":"bool","typeDefaultValue":false}',
  },
];

// Store the known properties for the group

app.get("/devices", async (req, res) => {
  try {
    const response = await tuya.request({
      path: "/v1.0/iot-01/associated-users/devices",
      method: "GET",
      query: {
        project_code: "p1741123917801c87x9p",
      },
    });

    console.log("\nTuya API Response:", response);
    res.json(response);
  } catch (error) {
    console.error("\nError details:", error);
    res.status(500).json({
      error: "Failed to fetch devices",
      details: error.message,
    });
  }
});

app.post("/devices/:deviceId/commands", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { commands } = req.body;

    console.log("\nSending command to Tuya API:");
    console.log("Device ID:", deviceId);
    console.log("Commands:", JSON.stringify(commands, null, 2));

    const requestConfig = {
      path: `/v1.0/iot-03/devices/${deviceId}/commands`,
      method: "POST",
      body: { commands },
      query: {
        project_code: "p1741123917801c87x9p",
      },
    };

    console.log("Request config:", JSON.stringify(requestConfig, null, 2));

    const response = await tuya.request(requestConfig);

    console.log("\nTuya API Response:", response);
    res.json(response);
  } catch (error) {
    console.error("\nError details:", error);
    res.status(500).json({
      error: "Failed to send command",
      details: error.message,
    });
  }
});

app.get("/groups", async (req, res) => {
  try {
    const { page_no, page_size, space_id } = req.query;

    console.log("\nFetching groups from Tuya API:");
    console.log("Query params:", { page_no, page_size, space_id });

    const response = await tuya.request({
      path: "/v2.1/cloud/thing/group",
      method: "GET",
      query: {
        page_no: page_no || 1,
        page_size: page_size || 10,
        space_id,
        project_code: "p1741123917801c87x9p",
      },
    });

    console.log("\nTuya API Response:", response);

    // Transform the response to match expected structure
    const transformedResponse = {
      ...response,
      result: {
        list: response.result.data_list.map((group) => ({
          ...group,
          status: [], // Initialize empty status array as we don't have status in this endpoint
        })),
        total: response.result.count,
        page_size: response.result.page_size,
        page_number: response.result.page_number,
      },
    };

    console.log("\nTransformed Response:", transformedResponse);
    res.json(transformedResponse);
  } catch (error) {
    console.error("\nError details:", error);
    res.status(500).json({
      error: "Failed to fetch groups",
      details: error.message,
    });
  }
});

app.post("/groups/:groupId/properties", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { properties } = req.body;

    console.log("\nSending group command to Tuya API:");
    console.log("Group ID:", groupId);
    console.log("Properties:", properties);

    const requestConfig = {
      path: "/v2.0/cloud/thing/group/properties",
      method: "POST",
      body: {
        group_id: groupId,
        properties,
      },
    };

    console.log("Request config:", JSON.stringify(requestConfig, null, 2));

    const response = await tuya.request(requestConfig);

    console.log("\nTuya API Response:", response);
    res.json(response);
  } catch (error) {
    console.error("\nError details:", error);
    res.status(500).json({
      error: "Failed to set group properties",
      details: error.message,
    });
  }
});

app.get("/groups/:groupId/properties", async (req, res) => {
  try {
    const { groupId } = req.params;

    console.log("\nFetching group properties from Tuya API:");
    console.log("Group ID:", groupId);

    const response = await tuya.request({
      path: `/v2.1/cloud/thing/group/${groupId}/properties`,
      method: "GET",
    });

    console.log("\nTuya API Response:", response);
    res.json(response);
  } catch (error) {
    console.error("\nError details:", error);
    res.status(500).json({
      error: "Failed to fetch group properties",
      details: error.message,
    });
  }
});

app.get("/groups/:groupId/status", async (req, res) => {
  try {
    const { groupId } = req.params;

    console.log("\nFetching group status from Tuya API:");
    console.log("Group ID:", groupId);

    const response = await tuya.request({
      path: `/v2.1/cloud/thing/group/${groupId}/status-set`,
      method: "GET",
    });

    console.log("\nTuya API Response:", response);
    res.json(response);
  } catch (error) {
    console.error("\nError details:", error);
    res.status(500).json({
      error: "Failed to fetch group status",
      details: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
