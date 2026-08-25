"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";
import {
  Link2,
  Plus,
  Edit2,
  BarChart3,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  MapPin,
  Smartphone,
  Trash2,
} from "lucide-react";

interface LinkItem {
  _id: string;
  slug: string;
  destinationUrl: string;
  creatorId: string;
  isActive: boolean;
  expiresAt?: string;
  createdAt?: string;
  short_url?: string;
}

interface MarketerItem {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export default function LinksPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);

  // Form States
  const [destinationUrl, setDestinationUrl] = useState("");
  const [creatorId, setCreatorId] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);

  // Marketers Dropdown List
  const [marketers, setMarketers] = useState<MarketerItem[]>([]);

  // Stats Modal Data
  const [linkDetail, setLinkDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Links List
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  const fetchMarketers = async () => {
    try {
      const res = await api.get("/api/user");
      if (res.data?.data) {
        const filtered = res.data.data.filter(
          (u: any) => u.role === "marketer" && u.status !== "disabled"
        );
        setMarketers(filtered);
        if (filtered.length > 0 && !creatorId) {
          setCreatorId(filtered[0]._id);
        }
      }
    } catch {
      // fallback
    }
  };

  const fetchLinks = async () => {
    try {
      setLoadingLinks(true);
      const res = await api.get("/api/admin/links");
      if (res.data?.data) {
        setLinks(res.data.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch links.");
    } finally {
      setLoadingLinks(false);
    }
  };

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchMarketers();
      fetchLinks();
    }
  }, [user]);

  const handleCopyUrl = (slug: string, url?: string) => {
    const fullUrl = url || `${window.location.origin}/r/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const openCreateModal = () => {
    setError(null);
    setDestinationUrl("");
    setCustomSlug("");
    setExpiresAt("");
    if (marketers.length > 0) setCreatorId(marketers[0]._id);
    setCreateModalOpen(true);
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (expiresAt && new Date(expiresAt) <= new Date()) {
      setError("Expiration date cannot be in the past.");
      return;
    }
    try {
      setSubmitting(true);
      const payload: any = {
        destinationUrl,
        creatorId,
      };
      if (customSlug.trim()) payload.slug = customSlug.trim();
      if (expiresAt) payload.expiresAt = expiresAt;

      const res = await api.post("/api/admin/links", payload);
      if (res.data?.data) {
        setLinks((prev) => [res.data.data, ...prev]);
        setCreateModalOpen(false);
        setDestinationUrl("");
        if (marketers.length > 0) setCreatorId(marketers[0]._id);
        setCustomSlug("");
        setExpiresAt("");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create short link.");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (link: LinkItem) => {
    setError(null);
    setSelectedLinkId(link._id);
    setDestinationUrl(link.destinationUrl);
    setCreatorId(link.creatorId);
    setIsActive(link.isActive);
    setExpiresAt(link.expiresAt ? link.expiresAt.substring(0, 16) : "");
    setEditModalOpen(true);
  };

  const handleUpdateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLinkId) return;
    setError(null);
    if (expiresAt && new Date(expiresAt) <= new Date()) {
      setError("Expiration date cannot be in the past.");
      return;
    }
    try {
      setSubmitting(true);
      const payload: any = {
        destinationUrl,
        creatorId,
        isActive,
        expiresAt: expiresAt ? expiresAt : null,
      };

      const res = await api.patch(`/api/admin/links/${selectedLinkId}`, payload);
      if (res.data?.data) {
        setLinks((prev) =>
          prev.map((item) => (item._id === selectedLinkId ? res.data.data : item))
        );
        setEditModalOpen(false);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update link.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!window.confirm("Are you sure you want to delete this short link?")) return;
    try {
      await api.delete(`/api/admin/links/${linkId}`);
      setLinks((prev) => prev.filter((item) => item._id !== linkId));
    } catch (err: any) {
      alert(err.message || "Failed to delete link.");
    }
  };

  const openStatsModal = async (linkId: string) => {
    setSelectedLinkId(linkId);
    setStatsModalOpen(true);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/api/admin/analytics/links/${linkId}`);
      if (res.data?.data) {
        setLinkDetail(res.data.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch link stats.");
    } finally {
      setLoadingDetail(false);
    }
  };

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Short Link Manager</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create, update and track short URL campaigns</p>
            </div>
            <button
              onClick={openCreateModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Short Link
            </button>
          </div>

          {/* Links Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Active Campaigns & Links ({links.length})</h3>
            </div>

            {loadingLinks ? (
              <div className="p-12 flex items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                <span className="text-sm">Loading campaign links...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-3.5">Short Link</th>
                      <th className="px-6 py-3.5">Destination URL</th>
                      <th className="px-6 py-3.5">Marketer Creator</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {links.length > 0 ? (
                      links.map((link) => {
                        const creatorObj = marketers.find((m) => m._id === link.creatorId);
                        return (
                          <tr key={link._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-1 rounded border border-blue-100 dark:border-blue-900/50">
                                  /{link.slug}
                                </span>
                                <button
                                  onClick={() => handleCopyUrl(link.slug, link.short_url)}
                                  className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded"
                                  title="Copy URL"
                                >
                                  {copiedSlug === link.slug ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 max-w-xs truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                              <a
                                href={link.destinationUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline hover:text-slate-800 dark:hover:text-slate-200 inline-flex items-center gap-1"
                              >
                                <span className="truncate">{link.destinationUrl}</span>
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            </td>
                            <td className="px-6 py-4">
                              {creatorObj ? (
                                <div>
                                  <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">{creatorObj.name || creatorObj.email}</p>
                                  <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{creatorObj.email}</p>
                                </div>
                              ) : (
                                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{link.creatorId}</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {link.isActive ? (
                                link.expiresAt && new Date(link.expiresAt) <= new Date() ? (
                                  <span className="px-2.5 py-1 text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-900/50">
                                    Expired
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-900/50">
                                    Active
                                  </span>
                                )
                              ) : (
                                <span className="px-2.5 py-1 text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 rounded-full border border-rose-200 dark:border-rose-900/50">
                                  Disabled
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              <button
                                onClick={() => openStatsModal(link._id)}
                                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                title="Analytics"
                              >
                                <BarChart3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openEditModal(link)}
                                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteLink(link._id)}
                                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                title="Delete Link"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                          <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm font-medium">No links created yet.</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            Click &quot;Create Short Link&quot; above to launch your first short URL.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CREATE LINK MODAL */}
          <Modal
            isOpen={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            title="Create Short Link"
          >
            {error && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg text-rose-700 dark:text-rose-400 text-xs">
                {error}
              </div>
            )}
            <form onSubmit={handleCreateLink} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Destination URL *
                </label>
                <input
                  type="url"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  placeholder="https://example.com/landing-page"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Assign Marketer *
                </label>
                {marketers.length > 0 ? (
                  <select
                    value={creatorId}
                    onChange={(e) => setCreatorId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Select Marketer --</option>
                    {marketers.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name || m.email} ({m.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={creatorId}
                    onChange={(e) => setCreatorId(e.target.value)}
                    placeholder="Enter Marketer ObjectId"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Custom Slug (Optional)
                </label>
                <input
                  type="text"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                  placeholder="e.g. summer-sale (leave blank for random)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-sm font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Expiration Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create Link"}
                </button>
              </div>
            </form>
          </Modal>

          {/* EDIT LINK MODAL */}
          <Modal
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            title="Edit Short Link"
          >
            {error && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg text-rose-700 dark:text-rose-400 text-xs">
                {error}
              </div>
            )}
            <form onSubmit={handleUpdateLink} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Destination URL
                </label>
                <input
                  type="url"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Assign Marketer
                </label>
                {marketers.length > 0 ? (
                  <select
                    value={creatorId}
                    onChange={(e) => setCreatorId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Select Marketer --</option>
                    {marketers.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name || m.email} ({m.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={creatorId}
                    onChange={(e) => setCreatorId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                )}
              </div>

              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700"
                />
                <label htmlFor="isActive" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Link Active (uncheck to disable link)
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Expiration Date
                </label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </Modal>

          {/* STATS ANALYTICS MODAL WITH LOCATION & DEVICE BREAKDOWN */}
          <Modal
            isOpen={statsModalOpen}
            onClose={() => setStatsModalOpen(false)}
            title="Link Performance Analytics"
          >
            {loadingDetail ? (
              <div className="py-8 flex items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                <span className="text-sm">Fetching analytics...</span>
              </div>
            ) : linkDetail ? (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase">Total</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{linkDetail.stats?.summary?.totalClicks || 0}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-lg">
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Real Users</p>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{linkDetail.stats?.summary?.realClicks || 0}</p>
                  </div>
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 rounded-lg">
                    <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">Bots</p>
                    <p className="text-lg font-bold text-rose-700 dark:text-rose-300">{linkDetail.stats?.summary?.botClicks || 0}</p>
                  </div>
                </div>

                {/* Location & Device Quick Badges */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 rounded-lg flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">Top Active City</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{linkDetail.stats?.summary?.topCity || "N/A"}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-lg flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-400">Top Device Type</p>
                      <p className="text-sm font-bold capitalize text-slate-800 dark:text-slate-100">{linkDetail.stats?.summary?.topDevice || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Top Cities */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    City Click Breakdown
                  </h4>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 max-h-36 overflow-y-auto space-y-1.5">
                    {linkDetail.stats?.summary?.byCity?.length > 0 ? (
                      linkDetail.stats.summary.byCity.map((c: any) => (
                        <div key={c.name} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50 dark:border-slate-700/50 last:border-0">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{c.name}</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">{c.clicks} clicks</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">No city records yet.</p>
                    )}
                  </div>
                </div>

                {/* Devices & Browsers */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Devices
                    </h4>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 max-h-32 overflow-y-auto space-y-1">
                      {linkDetail.stats?.summary?.byDevice?.length > 0 ? (
                        linkDetail.stats.summary.byDevice.map((d: any) => (
                          <div key={d.name} className="flex items-center justify-between text-xs py-1">
                            <span className="capitalize text-slate-600 dark:text-slate-300">{d.name}</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{d.clicks}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-slate-500">No device data.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Browsers
                    </h4>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 max-h-32 overflow-y-auto space-y-1">
                      {linkDetail.stats?.summary?.byBrowser?.length > 0 ? (
                        linkDetail.stats.summary.byBrowser.map((b: any) => (
                          <div key={b.name} className="flex items-center justify-between text-xs py-1">
                            <span className="capitalize text-slate-600 dark:text-slate-300">{b.name}</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">{b.clicks}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-slate-500">No browser data.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Daily Trend */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Daily Trend (Real Clicks)
                  </h4>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 max-h-36 overflow-y-auto space-y-1">
                    {linkDetail.stats?.clicksByDay?.length > 0 ? (
                      linkDetail.stats.clicksByDay.map((day: any) => (
                        <div key={day._id} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50 dark:border-slate-700/50 last:border-0">
                          <span className="font-mono text-slate-600 dark:text-slate-400">{day._id}</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">{day.count} clicks</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">No daily click records yet.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No stats available.</p>
            )}
          </Modal>
        </main>
      </div>
    </div>
  );
}
