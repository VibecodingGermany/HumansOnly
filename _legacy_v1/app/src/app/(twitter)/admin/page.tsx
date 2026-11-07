"use client";

import Link from "next/link";
import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";

import { AuthContext } from "@/app/(twitter)/layout";
import CircularLoading from "@/components/misc/CircularLoading";
import { getAdminAnalyticsKpis, getAdminUsers, getAuthenticityAppeals, getModerationReports, getSystemHealth } from "@/utilities/fetch";

export default function AdminPage() {
    const { token, isPending } = useContext(AuthContext);
    const isAdminUser = token?.role === "admin";

    const { data: analyticsData, isLoading: isAnalyticsLoading } = useQuery({
        queryKey: ["admin-page", "analytics"],
        queryFn: () => getAdminAnalyticsKpis(7),
        enabled: isAdminUser,
    });

    const { data: usersData, isLoading: isUsersLoading } = useQuery({
        queryKey: ["admin-page", "users"],
        queryFn: () => getAdminUsers("", 20),
        enabled: isAdminUser,
    });

    const { data: reportsData, isLoading: isReportsLoading } = useQuery({
        queryKey: ["admin-page", "reports"],
        queryFn: () => getModerationReports("open", 20),
        enabled: isAdminUser,
    });

    const { data: appealsData, isLoading: isAppealsLoading } = useQuery({
        queryKey: ["admin-page", "appeals"],
        queryFn: () => getAuthenticityAppeals("open", 20),
        enabled: isAdminUser,
    });

    const { data: systemHealthData, isLoading: isSystemHealthLoading } = useQuery({
        queryKey: ["admin-page", "health"],
        queryFn: () => getSystemHealth(),
        enabled: isAdminUser,
        retry: 1,
        refetchInterval: 60_000,
    });

    if (isPending) return <CircularLoading />;

    if (!token || !isAdminUser) {
        return (
            <main className="admin-page">
                <h1 className="page-name">Admin</h1>
                <p className="text-muted">Admin access required.</p>
            </main>
        );
    }

    if (isAnalyticsLoading || isUsersLoading || isReportsLoading || isAppealsLoading || isSystemHealthLoading) return <CircularLoading />;

    const activitySummary = analyticsData?.activitySummary || { activeUsers: 0, postsCreated: 0, repliesCreated: 0 };
    const healthFlags = analyticsData?.healthFlags;
    const creatorCommerce = analyticsData?.creatorCommerce || {
        activeCreators: 0,
        publishedItems: 0,
        supportTransactions: 0,
        supportVolumeCents: 0,
    };
    const users = usersData?.users || [];
    const openReports = reportsData?.reports || [];
    const openAppeals = (appealsData?.appeals || []) as Array<{ id: string; slaState?: "on_track" | "due_soon" | "overdue" }>;
    const appealSlaSummary = openAppeals.reduce(
        (acc, appeal) => {
            if (appeal.slaState === "overdue") acc.overdue += 1;
            else if (appeal.slaState === "due_soon") acc.dueSoon += 1;
            else acc.onTrack += 1;
            return acc;
        },
        { onTrack: 0, dueSoon: 0, overdue: 0 }
    );
    const kpiHealthRows = [
        {
            label: "Active users",
            healthy: Boolean(healthFlags?.activeUsersHealthy),
        },
        {
            label: "Posts created",
            healthy: Boolean(healthFlags?.postsCreatedHealthy),
        },
        {
            label: "Replies created",
            healthy: Boolean(healthFlags?.repliesCreatedHealthy),
        },
    ];
    const unhealthyKpis = kpiHealthRows.filter((row) => !row.healthy).length;
    const moderationSeverity =
        appealSlaSummary.overdue > 0 ? "critical" : appealSlaSummary.dueSoon > 0 || openReports.length > 15 ? "warning" : "healthy";
    const creatorSeverity = creatorCommerce.activeCreators > 0 ? "healthy" : "warning";
    const systemHealth = systemHealthData as
        | {
              status?: string;
              uptimeSeconds?: number;
              nodeVersion?: string;
              release?: Record<string, string> | null;
          }
        | undefined;
    const status = (systemHealth?.status || "unknown").toLowerCase();
    const release = systemHealth?.release || null;
    const hasReleaseMetadata = Boolean(release?.sha || release?.run_id || release?.run_number);
    const systemSeverity = status !== "ok" ? "critical" : hasReleaseMetadata ? "healthy" : "warning";
    const systemLabel =
        systemSeverity === "critical"
            ? "Health endpoint degraded"
            : systemSeverity === "warning"
            ? "Healthy, release metadata missing"
            : "System healthy";
    const uptimeSeconds = typeof systemHealth?.uptimeSeconds === "number" ? systemHealth.uptimeSeconds : null;
    const uptimeLabel = uptimeSeconds === null ? "n/a" : `${Math.floor(uptimeSeconds / 3600)}h (${uptimeSeconds}s)`;
    const releaseSha = release?.sha || "n/a";
    const releaseRun = release?.run_number || release?.run_id || "n/a";
    const deployedAt = release?.deployed_at_utc || "n/a";

    return (
        <main className="admin-page">
            <header className="admin-header">
                <h1 className="page-name">Admin Dashboard</h1>
                <p className="text-muted">Operational snapshot for moderation, trust, growth and creator monetization.</p>
                <div className="admin-quick-actions">
                    <Link href="/settings" className="btn btn-white">
                        Open Settings Control Center
                    </Link>
                    <Link href="/rules" className="btn btn-white">
                        Review Rules
                    </Link>
                    <Link href="/explore" className="btn btn-white">
                        Open Explore Feed
                    </Link>
                </div>
            </header>

            <section className="admin-grid">
                <article className={`admin-card admin-card-status ${systemSeverity}`}>
                    <h2>System Status</h2>
                    <span className={`admin-pill ${systemSeverity}`}>{systemLabel}</span>
                    <p>Health status: {status}</p>
                    <p>Uptime: {uptimeLabel}</p>
                    <p>Node: {systemHealth?.nodeVersion || "n/a"}</p>
                    <p>
                        Release SHA: <span className="admin-mono">{releaseSha}</span>
                    </p>
                    <p>Release run: {releaseRun}</p>
                    <p>Deployed UTC: {deployedAt}</p>
                </article>
                <article className="admin-card">
                    <h2>7d Activity</h2>
                    <p>Active users: {activitySummary.activeUsers}</p>
                    <p>Posts created: {activitySummary.postsCreated}</p>
                    <p>Replies created: {activitySummary.repliesCreated}</p>
                </article>
                <article className={`admin-card admin-card-status ${moderationSeverity}`}>
                    <h2>Moderation Queue</h2>
                    <span className={`admin-pill ${moderationSeverity}`}>
                        {moderationSeverity === "critical" ? "Critical queue pressure" : moderationSeverity === "warning" ? "Queue needs attention" : "Queue healthy"}
                    </span>
                    <p>Open reports: {openReports.length}</p>
                    <p>Open authenticity appeals: {openAppeals.length}</p>
                    <p>Appeals overdue: {appealSlaSummary.overdue}</p>
                    <p>Appeals due soon: {appealSlaSummary.dueSoon}</p>
                    <p>Appeals on track: {appealSlaSummary.onTrack}</p>
                </article>
                <article className={`admin-card admin-card-status ${unhealthyKpis > 0 ? "warning" : "healthy"}`}>
                    <h2>KPI Health</h2>
                    <span className={`admin-pill ${unhealthyKpis > 0 ? "warning" : "healthy"}`}>
                        {unhealthyKpis > 0 ? `${unhealthyKpis} KPI(s) below threshold` : "All KPI thresholds healthy"}
                    </span>
                    <div className="admin-health-list">
                        {kpiHealthRows.map((row) => (
                            <div key={row.label} className="admin-health-row">
                                <span>{row.label}</span>
                                <strong className={row.healthy ? "ok" : "danger"}>{row.healthy ? "healthy" : "below"}</strong>
                            </div>
                        ))}
                    </div>
                </article>
                <article className={`admin-card admin-card-status ${creatorSeverity}`}>
                    <h2>Creator Commerce</h2>
                    <span className={`admin-pill ${creatorSeverity}`}>
                        {creatorSeverity === "healthy" ? "Creator ecosystem active" : "Creator adoption low"}
                    </span>
                    <p>Active creators: {creatorCommerce.activeCreators}</p>
                    <p>Published artist items: {creatorCommerce.publishedItems}</p>
                    <p>Support transactions: {creatorCommerce.supportTransactions}</p>
                    <p>Support volume: {(creatorCommerce.supportVolumeCents || 0) / 100} EUR</p>
                </article>
            </section>

            <section className="admin-card">
                <h2>Recent Accounts</h2>
                {users.length === 0 ? (
                    <p className="text-muted">No users available.</p>
                ) : (
                    <div className="admin-user-list">
                        {users.slice(0, 10).map((user: { id: string; username: string; role: string; isSuperAdmin?: boolean }) => (
                            <div key={user.id} className="admin-user-row">
                                <Link href={`/${user.username}`}>@{user.username}</Link>
                                <span className="text-muted">
                                    {user.role}
                                    {user.isSuperAdmin ? " · super admin" : ""}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
