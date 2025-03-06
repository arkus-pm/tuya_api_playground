import React from "react";
import { TuyaGroup, DeviceStatus } from "../types/tuya";
import { tuyaService } from "../services/tuya";

interface GroupProps {
  group: TuyaGroup;
  onUpdateStatus: (groupId: string, newStatus: DeviceStatus) => void;
  onError: () => void;
}

export function Group({ group, onUpdateStatus, onError }: GroupProps) {
  const [properties, setProperties] = React.useState<any>(null);
  const [status, setStatus] = React.useState<any>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusData, propsData] = await Promise.all([
          tuyaService.getGroupStatus(group.group_id),
          tuyaService.getGroupProperties(group.group_id),
        ]);
        setStatus(statusData);
        setProperties(propsData);
      } catch (error) {
        console.error("Error fetching group data:", error);
        onError();
      }
    };

    fetchData();
    // Set up polling for status updates
    const intervalId = setInterval(fetchData, 5000);
    return () => clearInterval(intervalId);
  }, [group.group_id]);

  // Get current values from status
  const statusMap = React.useMemo(() => {
    if (!status) return {};
    return status.reduce((acc: any, item: any) => {
      // Parse values based on their type
      let value = item.value;
      switch (item.type) {
        case "bool":
          value = value === "true" || value === true;
          break;
        case "value":
          value = parseInt(value, 10);
          break;
        // For other types (string, raw, enum) keep as is
      }
      acc[item.code] = value;
      return acc;
    }, {});
  }, [status]);

  // Provide default values when status is undefined
  const isOn = statusMap.switch_led ?? false;
  const brightness = statusMap.bright_value ?? 1000;
  const workMode = statusMap.work_mode ?? "white";

  // Parse color data if available
  const colorData = React.useMemo(() => {
    if (!statusMap.colour_data) return { h: 0, s: 0, v: 1000 };
    const value = statusMap.colour_data;
    // Parse the hex string: HHHHSSSSVVVV (h: 2 bytes, s: 2 bytes, v: 2 bytes)
    const h = parseInt(value.substring(0, 4), 16);
    const s = parseInt(value.substring(4, 8), 16);
    const v = parseInt(value.substring(8, 12), 16);
    return { h, s, v };
  }, [statusMap.colour_data]);

  // Convert Tuya values to 0-1 range for our sliders
  const [hue, setHue] = React.useState(colorData.h / 360);
  const [saturation, setSaturation] = React.useState(colorData.s / 1000);
  const [lightness, setLightness] = React.useState(colorData.v / 1000);

  // Update state when status changes
  React.useEffect(() => {
    setHue(colorData.h / 360);
    setSaturation(colorData.s / 1000);
    setLightness(colorData.v / 1000);
  }, [colorData]);

  // Update state when properties change
  React.useEffect(() => {
    if (properties?.colour_data_v2) {
      setHue(properties.colour_data_v2.h / 360);
      setSaturation(properties.colour_data_v2.s / 1000);
      setLightness(properties.colour_data_v2.v / 1000);
    }
  }, [properties]);

  const handleToggle = async () => {
    const newStatus: DeviceStatus = {
      code: "switch_led",
      value: !isOn,
    };

    // Update state optimistically
    onUpdateStatus(group.group_id, newStatus);

    try {
      await tuyaService.toggleGroup(group.group_id, isOn);
    } catch (error) {
      console.error("Error toggling group:", error);
      onError();
    }
  };

  const handleBrightnessChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newBrightness = parseInt(e.target.value);
    const newStatus: DeviceStatus = {
      code: "bright_value_v2",
      value: newBrightness,
    };

    // Update state optimistically
    onUpdateStatus(group.group_id, newStatus);

    try {
      await tuyaService.setGroupBrightness(group.group_id, newBrightness);
    } catch (error) {
      console.error("Error setting group brightness:", error);
      onError();
    }
  };

  const handleColorChange = async (
    h: number = hue,
    s: number = saturation,
    l: number = lightness
  ) => {
    const newStatus: DeviceStatus = {
      code: "colour_data_v2",
      value: {
        h: Math.round(h * 360),
        s: Math.round(s * 1000),
        v: Math.round(l * 1000),
      },
    };

    // Update state optimistically
    onUpdateStatus(group.group_id, newStatus);

    try {
      await tuyaService.setGroupColor(group.group_id, h, s, l);
    } catch (error) {
      console.error("Error setting group color:", error);
      onError();
    }
  };

  const colorPreviewStyle = {
    backgroundColor: `hsl(${hue * 360}deg ${saturation * 100}% ${
      lightness * 100
    }%)`,
    width: "50px",
    height: "50px",
    borderRadius: "4px",
    border: "2px solid #ccc",
    margin: "0 auto",
  };

  return (
    <div className="group">
      <h3>{group.group_name}</h3>
      <div className="meta-info">
        <span className="device-count">{group.device_num} devices</span>
      </div>
      <div className="controls">
        <button
          onClick={handleToggle}
          className={`toggle-btn ${isOn ? "on" : "off"}`}
        >
          {isOn ? "Turn Off" : "Turn On"}
        </button>

        <div className="brightness">
          <label>Brightness:</label>
          <input
            type="range"
            min="10"
            max="1000"
            value={brightness}
            onChange={handleBrightnessChange}
          />
          <span>{Math.round((brightness / 1000) * 100)}%</span>
        </div>

        {isOn && (
          <div className="color-controls">
            <div style={colorPreviewStyle} />

            <div className="color-sliders">
              <div className="color-slider">
                <label>Hue:</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={hue}
                  onChange={(e) => {
                    const newHue = parseFloat(e.target.value);
                    setHue(newHue);
                    handleColorChange(newHue, saturation, lightness);
                  }}
                  style={{
                    background: `linear-gradient(to right, 
                      hsl(0, 100%, 50%),
                      hsl(60, 100%, 50%),
                      hsl(120, 100%, 50%),
                      hsl(180, 100%, 50%),
                      hsl(240, 100%, 50%),
                      hsl(300, 100%, 50%),
                      hsl(360, 100%, 50%)
                    )`,
                  }}
                />
              </div>

              <div className="color-slider">
                <label>Saturation:</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={saturation}
                  onChange={(e) => {
                    const newSaturation = parseFloat(e.target.value);
                    setSaturation(newSaturation);
                    handleColorChange(hue, newSaturation, lightness);
                  }}
                  style={{
                    background: `linear-gradient(to right,
                      hsl(${hue * 360}deg, 0%, ${lightness * 100}%),
                      hsl(${hue * 360}deg, 100%, ${lightness * 100}%)
                    )`,
                  }}
                />
              </div>

              <div className="color-slider">
                <label>Lightness:</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={lightness}
                  onChange={(e) => {
                    const newLightness = parseFloat(e.target.value);
                    setLightness(newLightness);
                    handleColorChange(hue, saturation, newLightness);
                  }}
                  style={{
                    background: `linear-gradient(to right,
                      hsl(${hue * 360}deg, ${saturation * 100}%, 0%),
                      hsl(${hue * 360}deg, ${saturation * 100}%, 50%),
                      hsl(${hue * 360}deg, ${saturation * 100}%, 100%)
                    )`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
