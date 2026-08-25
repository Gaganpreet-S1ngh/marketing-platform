"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  UserCheck,
  MapPin,
  Smartphone,
} from "lucide-react";

interface CreatorRollupItem {
  linkId: string;
  slug: string;
  destinationUrl: string;
  realClicks: number;
  botClicks: number;
  totalClicks: number;
}

interface MetadataItem {
  name: string;
  clicks: number;
}

interface AudienceMetadata {
  topCity?: string;
  topDevice?: string;
  byCity?: MetadataItem[];
  byDevice?: MetadataItem[];
}

export default function CreatorRollupPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [creatorInfo, setCreatorInfo] = useState<any>(null);
  const [linksRollup, setLinksRollup] = useState<CreatorRollupItem[]>([]);
  const [audienceMeta, setAudienceMeta] = useState<AudienceMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  const fetchCreatorRollup = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/admin/analytics/creators/${id}`);
      if (res.data?.data) {
        setCreatorInfo(res.data.data.creator);
        if (Array.isArray(res.data.data.stats)) {
          setLinksRollup(res.data.data.stats);
        } else if (res.data.data.stats?.links) {
          setLinksRollup(res.data.data.stats.links);
          setAudienceMeta(res.data.data.stats.metadata || null);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch creator rollup analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && id) {
      fetchCreatorRollup();
    }
  }, [user, id]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Verifying authorization...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="p-6 md:p-8 flex-1 space-y-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Marketer Performance Rollup</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">Creator ID: {id}</p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 flex items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
              <span className="text-sm">Loading creator analytics...</span>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-400 text-sm">
              {error}
            </div>
          ) : (
            <>
              {/* Creator Info & Metadata Badges */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {creatorInfo && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-xl text-blue-600 dark:text-blue-400">
                      <UserCheck className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{creatorInfo.name || "Marketer Account"}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{creatorInfo.email}</p>
                    </div>
                  </div>
                )}

                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 rounded-xl text-amber-600 dark:text-amber-400">
                    <MapPin className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Top Audience City</p>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">{audienceMeta?.topCity || "N/A"}</h3>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-indigo-600 dark:text-indigo-400">
                    <Smartphone className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Primary Device</p>
                    <h3 className="text-xl font-bold capitalize text-slate-800 dark:text-slate-100 mt-1">{audienceMeta?.topDevice || "N/A"}</h3>
                  </div>
                </div>
              </div>

              {/* Rollup Table */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Campaign Link Performance</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Ranked by real user clicks (bot traffic excluded from ranking)</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-6 py-3.5">Slug</th>
                        <th className="px-6 py-3.5">Destination URL</th>
                        <th className="px-6 py-3.5 text-right">Real Clicks</th>
                        <th className="px-6 py-3.5 text-right">Bot Clicks</th>
                        <th className="px-6 py-3.5 text-right">Total Clicks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {linksRollup.length > 0 ? (
                        linksRollup.map((item) => (
                          <tr key={item.linkId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                              /{item.slug}
                            </td>
                            <td className="px-6 py-4 max-w-xs truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                              <a
                                href={item.destinationUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline hover:text-slate-800 dark:hover:text-slate-200 inline-flex items-center gap-1"
                              >
                                <span className="truncate">{item.destinationUrl}</span>
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              {item.realClicks.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-rose-500 dark:text-rose-400">
                              {item.botClicks.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-slate-800 dark:text-slate-100">
                              {item.totalClicks.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                            No campaign links or clicks found for this marketer.
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
