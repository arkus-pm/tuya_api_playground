import { useState, useEffect } from "react";
import { tuyaService } from "./services/tuya";
import { Device } from "./components/Device";
import { Group } from "./components/Group";
import { TuyaDevice, TuyaGroup, DeviceStatus } from "./types/tuya";
import "./App.css";
import { ColorManager } from "./components/ColorManager";

function App() {
  const [devices, setDevices] = useState<TuyaDevice[]>([]);
  const [groups, setGroups] = useState<TuyaGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const [devicesList, groupsList] = await Promise.all([
        tuyaService.getDevices(),
        tuyaService.getGroups(),
      ]);
      setDevices(devicesList || []);
      setGroups(groupsList || []);
    } catch (err) {
      setError("Failed to fetch devices and groups");
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateDeviceStatus = (deviceId: string, newStatus: DeviceStatus) => {
    setDevices((currentDevices) =>
      currentDevices.map((device) => {
        if (device.id === deviceId) {
          return {
            ...device,
            status: device.status.map((status) =>
              status.code === newStatus.code ? newStatus : status
            ),
          };
        }
        return device;
      })
    );
  };

  const updateGroupStatus = (groupId: string, newStatus: DeviceStatus) => {
    setGroups((currentGroups) =>
      currentGroups.map((group) => {
        if (group.group_id === groupId) {
          return {
            ...group,
            status: group.status?.map((status) =>
              status.code === newStatus.code ? newStatus : status
            ) || [newStatus],
          };
        }
        return group;
      })
    );
  };

  const handleUpdateGroupColor = async (
    groupId: string,
    hsv: { h: number; s: number; v: number }
  ) => {
    try {
      const newStatus: DeviceStatus = {
        code: "colour_data_v2",
        value: {
          h: Math.round(hsv.h),
          s: Math.round(hsv.s * 1000),
          v: Math.round(hsv.v * 1000),
        },
      };

      // Update state optimistically
      updateGroupStatus(groupId, newStatus);

      // Update the actual device
      await tuyaService.setGroupColor(
        groupId,
        hsv.h / 360, // Convert back to 0-1 range
        hsv.s,
        hsv.v
      );
    } catch (err) {
      console.error("Failed to update group color:", err);
      // Refresh the devices to get the current state
      fetchDevices();
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  if (loading) {
    return <div className="loading">Loading devices and groups...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="app">
      <header>
        <h1>Tuya Devices</h1>
        <button onClick={fetchDevices} className="refresh-btn">
          Refresh
        </button>
      </header>

      {groups.length > 0 && (
        <>
          <h2>Groups</h2>
          <div className="groups-grid">
            {groups.map((group) => (
              <Group
                key={group.group_id}
                group={group}
                onUpdateStatus={updateGroupStatus}
                onError={() => fetchDevices()}
              />
            ))}
          </div>
        </>
      )}

      <h2>Devices</h2>
      <div className="devices-grid">
        {devices.map((device) => (
          <Device
            key={device.id}
            device={device}
            onUpdateStatus={updateDeviceStatus}
            onError={() => fetchDevices()}
          />
        ))}
      </div>

      <ColorManager
        tuyaGroups={groups}
        onUpdateGroupColor={handleUpdateGroupColor}
      />
    </div>
  );
}

export default App;
