import { useTheme, ACCENT_COLORS } from "../context/ThemeContext";

/**
 * ThemePanel
 * - Tất cả user: toggle dark/light
 * - Chỉ admin/staff: chọn màu accent
 *
 * Props:
 *   compact (bool) – dạng icon-only cho sidebar thu gọn
 */
export default function ThemePanel({ compact = false }) {
  const { mode, toggleMode, accent, changeAccent, canChangeAccent } = useTheme();

  return (
    <div className="theme-panel-wrapper" style={styles.wrapper}> {/* Trọng thêm: Thêm className */}
      {/* ── Dark / Light toggle ────────────────────────── */}
      <div className="theme-panel-row" style={styles.row}> {/* Trọng thêm: Thêm className */}
        {!compact && <span className="theme-panel-label" style={styles.label}>Giao diện</span>} {/* Trọng thêm: Thêm className */}

        <button
          onClick={toggleMode}
          title={mode === "dark" ? "Chuyển sáng" : "Chuyển tối"}
          style={{ ...styles.modeBtn, ...(compact ? styles.modeBtnCompact : {}) }}
          aria-label="Toggle dark/light mode"
        >
          <span style={styles.track(mode)}>
            <span style={styles.thumb(mode)} />
          </span>
          {!compact && (
            <span className="theme-panel-mode-label" style={styles.modeLabel}> {/* Trọng thêm: Thêm className */}
              {mode === "dark" ? "🌙 Tối" : "☀️ Sáng"}
            </span>
          )}
        </button>
      </div>

      {/* Trọng thêm: Đã bỏ phần chọn màu chủ đạo theo yêu cầu */}
    </div>
  );
}

/* ── Inline styles (dùng CSS vars được inject bởi ThemeContext) ──────── */
const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "10px 12px",
    background: "var(--bg-secondary)",
    borderRadius: "10px",
    border: "1px solid var(--border)",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
  },
  label: {
    fontSize: "12px",
    color: "var(--text-secondary)",
    whiteSpace: "nowrap",
    userSelect: "none",
  },
  modeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: 0,
  },
  modeBtnCompact: {
    margin: "auto",
  },
  track: (mode) => ({
    position: "relative",
    width: "36px",
    height: "20px",
    borderRadius: "10px",
    background: mode === "dark" ? "var(--accent)" : "#ccc",
    transition: "background 0.25s",
    flexShrink: 0,
    cursor: "pointer",
  }),
  thumb: (mode) => ({
    position: "absolute",
    top: "2px",
    left: mode === "dark" ? "18px" : "2px",
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    background: "#fff",
    transition: "left 0.25s",
    boxShadow: "0 1px 3px rgba(0,0,0,.3)",
  }),
  modeLabel: {
    fontSize: "12px",
    color: "var(--text-secondary)",
    userSelect: "none",
  },
  swatches: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  swatch: {
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    transition: "transform 0.15s, outline 0.15s",
    flexShrink: 0,
  },
};
