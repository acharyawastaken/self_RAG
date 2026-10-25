import React, { useState, useEffect, useRef } from "react";
import {
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Player } from "@remotion/player";
import { useTheme } from "@/context/ThemeContext";

/**
 * 1. Remotion Video MarkerHighlight Component (Exact specification)
 */
export function MarkerHighlight({
  before = "",
  highlight,
  after = "",
  markerColor = "#facc15",
  baseColor = "#171717",
  highlightedTextColor = "#171717",
  backgroundColor = "transparent",
  fontSize = 72,
  fontWeight = 600,
  speed = 1,
  className = "",
}) {
  const frame = useCurrentFrame() * speed;
  const { fps } = useVideoConfig();

  const markerScale = spring({
    frame: frame - 15,
    fps,
    config: { damping: 14 },
  });

  const textColor = interpolateColors(
    interpolate(markerScale, [0.5, 0.8], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    [0, 1],
    [baseColor, highlightedTextColor],
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: backgroundColor,
      }}
    >
      <span
        className={className}
        style={{
          fontSize,
          fontWeight,
          color: baseColor,
          letterSpacing: "-0.03em",
          fontFamily:
            "var(--font-sans), -apple-system, BlinkMacSystemFont, sans-serif",
          padding: "0 16px",
          textAlign: "center",
        }}
      >
        {before}
        <span style={{ position: "relative", display: "inline-block", padding: "0 0.08em" }}>
          <span
            aria-hidden
            style={{
              position: "absolute",
              inset: "0 -0.12em",
              background: markerColor,
              transformOrigin: "left center",
              transform: `scaleX(${markerScale})`,
              zIndex: 0,
              borderRadius: "4px",
            }}
          />
          <span style={{ position: "relative", zIndex: 1, color: textColor, transition: "color 0.15s ease" }}>
            {highlight}
          </span>
        </span>
        {after}
      </span>
    </div>
  );
}

/**
 * 2. Interactive Cursor Marker Highlight Component
 * Used directly on any text across web pages that the user's cursor moves on.
 * Sweeps the highlighter across when the cursor hovers or moves over the text.
 */
