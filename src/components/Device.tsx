import React from "react";
import { TuyaDevice, DeviceStatus } from "../types/tuya";
import { tuyaService } from "../services/tuya";

interface DeviceProps {
  device: TuyaDevice;
  onUpdateStatus: (deviceId: string, newStatus: DeviceStatus) => void;
  onError: () => void;
}

export function Device({ device, onUpdateStatus, onError }: DeviceProps) {
  const isOn = device.status.find((s) => s.code === "switch_led")
    ?.value as boolean;
  const brightness = device.status.find((s) => s.code === "bright_value_v2")
    ?.value as number;
  const colorStatus = (device.status.find((s) => s.code === "colour_data_v2")
    ?.value as { h: number; s: number; v: number }) || { h: 0, s: 0, v: 1000 };

  // Convert Tuya values to 0-1 range for our sliders
  const [hue, setHue] = React.useState(colorStatus.h / 360);
  const [saturation, setSaturation] = React.useState(colorStatus.s / 1000);
  const [lightness, setLightness] = React.useState(colorStatus.v / 1000);

  const handleToggle = async () => {
    const newStatus: DeviceStatus = {
      code: "switch_led",
      value: !isOn,
    };

    // Update state optimistically
    onUpdateStatus(device.id, newStatus);

    try {
      await tuyaService.toggleDevice(device.id, isOn);
    } catch (error) {
      console.error("Error toggling device:", error);
      // Revert the optimistic update on error
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
    onUpdateStatus(device.id, newStatus);

    try {
      await tuyaService.setBrightness(device.id, newBrightness);
    } catch (error) {
      console.error("Error setting brightness:", error);
      // Revert the optimistic update on error
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
    onUpdateStatus(device.id, newStatus);

    try {
      await tuyaService.setColor(device.id, h, s, l);
    } catch (error) {
      console.error("Error setting color:", error);
      // Revert the optimistic update on error
      onError();
    }
  };

  // Update color preview style
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
    <div className="device">
      <h3>{device.name}</h3>
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
      <div className="status">
        <span
          className={`status-dot ${device.online ? "online" : "offline"}`}
        />
        {device.online ? "Online" : "Offline"}
      </div>
    </div>
  );
}
