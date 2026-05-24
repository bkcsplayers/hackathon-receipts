import { useEffect, useState } from 'react';
import { Plus, UserX } from 'lucide-react';
import { api } from '../lib/api';
import { useViewMode } from '../hooks/useViewMode';
import { formatCurrency } from '../lib/utils';

export default function MembersPage() {
  const { queryParams } = useViewMode();
  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    username: '',
    display_name: '',
    email: '',
    password: '',
    role: 'member',
  });

  async function load() {
    setLoading(true);
    try {
      const [memberData, userList] = await Promise.all([
        api.getMemberDetails(queryParams),
        api.listUsers(),
      ]);
      setMembers(memberData.members || memberData.data || memberData || []);
      setUsers(userList.items || userList.data || userList || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [queryParams]);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await api.createUser(form);
      setShowForm(false);
      setForm({ username: '', display_name: '', email: '', password: '', role: 'member' });
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDisable(userId) {
    if (!confirm('Disable this user?')) return;
    try {
      await api.deleteUser(userId);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-[var(--text-secondary)]">Loading members...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          Manage family members and view spending breakdown
        </p>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="touch-target flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-blue)] px-4 py-2.5 text-sm font-medium text-white sm:w-auto"
        >
          <Plus size={16} /> Add Member
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card grid gap-4 p-6 sm:grid-cols-2">
          <input
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2"
            required
          />
          <input
            placeholder="Display Name"
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2"
            required
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            className="rounded-xl bg-[var(--accent-green)] py-2 font-medium text-white sm:col-span-2"
          >
            Create User
          </button>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {members.map((m) => (
          <div key={m.user_id} className="card p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-purple)]/20 text-lg font-bold text-[var(--accent-purple)]">
                {m.display_name?.[0]}
              </div>
              <div>
                <h3 className="font-semibold">{m.display_name}</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Top: {m.top_category} · {m.percentage_of_family?.toFixed(1)}% of family
                </p>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--accent-gold)] font-bold">{formatCurrency(m.total)}</span>
              <span className="text-[var(--text-secondary)]">{m.count} transactions</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <h3 className="border-b border-[var(--border)] p-4 font-semibold">All Users</h3>

        <div className="space-y-2 p-3 md:hidden">
          {users.map((u) => (
            <div
              key={u.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]/30 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{u.display_name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{u.email}</p>
                </div>
                <span className="capitalize text-xs text-[var(--text-secondary)]">{u.role}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span
                  className={
                    u.is_active !== false
                      ? 'text-sm text-[var(--accent-green)]'
                      : 'text-sm text-[var(--accent-red)]'
                  }
                >
                  {u.is_active !== false ? 'Active' : 'Disabled'}
                </span>
                {u.is_active !== false && u.role !== 'admin' && (
                  <button
                    type="button"
                    onClick={() => handleDisable(u.id)}
                    className="touch-target rounded p-2 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10"
                    title="Disable user"
                  >
                    <UserX size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--text-secondary)]">
              <th className="p-3">User</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[var(--border)]">
                <td className="p-3 font-medium">{u.display_name}</td>
                <td className="p-3 text-[var(--text-secondary)]">{u.email}</td>
                <td className="p-3 capitalize">{u.role}</td>
                <td className="p-3">
                  <span
                    className={
                      u.is_active !== false
                        ? 'text-[var(--accent-green)]'
                        : 'text-[var(--accent-red)]'
                    }
                  >
                    {u.is_active !== false ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="p-3">
                  {u.is_active !== false && u.role !== 'admin' && (
                    <button
                      type="button"
                      onClick={() => handleDisable(u.id)}
                      className="rounded p-1 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10"
                      title="Disable user"
                    >
                      <UserX size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
