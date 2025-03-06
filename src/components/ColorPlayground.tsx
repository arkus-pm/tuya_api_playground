import React, { useRef, useEffect, useState, useCallback } from "react";
import { Resizable } from "re-resizable";
import { Group } from "../types/Group";

interface ColorPlaygroundProps {
  groups: Group[];
  onColorUpdate: (
    groupId: string,
    hsv: { h: number; s: number; v: number }
  ) => void;
}

interface Position {
  x: number;
  y: number;
}

interface ColorCache {
  [key: string]: {
    position: Position;
    color: { h: number; s: number; v: number };
    timestamp: number;
  };
}

export const ColorPlayground: React.FC<ColorPlaygroundProps> = ({
  groups,
  onColorUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 600, height: 400 });
  const [targets, setTargets] = useState<{ [key: string]: Position }>({});
  const [draggingTarget, setDraggingTarget] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<Position | null>(null);
  const colorCacheRef = useRef<ColorCache>({});
  const colorDebounceRef = useRef<{ [key: string]: number }>({});
  const DEBOUNCE_DELAY = 100; // ms between color updates
  const COLOR_CACHE_LIFETIME = 5000; // Increased to 5 seconds to prevent frequent cache invalidation

  // Add helper function for color comparison
  const areColorsEqual = useCallback(
    (
      color1: { h: number; s: number; v: number },
      color2: { h: number; s: number; v: number }
    ) => {
      const tolerance = 1.0; // Increased tolerance for HSV values
      return (
        Math.abs(color1.h - color2.h) < tolerance &&
        Math.abs(color1.s - color2.s) < tolerance &&
        Math.abs(color1.v - color2.v) < tolerance
      );
    },
    []
  );

  // Initialize target positions when groups change
  useEffect(() => {
    const newTargets: { [key: string]: Position } = {};
    const existingTargets = { ...targets };

    groups.forEach((group) => {
      if (group.listenColor) {
        // Keep existing position if available, otherwise set default
        newTargets[group.id] = existingTargets[group.id] || { x: 50, y: 50 };
      }
    });

    if (JSON.stringify(newTargets) !== JSON.stringify(targets)) {
      setTargets(newTargets);
    }
  }, [groups]);

  const getPixelColor = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return null;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    try {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      const [r, g, b] = pixel;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      const s = max === 0 ? 0 : d / max;
      const v = max / 255;

      let h = 0;
      if (max === min) {
        h = 0;
      } else {
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
        }
        h *= 60;
      }

      return { h, s, v };
    } catch (error) {
      console.error("Error getting pixel color:", error);
      return null;
    }
  }, []);

  const updateTargetColors = useCallback(
    (forceUpdate: boolean = false) => {
      Object.entries(targets).forEach(([groupId, position]) => {
        const color = getPixelColor(position.x, position.y);
        if (color) {
          const now = Date.now();
          const cached = colorCacheRef.current[groupId];

          // Check if position changed or colors are different
          const hasChanges =
            !cached ||
            cached.position.x !== position.x ||
            cached.position.y !== position.y ||
            !areColorsEqual(cached.color, color);

          // Only update if forced or there are actual changes
          const shouldUpdate = forceUpdate || hasChanges;

          if (shouldUpdate) {
            if (cached) {
              console.log("Color update:", {
                groupId,
                oldColor: cached.color,
                newColor: color,
                forceUpdate,
                timeSinceLastUpdate: now - cached.timestamp,
                positionChanged:
                  cached.position.x !== position.x ||
                  cached.position.y !== position.y,
                hasColorChange: !areColorsEqual(cached.color, color),
              });
            }
            colorCacheRef.current[groupId] = {
              position,
              color,
              timestamp: now,
            };
            onColorUpdate(groupId, color);
          }
        }
      });
    },
    [targets, onColorUpdate, getPixelColor, areColorsEqual]
  );

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const ctx = canvas.getContext("2d");
    canvas.addEventListener("change", () => {
      console.log("canvas changed");
    });
    if (!ctx) return;

    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Add new effect for color updates
  useEffect(() => {
    const intervalId = setInterval(() => {
      updateTargetColors(false);
    }, 1000); // Increased interval to 1 second to reduce updates

    // Cleanup interval on unmount or when targets/updateTargetColors change
    return () => clearInterval(intervalId);
  }, [updateTargetColors, targets]);

  useEffect(() => {
    initCanvas();
  }, []);

  const handleMouseDown = (groupId: string, e: React.MouseEvent) => {
    setDraggingTarget(groupId);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingTarget || !mousePos) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const boundedX = Math.max(0, Math.min(x, rect.width));
    const boundedY = Math.max(0, Math.min(y, rect.height));

    setTargets((prev) => ({
      ...prev,
      [draggingTarget]: { x: boundedX, y: boundedY },
    }));

    const now = Date.now();
    const lastUpdate = colorDebounceRef.current[draggingTarget] || 0;

    if (now - lastUpdate > DEBOUNCE_DELAY) {
      const color = getPixelColor(boundedX, boundedY);
      if (color) {
        colorCacheRef.current[draggingTarget] = {
          position: { x: boundedX, y: boundedY },
          color,
          timestamp: now,
        };
        onColorUpdate(draggingTarget, color);
      }
      colorDebounceRef.current[draggingTarget] = now;
    }
  };

  const handleMouseUp = () => {
    setDraggingTarget(null);
    setMousePos(null);
  };

  return (
    <div
      ref={containerRef}
      style={{ position: "relative" }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <Resizable
        size={size}
        onResizeStop={(e, direction, ref, d) => {
          setSize({
            width: size.width + d.width,
            height: size.height + d.height,
          });
        }}
        style={{ position: "relative" }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        />

        {groups.map((group) => {
          if (!group.listenColor) return null;
          const position = targets[group.id] || { x: 0, y: 0 };

          return (
            <div
              key={group.id}
              onMouseDown={(e) => handleMouseDown(group.id, e)}
              style={{
                width: 20,
                height: 20,
                background: "white",
                border: "2px solid black",
                borderRadius: "50%",
                cursor: "move",
                position: "absolute",
                transform: "translate(-50%, -50%)",
                left: position.x,
                top: position.y,
                userSelect: "none",
              }}
            />
          );
        })}
      </Resizable>
    </div>
  );
};
