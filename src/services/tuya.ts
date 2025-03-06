import axios from "axios";
import {
  TuyaDevice,
  TuyaResponse,
  DevicesResponse,
  Command,
  TuyaGroup,
  GroupsResponse,
  GroupProperties,
} from "../types/tuya";

export class TuyaService {
  private baseUrl: string;
  private spaceId: string = "227120177"; // Add this as a parameter if needed

  constructor() {
    this.baseUrl = "http://localhost:3000";
  }

  async getDevices(): Promise<TuyaDevice[]> {
    try {
      const response = await axios.get<TuyaResponse<DevicesResponse>>(
        `${this.baseUrl}/devices`
      );
      return response.data.result.devices;
    } catch (error) {
      console.error("Error fetching devices:", error);
      throw error;
    }
  }

  async toggleDevice(deviceId: string, currentState: boolean): Promise<void> {
    const command: Command = {
      code: "switch_led",
      value: !currentState,
    };

    try {
      await axios.post(`${this.baseUrl}/devices/${deviceId}/commands`, {
        commands: [command],
      });
    } catch (error) {
      console.error("Error toggling device:", error);
      throw error;
    }
  }

  async setBrightness(deviceId: string, brightness: number): Promise<void> {
    const command: Command = {
      code: "bright_value_v2",
      value: brightness,
    };

    try {
      await axios.post(`${this.baseUrl}/devices/${deviceId}/commands`, {
        commands: [command],
      });
    } catch (error) {
      console.error("Error setting brightness:", error);
      throw error;
    }
  }

  async setColor(
    deviceId: string,
    h: number,
    s: number,
    l: number
  ): Promise<void> {
    // Convert HSL to RGB first (Tuya API expects RGB values)
    const rgb = hslToRgb(h, s, l);

    const command: Command = {
      code: "colour_data_v2",
      value: {
        h: Math.round(h * 360), // Convert from 0-1 to 0-360
        s: Math.round(s * 1000), // Convert from 0-1 to 0-1000
        v: Math.round(l * 1000), // Use lightness as value, convert from 0-1 to 0-1000
      },
    };

    try {
      await axios.post(`${this.baseUrl}/devices/${deviceId}/commands`, {
        commands: [command],
      });
    } catch (error) {
      console.error("Error setting color:", error);
      throw error;
    }
  }

  async getGroups(
    pageNo: number = 1,
    pageSize: number = 18
  ): Promise<TuyaGroup[]> {
    try {
      console.log("Fetching groups with params:", {
        pageNo,
        pageSize,
        spaceId: this.spaceId,
      });

      const response = await axios.get<TuyaResponse<GroupsResponse>>(
        `${this.baseUrl}/groups`,
        {
          params: {
            page_no: pageNo,
            page_size: pageSize,
            space_id: this.spaceId,
          },
        }
      );

      console.log("Groups response:", response.data);

      if (!response.data.result?.list) {
        console.warn("No groups found in response:", response.data);
        return [];
      }

      return response.data.result.list;
    } catch (error) {
      console.error("Error fetching groups:", error);
      throw error;
    }
  }

  async setGroupProperties(
    groupId: string,
    properties: GroupProperties
  ): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/groups/${groupId}/properties`, {
        properties: JSON.stringify(properties),
      });
    } catch (error) {
      console.error("Error setting group properties:", error);
      throw error;
    }
  }

  async toggleGroup(groupId: string, currentState: boolean): Promise<void> {
    try {
      await this.setGroupProperties(groupId, {
        switch_led: !currentState,
      });
    } catch (error) {
      console.error("Error toggling group:", error);
      throw error;
    }
  }

  async setGroupBrightness(groupId: string, brightness: number): Promise<void> {
    try {
      await this.setGroupProperties(groupId, {
        bright_value: brightness,
      });
    } catch (error) {
      console.error("Error setting group brightness:", error);
      throw error;
    }
  }

  async setGroupColor(
    groupId: string,
    h: number,
    s: number,
    v: number
  ): Promise<void> {
    try {
      // Convert the HSV values to the required hex format
      // h: 0-360 -> hex
      // s: 0-255 -> hex
      // v: 0-255 -> hex
      const hHex = Math.round(h * 360)
        .toString(16)
        .padStart(4, "0");
      const sHex = Math.round(s * 1000)
        .toString(16)
        .padStart(4, "0");
      const vHex = Math.round(v * 1000)
        .toString(16)
        .padStart(4, "0");

      await this.setGroupProperties(groupId, {
        work_mode: "colour",
        colour_data: `${hHex}${sHex}${vHex}`,
      });
    } catch (error) {
      console.error("Error setting group color:", error);
      throw error;
    }
  }

  async getGroupStatus(groupId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/groups/${groupId}/status`
      );
      return response.data.result;
    } catch (error) {
      console.error("Error fetching group status:", error);
      throw error;
    }
  }

  async getGroupProperties(groupId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/groups/${groupId}/properties`
      );
      return response.data.result;
    } catch (error) {
      console.error("Error fetching group properties:", error);
      throw error;
    }
  }
}

// Helper function to convert HSL to RGB
function hslToRgb(
  h: number,
  s: number,
  l: number
): { r: number; g: number; b: number } {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

export const tuyaService = new TuyaService();
