"use client";

import { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Organisation {
  id: number;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
}

const emptyOrgForm = { name: "", slug: "", email: "", phone: "", address: "" };
const emptyUserForm = { firstname: "", lastname: "", username: "", email: "", password: "" };

export default function AdminOrganisationsPage() {
  const { data: orgs, isLoading, mutate } = useSWR<Organisation[]>("/api/admin/organisations", fetcher);

  const [orgForm, setOrgForm]       = useState(emptyOrgForm);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [orgError, setOrgError]     = useState<string | null>(null);
  const [showOrgForm, setShowOrgForm] = useState(false);

  const [activeAdminOrg, setActiveAdminOrg] = useState<number | null>(null);
  const [userForm, setUserForm]       = useState(emptyUserForm);
  const [creatingUser, setCreatingUser] = useState(false);
  const [userError, setUserError]     = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    setOrgError(null);
    setCreatingOrg(true);
    try {
      const res = await fetch("/api/admin/organisations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orgForm),
      });
      const data = await res.json();
      if (!res.ok) { setOrgError(data.error ?? "Failed to create organisation"); return; }
      setOrgForm(emptyOrgForm);
      setShowOrgForm(false);
      mutate();
      showSuccess(`Organisation "${data.name}" created.`);
    } finally {
      setCreatingOrg(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!activeAdminOrg) return;
    setUserError(null);
    setCreatingUser(true);
    try {
      const res = await fetch(`/api/admin/organisations/${activeAdminOrg}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      });
      const data = await res.json();
      if (!res.ok) { setUserError(data.error ?? "Failed to create user"); return; }
      setActiveAdminOrg(null);
      setUserForm(emptyUserForm);
      const orgName = orgs?.find((o) => o.id === activeAdminOrg)?.name ?? "the organisation";
      showSuccess(`User ${data.email} created for ${orgName} with Super Admin role.`);
    } finally {
      setCreatingUser(false);
    }
  }

  function showSuccess(msg: string) {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 5000);
  }

  function slugify(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function openAdminForm(orgId: number) {
    setActiveAdminOrg(activeAdminOrg === orgId ? null : orgId);
    setUserForm(emptyUserForm);
    setUserError(null);
  }

  if (isLoading) return <div className="p-8 text-gray-500">Loading...</div>;

  if (!Array.isArray(orgs)) {
    return (
      <div className="p-8">
        <p className="text-red-500 font-medium">Access denied. Platform admin only.</p>
      </div>
    );
  }

  return (
    <div className="p-6 w-full">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organisations</h1>
          <p className="text-sm text-gray-500 mt-1">Manage hospitals on this platform</p>
        </div>
        <button
          onClick={() => { setShowOrgForm(!showOrgForm); setOrgError(null); }}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          {showOrgForm ? "Cancel" : "New Organisation"}
        </button>
      </div>

      {/* ── Success banner ───────────────────────────────────────────────────── */}
      {successBanner && (
        <div className="mb-4 flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          {successBanner}
        </div>
      )}

      {/* ── Create Org Form ─────────────────────────────────────────────────── */}
      {showOrgForm && (
        <form onSubmit={handleCreateOrg} className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Create Organisation</h2>
          {orgError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{orgError}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={orgForm.name}
                onChange={(e) => { const name = e.target.value; setOrgForm((f) => ({ ...f, name, slug: slugify(name) })); }}
                placeholder="Havannah Hospital"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                value={orgForm.slug}
                onChange={(e) => setOrgForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="havannah-hospital"
                pattern="[a-z0-9-]+"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers, hyphens only</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={orgForm.email}
                onChange={(e) => setOrgForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="admin@hospital.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={orgForm.phone}
                onChange={(e) => setOrgForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+234..."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={orgForm.address}
              onChange={(e) => setOrgForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="123 Hospital Road, Lagos"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={creatingOrg} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {creatingOrg ? "Creating..." : "Create Organisation"}
            </button>
          </div>
        </form>
      )}

      {/* ── Organisations Table ──────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600 w-12">ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Slug</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Phone</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 w-28">Created</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 w-28">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orgs.length > 0 ? orgs.map((org) => (
              <tr key={org.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 font-mono">{org.id}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{org.name}</td>
                <td className="px-4 py-3 font-mono text-gray-500">{org.slug}</td>
                <td className="px-4 py-3 text-gray-600">{org.email ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{org.phone ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(org.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => openAdminForm(org.id)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg border ${
                      activeAdminOrg === org.id
                        ? "bg-gray-100 text-gray-600 border-gray-300"
                        : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                    }`}
                  >
                    {activeAdminOrg === org.id ? "Cancel" : "Add User"}
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">No organisations yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Create Admin User Form ───────────────────────────────────────────── */}
      {activeAdminOrg !== null && (
        <form onSubmit={handleCreateUser} className="bg-white border border-green-200 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-800">
              Add User to{" "}
              <span className="text-green-700">{orgs.find((o) => o.id === activeAdminOrg)?.name}</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              This user will be created with the <strong>Super Admin</strong> role — full access to all modules in their hospital.
            </p>
          </div>

          {userError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{userError}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={userForm.firstname}
                onChange={(e) => setUserForm((f) => ({ ...f, firstname: e.target.value }))}
                placeholder="John"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={userForm.lastname}
                onChange={(e) => setUserForm((f) => ({ ...f, lastname: e.target.value }))}
                placeholder="Doe"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={userForm.email}
                onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="admin@havannah.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={userForm.username}
                onChange={(e) => setUserForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="johndoe"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input
                type="password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={userForm.password}
                onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Min. 8 characters"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { setActiveAdminOrg(null); setUserError(null); }}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingUser}
              className="px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {creatingUser && (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              )}
              {creatingUser ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
