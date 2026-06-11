import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

// Màu chủ đề có thể chọn (dành cho staff/admin)
export const ACCENT_COLORS = [
  { name: "Blue",   value: "blue",   hex: "#3B8BD4", dark: "#185FA5" },
  { name: "Teal",   value: "teal",   hex: "#1D9E75", dark: "#0F6E56" },
  { name: "Purple", value: "purple", hex: "#7F77DD", dark: "#534AB7" },
  { name: "Coral",  value: "coral",  hex: "#D85A30", dark: "#993C1D" },
  { name: "Pink",   value: "pink",   hex: "#D4537E", dark: "#993556" },
  { name: "Amber",  value: "amber",  hex: "#BA7517", dark: "#854F0B" },
];

export function ThemeProvider({ children, userRole }) {
  // Trọng thêm: Đọc user role từ localStorage làm dự phòng nếu không truyền qua prop
  const getRole = () => {
    if (userRole) return userRole;
    try {
      const saved = localStorage.getItem("LOGIN_USER");
      return saved ? JSON.parse(saved)?.role : "user";
    } catch {
      return "user";
    }
  };

  // dark | light
  const [mode, setMode] = useState(
    () => localStorage.getItem("scw_mode") || "dark"
  );
  // accent color (chỉ staff/admin mới lưu/dùng)
  const [accent, setAccent] = useState(
    () => localStorage.getItem("scw_accent") || "blue"
  );

  const role = getRole();
  const canChangeAccent = role === "admin" || role === "staff";

  // Áp CSS variables lên :root mỗi khi mode hoặc accent thay đổi
  useEffect(() => {
    const root = document.documentElement;
    const color = ACCENT_COLORS.find((c) => c.value === accent) || ACCENT_COLORS[0];

    if (mode === "dark") {
      root.setAttribute("data-theme", "dark");
      root.style.setProperty("--accent",       color.dark);
      root.style.setProperty("--accent-light",  color.hex);
      root.style.setProperty("--bg-primary",    "#0f1117");
      root.style.setProperty("--bg-secondary",  "#1a1d27");
      root.style.setProperty("--bg-card",       "#1e2130");
      root.style.setProperty("--text-primary",  "#e8e6dc");
      root.style.setProperty("--text-secondary","#9b9a93");
      root.style.setProperty("--border",        "rgba(255,255,255,0.08)");
    } else {
      root.setAttribute("data-theme", "light");
      root.style.setProperty("--accent",        color.hex);
      root.style.setProperty("--accent-light",  color.dark);
      root.style.setProperty("--bg-primary",    "#f4f3ef");
      root.style.setProperty("--bg-secondary",  "#ffffff");
      root.style.setProperty("--bg-card",       "#ffffff");
      root.style.setProperty("--text-primary",  "#1a1a18");
      root.style.setProperty("--text-secondary","#6b6b64");
      root.style.setProperty("--border",        "rgba(0,0,0,0.08)");
    }

    localStorage.setItem("scw_mode", mode);
    if (canChangeAccent) localStorage.setItem("scw_accent", accent);
  }, [mode, accent, canChangeAccent]);

  const toggleMode = () => setMode((m) => (m === "dark" ? "light" : "dark"));
  const changeAccent = (val) => { if (canChangeAccent) setAccent(val); };

  return (
    <ThemeContext.Provider value={{ mode, toggleMode, accent, changeAccent, canChangeAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
