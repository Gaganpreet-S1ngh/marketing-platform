"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { MetricCard } from "@/components/ui/MetricCard";
import { api } from "@/lib/api";
import {
  MousePointerClick,
  ShieldCheck,
  Bot,
  Calendar,
  ArrowUpRight,
  Loader2,
  MapPin,
  Smartphone,
  Globe,
  Monitor,
} from "lucide-react";

interface MetadataItem {
  name: string;
  clicks: number;
}

interface PlatformTotals {
  totalClicks: number;
  realClicks: number;
  botClicks: number;
  last7DaysClicks: number;
  topCity?: string;
  topDevice?: string;
  byCreator: Array<{
    _id: string;
    clicks: number;
    name?: string;
    email?: string;
  }>;
  byCity?: MetadataItem[];
  byCountry?: MetadataItem[];
  byDevice?: MetadataItem[];
  byBrowser?: MetadataItem[];
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<PlatformTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const fetchPlatformTotals = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/admin/analytics/platform");
      if (res.data?.data) {
        setStats(res.data.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch platform analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPlatformTotals();
    }
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Authenticating session...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="p-6 md:p-8 flex-1 space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Platform Overview</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Real-time click stream analytics, location metadata & bot filtering
            </p>
          </div>

          {loading ? (
            <div className="p-12 flex items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium">Loading platform analytics...</span>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-400 text-sm">
              {error}
            </div>
          ) : (
            <>
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <MetricCard
                  title="Total Clicks"
                  value={stats?.totalClicks?.toLocaleString() || 0}
                  subtext="All recorded stream events"
                  icon={MousePointerClick}
                  color="blue"
                />
                <MetricCard
                  title="Real User Clicks"
                  value={stats?.realClicks?.toLocaleString() || 0}
                  subtext="Verified human traffic"
                  icon={ShieldCheck}
                  color="emerald"
                />
                <MetricCard
                  title="Most Active City"
                  value={stats?.topCity || "Localhost"}
                  subtext="Highest click volume"
                  icon={MapPin}
                  color="amber"
                />
                <MetricCard
                  title="Primary Device"
                  value={stats?.topDevice || "desktop"}
                  subtext="Top device type"
                  icon={Smartphone}
                  color="indigo"
                />
              </div>

              {/* Location & Device Meta Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* City Click Leaderboard */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-amber-500" />
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Top Cities by Clicks</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">City location breakdown from GeoIP resolution</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    {stats?.byCity && stats.byCity.length > 0 ? (
                      <div className="space-y-3">
                        {stats.byCity.map((city, idx) => (
                          <div
                            key={city.name + idx}
                            className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center justify-center">
                                #{idx + 1}
                              </span>
                              <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">
                                {city.name}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded border border-amber-200/50 dark:border-amber-900/40">
                              {city.clicks.toLocaleString()} clicks
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500 py-6 text-center">
                        No city location data available yet.
                      </p>
                    )}
                  </div>
                </div>

                {/* Device & Browser Distribution */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-indigo-500" />
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">Device & Browser Metadata</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">User Agent client metadata breakdown</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-6">
                    {/* Device Types */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                        Device Type Breakdown
                      </h4>
                      {stats?.byDevice && stats.byDevice.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {stats.byDevice.map((dev) => (
                            <div
                              key={dev.name}
                              className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                            >
                              <span className="text-xs font-semibold capitalize text-slate-700 dark:text-slate-300">
                                {dev.name}
                              </span>
                              <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                {dev.clicks.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-slate-500">No device data.</p>
                      )}
                    </div>

                    {/* Browsers */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                        Popular Browsers
                      </h4>
                      {stats?.byBrowser && stats.byBrowser.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {stats.byBrowser.map((b) => (
                            <div
                              key={b.name}
                              className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                            >
                              <span className="text-xs font-semibold capitalize text-slate-700 dark:text-slate-300">
                                {b.name}
                              </span>
                              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                                {b.clicks.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-slate-500">No browser data.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Creators Leaderboard */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Top 10 Marketers</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Ranked strictly by verified real clicks</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-6 py-3.5">Rank</th>
                        <th className="px-6 py-3.5">Marketer Creator</th>
                        <th className="px-6 py-3.5 text-right">Real Clicks</th>
                        <th className="px-6 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {stats?.byCreator && stats.byCreator.length > 0 ? (
                        stats.byCreator.map((creator, index) => (
                          <tr key={creator._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-400 dark:text-slate-500 text-xs">#{index + 1}</td>
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-bold text-sm text-slate-800 dark:text-slate-100">
                                  {creator.name || creator.email || "Marketer Account"}
                                </p>
                                {creator.email && (
                                  <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{creator.email}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              {creator.clicks.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => router.push(`/creators/${creator._id}`)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                View Rollup
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                            No click activity recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
