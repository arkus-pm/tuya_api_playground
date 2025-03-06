import React, { useState } from "react";
import { ColorPlayground } from "./ColorPlayground";
import { TuyaGroup } from "../types/tuya";
import { Group } from "../types/Group";

interface ColorManagerProps {
  tuyaGroups: TuyaGroup[];
  onUpdateGroupColor: (
    groupId: string,
    hsv: { h: number; s: number; v: number }
  ) => void;
}

export const ColorManager: React.FC<ColorManagerProps> = ({
  tuyaGroups,
  onUpdateGroupColor,
}) => {
  const [colorListeningGroups, setColorListeningGroups] = useState<{
    [key: string]: boolean;
  }>({});

  const handleToggleGroupListen = (groupId: string) => {
    setColorListeningGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleColorUpdate = (
    groupId: string,
    hsv: { h: number; s: number; v: number }
  ) => {
    onUpdateGroupColor(groupId, hsv);
  };

  // Convert TuyaGroups to the format expected by ColorPlayground
  const playgroundGroups: Group[] = tuyaGroups.map((tuyaGroup) => ({
    id: tuyaGroup.group_id,
    name: tuyaGroup.group_name,
    listenColor: !!colorListeningGroups[tuyaGroup.group_id],
  }));

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h3>Color Listening Groups</h3>
        <div
          style={{
            display: "flex",
            gap: "20px",
            flexWrap: "wrap",
            padding: "15px",
            backgroundColor: "#f5f5f5",
            borderRadius: "8px",
          }}
        >
          {tuyaGroups.map((group) => (
            <div
              key={group.group_id}
              style={{
                padding: "12px",
                backgroundColor: "white",
                border: "1px solid #ddd",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                minWidth: "200px",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                <input
                  type="checkbox"
                  checked={!!colorListeningGroups[group.group_id]}
                  onChange={() => handleToggleGroupListen(group.group_id)}
                />
                <span>{group.group_name}</span>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "20px",
          backgroundColor: "#f5f5f5",
        }}
      >
        <ColorPlayground
          groups={playgroundGroups}
          onColorUpdate={handleColorUpdate}
        />
      </div>
    </div>
  );
};
