import React, { useState, useEffect } from "react";
import { getAuthToken } from "../services/firebase";
import { config } from "../config";

const AdminPage: React.FC = () => {
    const [reports, setReports] = useState<any[]>([]);
    const [waitlist, setWaitlist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"usage" | "waitlist">("usage");

    useEffect(() => {
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

    const fetchUsage = async (token: string) => {
        const res = await fetch(`${config.backend.url}/admin/usage`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
            const data = await res.json();
            const sorted = (data.reports || []).sort((a: any, b: any) =>
                b.date.localeCompare(a.date)
            );
            setReports(sorted);
        } else if (res.status === 403) {
            throw new Error("Access denied. Admin privileges required.");
        }
    };

    const fetchWaitlist = async (token: string) => {
        const res = await fetch(`${config.backend.url}/admin/waitlist`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
            const data = await res.json();
            setWaitlist(data.waitlist || []);
        }
    };

    return (
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px" }}>
            <header style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 32,
                background: "white",
                padding: "24px 32px",
                borderRadius: 16,
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)"
            }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>
                        1-prompt <span style={{ color: "var(--kb-primary-blue)" }}>Admin</span>
                    </h1>
                    <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                        <button
                            onClick={() => setActiveTab("usage")}
                            style={{
                                border: "none",
                                background: activeTab === "usage" ? "#E0E7FF" : "transparent",
                                color: activeTab === "usage" ? "var(--kb-primary-blue)" : "#6B7280",
                                padding: "6px 12px",
                                borderRadius: 6,
                                cursor: "pointer",
                                fontWeight: 700
                            }}
                        >
                            📊 Usage ({reports.length})
                        </button>
                        <button
                            onClick={() => setActiveTab("waitlist")}
                            style={{
                                border: "none",
                                background: activeTab === "waitlist" ? "#E0E7FF" : "transparent",
                                color: activeTab === "waitlist" ? "var(--kb-primary-blue)" : "#6B7280",
                                padding: "6px 12px",
                                borderRadius: 6,
                                cursor: "pointer",
                                fontWeight: 700
                            }}
                        >
                            🔒 Waitlist ({waitlist.length})
                        </button>
                    </div>
                </div>
                <button
                    onClick={fetchAll}
                    disabled={loading}
                    style={{
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
                    }}
                >
                    {loading ? "Refreshing..." : "🔄 Refresh"}
                </button>
            </header>

            {error ? (
                <div style={{
                    background: "#FEF2F2",
                    border: "1px solid #FCA5A5",
                    color: "#991B1B",
                    padding: 24,
                    borderRadius: 12,
                    textAlign: "center",
                    fontWeight: 600
                }}>
                    {error}
                </div>
            ) : loading && reports.length === 0 ? (
                <div style={{ textAlign: "center", padding: 80 }}>
                    <div className="kb-spinner" style={{
                        width: 40, height: 40, border: "4px solid #DFE1E6",
                        borderTopColor: "var(--kb-primary-blue)", borderRadius: "50%",
                        margin: "0 auto 16px"
                    }}></div>
                    <p style={{ fontWeight: 600, color: "var(--kb-text-secondary)" }}>Loading dashboard...</p>
                </div>
            ) : activeTab === "usage" ? (
                reports.length === 0 ? (
                    <div style={{
                        background: "white",
                        padding: 60,
                        borderRadius: 16,
                        textAlign: "center",
                        border: "2px dashed #E5E7EB"
                    }}>
                        <p style={{ fontSize: 18, color: "var(--kb-text-secondary)", fontWeight: 600 }}>No usage data found.</p>
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
                        {reports.map((report, idx) => (
                            <div key={idx} style={{
                                background: "white",
                                borderRadius: 16,
                                padding: 24,
                                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.04)",
                                border: "1px solid #F3F4F6"
                            }}>
                                <div style={{ marginBottom: 20 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--kb-primary-blue)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                                        {report.date}
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--kb-text-main)", wordBreak: "break-all" }}>
                                        {report.email || "Anonymous"}
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: 12 }}>
                                    <div style={{ flex: 1, background: "#F0F9FF", padding: 16, borderRadius: 12 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: "#0284C7", marginBottom: 4 }}>CAPTURES</div>
                                        <div style={{ fontSize: 32, fontWeight: 900, color: "#0C4A6E" }}>{report.captures}</div>
                                    </div>
                                    <div style={{ flex: 1, background: "#F0FDF4", padding: 16, borderRadius: 12 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: "#16A34A", marginBottom: 4 }}>COMPILES</div>
                                        <div style={{ fontSize: 32, fontWeight: 900, color: "#064E3B" }}>{report.compiles}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                <div style={{ background: "white", borderRadius: 16, border: "1px solid #F3F4F6", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead style={{ background: "#F9FAFB" }}>
                            <tr>
                                <th style={{ textAlign: "left", padding: "16px 24px", fontSize: 13, color: "#4B5563" }}>Email</th>
                                <th style={{ textAlign: "right", padding: "16px 24px", fontSize: 13, color: "#4B5563" }}>Joined Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {waitlist.length === 0 ? (
                                <tr>
                                    <td colSpan={2} style={{ padding: 40, textAlign: "center", color: "#9CA3AF" }}>No waitlist signups yet.</td>
                                </tr>
                            ) : (
                                waitlist.map((item, idx) => (
                                    <tr key={idx} style={{ borderTop: "1px solid #F3F4F6" }}>
                                        <td style={{ padding: "16px 24px", fontWeight: 600 }}>{item.email}</td>
                                        <td style={{ padding: "16px 24px", textAlign: "right", color: "#6B7280" }}>
                                            {new Date(item.timestamp).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminPage;
