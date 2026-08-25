"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { UserPlus, Key, Trash2, Shield, UserCheck, Check, Copy, Loader2 } from "lucide-react";

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "marketer";
  status: "active" | "disabled" | "flagged";
}

export default function UsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [createdUserResult, setCreatedUserResult] = useState<any>(null);

  // Form State
  const [userName, setUserName] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newPasswordResult, setNewPasswordResult] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/user");
      if (res.data?.data) {
        setUsersList(res.data.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch users list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchUsers();
    }
  }, [user]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setSubmitting(true);
      const res = await api.post("/api/user", { user_name: userName });
      if (res.data?.result) {
        setCreatedUserResult(res.data.result);
        setUserName("");
        fetchUsers();
      }
    } catch (err: any) {
      setError(err.message || "Failed to create marketer user.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    setSelectedUserId(userId);
    setNewPasswordResult(null);
    setError(null);
    setResetModalOpen(true);
    try {
      setSubmitting(true);
      const res = await api.patch(`/api/user/${userId}/password`);
      if (res.data?.result?.new_password) {
        setNewPasswordResult(res.data.result.new_password);
      }
    } catch (err: any) {
      setError(err.message || "Failed to reset user password.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await api.delete(`/api/user/${userId}`);
      setUsersList((prev) => prev.filter((u) => u._id !== userId));
    } catch (err: any) {
      alert(err.message || "Failed to delete user.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Authenticating access...
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
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">User Management</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage Marketers & Admin accounts</p>
            </div>
            <button
              onClick={() => {
                setError(null);
                setCreatedUserResult(null);
                setCreateModalOpen(true);
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Create Marketer
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Registered Accounts</h3>
            </div>

            {loading ? (
              <div className="p-12 flex items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                <span className="text-sm">Loading users list...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-3.5">User</th>
                      <th className="px-6 py-3.5">Role</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">User ID</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {usersList.length > 0 ? (
                      usersList.map((u) => (
                        <tr key={u._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-100">{u.name || "N/A"}</p>
                              <p className="text-xs text-slate-400 dark:text-slate-500">{u.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${
                                u.role === "admin"
                                  ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50"
                                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50"
                              }`}
                            >
                              {u.role === "admin" ? <Shield className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {u.status === "flagged" ? (
                              <span className="px-2.5 py-1 text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-900/50">
                                ⚠️ Flagged (Spam)
                              </span>
                            ) : u.status === "disabled" ? (
                              <span className="px-2.5 py-1 text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 rounded-full border border-rose-200 dark:border-rose-900/50">
                                Disabled
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-900/50">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">{u._id}</td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => handleResetPassword(u._id)}
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Reset Password"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u._id)}
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CREATE MARKETER MODAL */}
          <Modal
            isOpen={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            title="Create Marketer User"
          >
            {createdUserResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-800 dark:text-emerald-300 text-sm">
                  <p className="font-bold mb-1">✅ Marketer Account Created!</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    Share these login credentials securely with the marketer.
                  </p>
                </div>

                <div className="space-y-2 bg-slate-900 dark:bg-slate-950 border border-slate-800 text-white p-4 rounded-xl font-mono text-xs">
                  <div>
                    <span className="text-slate-400">Email:</span> {createdUserResult.result?.email}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <div>
                      <span className="text-slate-400">Generated Password:</span>{" "}
                      <span className="font-bold text-amber-400">{createdUserResult.user_password}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(createdUserResult.user_password)}
                      className="p-1 text-slate-400 hover:text-white rounded"
                    >
                      {copiedPass ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-lg"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateUser} className="space-y-4">
                {error && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg text-rose-700 dark:text-rose-400 text-xs">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    User Name / Handle *
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="e.g. john_doe (will generate john_doe@marketing.com)"
                    required
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
                    {submitting ? "Creating..." : "Create Account"}
                  </button>
                </div>
              </form>
            )}
          </Modal>

          {/* RESET PASSWORD MODAL */}
          <Modal
            isOpen={resetModalOpen}
            onClose={() => setResetModalOpen(false)}
            title="Reset User Password"
          >
            {submitting ? (
              <div className="py-8 flex items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                <span className="text-sm">Generating new secure password...</span>
              </div>
            ) : newPasswordResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-900 dark:text-amber-300 text-sm">
                  <p className="font-bold">Password Reset Successful!</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    The user&apos;s password has been updated. Provide them with this new password:
                  </p>
                </div>

                <div className="bg-slate-900 dark:bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between font-mono text-sm font-bold text-amber-400">
                  <span>{newPasswordResult}</span>
                  <button
                    onClick={() => copyToClipboard(newPasswordResult)}
                    className="p-1 text-slate-400 hover:text-white rounded"
                  >
                    {copiedPass ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  onClick={() => setResetModalOpen(false)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-lg"
                >
                  Close
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">Failed to reset password.</p>
            )}
          </Modal>
        </main>
      </div>
    </div>
  );
}
