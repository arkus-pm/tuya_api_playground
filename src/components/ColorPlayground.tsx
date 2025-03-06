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

interface GradientPoint {
  position: number; // Position from 0 to 1
  hue: number;
  speed: number;
  offset: number; // Phase offset for smoother animation
}

interface GradientSettings {
  numColors: number;
  speed: number;
  smoothness: number;
  lightness: number; // New setting for color lightness
}

export const ColorPlayground: React.FC<ColorPlaygroundProps> = ({
  groups,
  onColorUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 600, height: 400 });
  const [targets, setTargets] = useState<{ [key: string]: Position }>(() => {
    // Load saved positions from localStorage on initial render
    const savedPositions = localStorage.getItem("colorPlaygroundPositions");
    return savedPositions ? JSON.parse(savedPositions) : {};
  });
  const [draggingTarget, setDraggingTarget] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<Position | null>(null);
  const colorCacheRef = useRef<ColorCache>({});
  const colorDebounceRef = useRef<{ [key: string]: number }>({});
  const animationFrameRef = useRef<number>();
  const offsetRef = useRef(0);
  const DEBOUNCE_DELAY = 100; // ms between color updates

  // Gradient settings with defaults
  const [settings, setSettings] = useState<GradientSettings>({
    numColors: 6,
    speed: 0.0002,
    smoothness: 0.1,
    lightness: 35, // Default lightness value
  });

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
    const newTargets: { [key: string]: Position } = { ...targets };

    groups.forEach((group) => {
      if (group.listenColor && !newTargets[group.id]) {
        // Only set default if no position exists (including in localStorage)
        newTargets[group.id] = { x: 50, y: 50 };
      }
    });

    if (JSON.stringify(newTargets) !== JSON.stringify(targets)) {
      setTargets(newTargets);
      localStorage.setItem(
        "colorPlaygroundPositions",
        JSON.stringify(newTargets)
      );
    }
  }, [groups]);

  // Save positions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("colorPlaygroundPositions", JSON.stringify(targets));
  }, [targets]);

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

          // Check if this is the first update or if colors are different
          const hasChanges = !cached || !areColorsEqual(cached.color, color);

          // Only update if forced, no cached value, or there are actual changes
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

  const generateGradientColors = useCallback(
    (numColors: number) => {
      const colors = [];

      // Custom hue distribution to create visually equal segments
      const hueAdjustments = {
        red: 0, // 0°
        yellow: 60, // 60°
        green: 120, // 120°
        cyan: 180, // 180°
        blue: 240, // 240°
        magenta: 300, // 300°
      };

      // Calculate adjusted positions for better visual distribution
      for (let i = 0; i < numColors; i++) {
        const pos = i / numColors;

        // Map the linear position to adjusted hue values
        const hueProgress = (i * 360) / numColors;
        let adjustedHue = hueProgress;

        // Apply custom adjustments for more even visual distribution
        if (hueProgress <= 60) {
          // red to yellow
          adjustedHue = hueProgress * 1.5;
        } else if (hueProgress <= 120) {
          // yellow to green
          adjustedHue = 60 + (hueProgress - 60) * 0.7;
        } else if (hueProgress <= 240) {
          // green to blue
          adjustedHue = 120 + (hueProgress - 120);
        } else {
          // blue to red
          adjustedHue = 240 + (hueProgress - 240) * 1.2;
        }

        colors.push({
          pos,
          color: `hsl(${adjustedHue % 360}, 100%, ${settings.lightness}%)`,
        });
      }

      // Add the final color stop to match the first one for smooth looping
      colors.push({
        pos: 1,
        color: colors[0].color,
      });

      return colors;
    },
    [settings.lightness]
  );

  const drawGradient = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      // Clear any previous filters
      ctx.filter = "none";

      // Update offset
      offsetRef.current = (offsetRef.current + settings.speed) % 1;

      // Create gradient with offset
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);

      // Generate colors based on current settings
      const colors = generateGradientColors(settings.numColors);

      // Add color stops with offset
      colors.forEach(({ pos, color }) => {
        let offsetPos = (pos + offsetRef.current) % 1;
        if (offsetPos < 0) offsetPos += 1;
        gradient.addColorStop(offsetPos, color);
      });

      // Clear and draw gradient
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Apply blur filter based on smoothness
      if (settings.smoothness > 0) {
        ctx.filter = `blur(${settings.smoothness * 20}px)`;
        ctx.drawImage(canvas, 0, 0);
      }

      animationFrameRef.current = requestAnimationFrame(drawGradient);
    },
    [settings, generateGradientColors]
  );

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    drawGradient(performance.now());
  }, [drawGradient]);

  useEffect(() => {
    initCanvas();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [initCanvas]);

  // Restore the color update interval
  useEffect(() => {
    const intervalId = setInterval(() => {
      updateTargetColors(false);
    }, 500); // Update colors every second

    return () => clearInterval(intervalId);
  }, [updateTargetColors]);

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

    const newTargets = {
      ...targets,
      [draggingTarget]: { x: boundedX, y: boundedY },
    };
    setTargets(newTargets);
    localStorage.setItem(
      "colorPlaygroundPositions",
      JSON.stringify(newTargets)
    );

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
    <div>
      <div
        className="controls"
        style={{
          marginBottom: "1rem",
          padding: "1rem",
          background: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Number of Colors: {settings.numColors}
          </label>
          <input
            type="range"
            min="2"
            max="12"
            value={settings.numColors}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                numColors: parseInt(e.target.value),
              }))
            }
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Speed: {settings.speed.toFixed(5)}
          </label>
          <input
            type="range"
            min="0"
            max="0.1"
            step="0.001"
            value={settings.speed}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                speed: parseFloat(e.target.value),
              }))
            }
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Blur: {settings.smoothness.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.smoothness}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                smoothness: parseFloat(e.target.value),
              }))
            }
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Color Brightness: {settings.lightness}%
          </label>
          <input
            type="range"
            min="20"
            max="60"
            value={settings.lightness}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                lightness: parseInt(e.target.value),
              }))
            }
            style={{ width: "100%" }}
          />
        </div>
      </div>

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
    </div>
  );
};