export function CursorMarkerHighlight({
  before = "",
  highlight,
  after = "",
  children,
  markerColor = "#facc15",
  baseColor,
  highlightedTextColor = "#171717",
  fontSize,
  fontWeight,
  className = "",
  style = {},
  autoAnimateOnView = false,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef(null);
  const animationFrameRef = useRef(null);

  const textToHighlight = highlight || (typeof children === "string" ? children : "");

  const progressRef = useRef(0);

  // Spring physics interpolation when hovered
  useEffect(() => {
    let current = progressRef.current;
    const target = isHovered ? 1 : 0;
    const speed = isHovered ? 0.12 : 0.16;

    const animate = () => {
      current += (target - current) * speed;
      if (Math.abs(target - current) < 0.005) {
        current = target;
        progressRef.current = current;
        setProgress(current);
        return;
      }
      progressRef.current = current;
      setProgress(current);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isHovered]);

  // Optional trigger on scroll into view
  useEffect(() => {
    if (!autoAnimateOnView || !containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsHovered(true);
          setTimeout(() => setIsHovered(false), 2400);
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [autoAnimateOnView]);

  // Tracking cursor entry position
  const handleMouseMove = (e) => {
    setIsHovered(true);
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    containerRef.current.style.setProperty("--cursor-ratio", `${percent * 100}%`);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const activeTextColor = progress > 0.4 ? highlightedTextColor : (baseColor || "inherit");

  return (
    <span
      ref={containerRef}
      className={`cursor-marker-highlight-root ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        display: "inline",
        fontSize,
        fontWeight,
        letterSpacing: "-0.02em",
        cursor: "pointer",
        ...style,
      }}
    >
      {before && <span>{before}</span>}
      <span
        style={{
          position: "relative",
          display: "inline-block",
          padding: "0 0.12em",
          margin: "0 -0.05em",
        }}
      >
        {/* Animated Marker Pen Swipe */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "0.08em -0.08em 0.08em -0.08em",
            background: markerColor,
            transformOrigin: "left center",
            transform: `scaleX(${progress})`,
            transition: "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
            zIndex: 0,
            borderRadius: "3px",
            boxShadow: isHovered ? "0 1px 8px rgba(250, 204, 21, 0.45)" : "none",
          }}
        />
        {/* Text with high contrast transition */}
        <span
          style={{
            position: "relative",
            zIndex: 1,
            color: activeTextColor,
            transition: "color 0.18s ease",
            fontWeight: isHovered ? 600 : "inherit",
          }}
        >
          {textToHighlight}
        </span>
      </span>
      {after && <span>{after}</span>}
    </span>
  );
}

/**
 * 3. Helper hook for prefersDark
 */
export function usePrefersDark() {
  const [prefersDark, setPrefersDark] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setPrefersDark(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return prefersDark;
}

/**
 * 4. Remotion Scene Composition for DemoDefault
 */
export function MarkerHighlightScene({
  prefersDark,
  text = "builders",
  before = "Made for ",
  after = ".",
  markerColor = "#facc15",
  fontSize = 72,
}) {
  return (
    <MarkerHighlight
      before={before}
      highlight={text}
      after={after}
      markerColor={markerColor}
      baseColor={prefersDark ? "#fafafa" : "#171717"}
      highlightedTextColor="#171717"
      backgroundColor={prefersDark ? "#09090b" : "#ffffff"}
      fontSize={fontSize}
      fontWeight={600}
      speed={1}
    />
  );
}

/**
 * 5. Complete Demo Component as requested
 */
export default function DemoDefault() {
  const appTheme = useTheme();
  const systemPrefersDark = usePrefersDark();
  const prefersDark = appTheme ? appTheme.isDark : systemPrefersDark;

  const [interactiveWord, setInteractiveWord] = useState("builders");

  return (
    <div
      style={{
        width: "100%",
        minHeight: "750px",
        borderRadius: "var(--radius-bento)",
        overflow: "hidden",
        border: "1px solid var(--border-color)",
        background: prefersDark ? "#09090b" : "#ffffff",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Controls Bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "16px 24px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-card)",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            className="bento-capsule"
            style={{
              padding: "4px 10px",
              fontSize: "10px",
              letterSpacing: "0.25em",
            }}
          >
            <span
              className="bento-capsule-dot"
              style={{ background: "#facc15" }}
            />
            Remotion Player + Cursor Highlight
          </span>
          <span
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Marker Highlight Suite
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Try typing:
          </span>
          <input
            type="text"
            value={interactiveWord}
            onChange={(e) => setInteractiveWord(e.target.value || "builders")}
            placeholder="Change word"
            style={{
              width: "140px",
              padding: "4px 10px",
              fontSize: "0.8rem",
              borderRadius: "var(--radius-full)",
            }}
          />
        </div>
      </div>

      {/* Main Remotion Player */}
      <div style={{ flex: 1, minHeight: "440px", position: "relative" }}>
        <Player
          component={MarkerHighlightScene}
          inputProps={{
            prefersDark,
            text: interactiveWord,
          }}
          durationInFrames={90}
          fps={30}
          compositionWidth={1200}
          compositionHeight={600}
          controls={false}
          autoPlay
          loop
          style={{ width: "100%", height: "100%", minHeight: "440px" }}
        />
      </div>

      {/* Interactive Cursor Testbed Bar */}
      <div
        style={{
          padding: "20px 24px",
          borderTop: "1px solid var(--border-color)",
          background: "var(--bg-card)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontSize: "0.78rem",
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: "var(--text-muted)",
            fontWeight: 600,
          }}
        >
          Hover over the text below with your cursor:
        </div>
        <div
          style={{
            fontSize: "clamp(1.2rem, 3vw, 1.8rem)",
            fontWeight: 700,
            color: "var(--text-primary)",
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <span>Accelerate your flow with</span>
          <CursorMarkerHighlight
            highlight="autonomous reasoning"
            markerColor="#facc15"
            highlightedTextColor="#171717"
          />
          <span>and verify each step with</span>
          <CursorMarkerHighlight
            highlight="knowledge graphs"
            markerColor="#38bdf8"
            highlightedTextColor="#0f172a"
          />
          <span>built for</span>
          <CursorMarkerHighlight
            highlight="deep clarity"
            markerColor="#4ade80"
            highlightedTextColor="#052e16"
          />
        </div>
      </div>
    </div>
  );
}

export { DemoDefault };
