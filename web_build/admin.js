import { r as reactExports, j as jsxRuntimeExports, c as clientExports, a as React } from "./vendor.js";
import { a as getAuthToken, c as config } from "./firebase.js";
/* empty css          */
const AdminPage = () => {
  const [reports, setReports] = reactExports.useState([]);
  const [waitlist, setWaitlist] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const [activeTab, setActiveTab] = reactExports.useState("usage");
  reactExports.useEffect(() => {
    fetchAll();
  }, []);
  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    const token = await getAuthToken();
    if (!token) {
      setError("Not authenticated. Please login in the extension sidepanel first.");
      setLoading(false);
      return;
    }
    try {
      await Promise.all([fetchUsage(token), fetchWaitlist(token)]);
    } catch (err) {
      console.error("Admin fetch error:", err);
      setError("An error occurred while fetching dashboard data.");
    } finally {
      setLoading(false);
    }
  };
  const fetchUsage = async (token) => {
    const res = await fetch(`${config.backend.url}/admin/usage`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      const sorted = (data.reports || []).sort(
        (a, b) => b.date.localeCompare(a.date)
      );
      setReports(sorted);
    } else if (res.status === 403) {
      throw new Error("Access denied. Admin privileges required.");
    }
  };
  const fetchWaitlist = async (token) => {
    const res = await fetch(`${config.backend.url}/admin/waitlist`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setWaitlist(data.waitlist || []);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { maxWidth: 1e3, margin: "0 auto", padding: "40px 20px" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 32,
      background: "white",
      padding: "24px 32px",
      borderRadius: 16,
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)"
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { style: { fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }, children: [
          "1-prompt ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "var(--kb-primary-blue)" }, children: "Admin" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 16, marginTop: 12 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => setActiveTab("usage"),
              style: {
                border: "none",
                background: activeTab === "usage" ? "#E0E7FF" : "transparent",
                color: activeTab === "usage" ? "var(--kb-primary-blue)" : "#6B7280",
                padding: "6px 12px",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 700
              },
              children: [
                "📊 Usage (",
                reports.length,
                ")"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => setActiveTab("waitlist"),
              style: {
                border: "none",
                background: activeTab === "waitlist" ? "#E0E7FF" : "transparent",
                color: activeTab === "waitlist" ? "var(--kb-primary-blue)" : "#6B7280",
                padding: "6px 12px",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 700
              },
              children: [
                "🔒 Waitlist (",
                waitlist.length,
                ")"
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: fetchAll,
          disabled: loading,
          style: {
            background: "var(--kb-primary-blue)",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: 8,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8
          },
          children: loading ? "Refreshing..." : "🔄 Refresh"
        }
      )
    ] }),
    error ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
      background: "#FEF2F2",
      border: "1px solid #FCA5A5",
      color: "#991B1B",
      padding: 24,
      borderRadius: 12,
      textAlign: "center",
      fontWeight: 600
    }, children: error }) : loading && reports.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { textAlign: "center", padding: 80 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kb-spinner", style: {
        width: 40,
        height: 40,
        border: "4px solid #DFE1E6",
        borderTopColor: "var(--kb-primary-blue)",
        borderRadius: "50%",
        margin: "0 auto 16px"
      } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontWeight: 600, color: "var(--kb-text-secondary)" }, children: "Loading dashboard..." })
    ] }) : activeTab === "usage" ? reports.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
      background: "white",
      padding: 60,
      borderRadius: 16,
      textAlign: "center",
      border: "2px dashed #E5E7EB"
    }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: 18, color: "var(--kb-text-secondary)", fontWeight: 600 }, children: "No usage data found." }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }, children: reports.map((report, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
      background: "white",
      borderRadius: 16,
      padding: 24,
      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.04)",
      border: "1px solid #F3F4F6"
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 20 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 13, fontWeight: 700, color: "var(--kb-primary-blue)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }, children: report.date }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 18, fontWeight: 800, color: "var(--kb-text-main)", wordBreak: "break-all" }, children: report.email || "Anonymous" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, background: "#F0F9FF", padding: 16, borderRadius: 12 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, fontWeight: 700, color: "#0284C7", marginBottom: 4 }, children: "CAPTURES" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 32, fontWeight: 900, color: "#0C4A6E" }, children: report.captures })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, background: "#F0FDF4", padding: 16, borderRadius: 12 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, fontWeight: 700, color: "#16A34A", marginBottom: 4 }, children: "COMPILES" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 32, fontWeight: 900, color: "#064E3B" }, children: report.compiles })
        ] })
      ] })
    ] }, idx)) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { background: "white", borderRadius: 16, border: "1px solid #F3F4F6", overflow: "hidden" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { style: { background: "#F9FAFB" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { textAlign: "left", padding: "16px 24px", fontSize: 13, color: "#4B5563" }, children: "Email" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { textAlign: "right", padding: "16px 24px", fontSize: 13, color: "#4B5563" }, children: "Joined Date" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: waitlist.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 2, style: { padding: 40, textAlign: "center", color: "#9CA3AF" }, children: "No waitlist signups yet." }) }) : waitlist.map((item, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { borderTop: "1px solid #F3F4F6" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "16px 24px", fontWeight: 600 }, children: item.email }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "16px 24px", textAlign: "right", color: "#6B7280" }, children: new Date(item.timestamp).toLocaleDateString() })
      ] }, idx)) })
    ] }) })
  ] });
};
const container = document.getElementById("root");
if (container) {
  const root = clientExports.createRoot(container);
  root.render(
    /* @__PURE__ */ jsxRuntimeExports.jsx(React.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(AdminPage, {}) })
  );
}
