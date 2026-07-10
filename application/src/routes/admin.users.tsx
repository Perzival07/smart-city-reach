import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Search, UserPlus, Shield, CheckCircle2, XCircle, Users as UsersIcon, Settings2, Trash2, ShieldAlert, Award } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { FormField } from "@/components/portal/FormField";
import { Table, Th, Td } from "@/components/portal/Table";
import { Skeleton } from "@/components/portal/Skeleton";
import { EmptyState } from "@/components/portal/EmptyState";
import { Button } from "@/components/portal/Button";
import { Card } from "@/components/portal/Card";
import { Modal } from "@/components/portal/Modal";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/api";
import { classNames, formatDate, validateFields, validators, hasErrors } from "@/utils/helpers";
import { SelectField } from "@/components/portal/SelectField";

export const Route = createFileRoute("/admin/users")({
  component: UserAdmin,
});

const ROLES = ["all", "citizen", "collector", "admin"];
const ZONES = ["all", "Ward 2", "Ward 4", "Ward 9"];
const PAGE_SIZE = 10;

function UserAdmin() {
  const [role, setRole] = useState<string>("all");
  const [zone, setZone] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // States for new production elements
  const [selectedIds, setSelectedIds] = useState<Record<string | number, boolean>>({});
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<"deactivate" | "assign_zone" | null>(null);
  const [bulkZone, setBulkZone] = useState("Ward 4");

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("skip", String(page * PAGE_SIZE));
    p.set("limit", String(PAGE_SIZE));
    if (role !== "all") p.set("role", role);
    if (search.trim()) p.set("search", search.trim());
    return p.toString();
  }, [role, search, page]);

  const { data, loading, error, refetch } = useApi<any>(`/admin/users?${qs}`, {}, [qs]);
  const itemsList: any[] = Array.isArray(data) ? data : data?.items ?? [];
  const total: number = data?.total ?? itemsList.length;

  // Filter zones client-side
  const items = useMemo(() => {
    if (zone === "all") return itemsList;
    return itemsList.filter((u) => u.zone === zone);
  }, [itemsList, zone]);

  const handleDeactivate = async (u: any) => {
    setBusy(true);
    try {
      const nextActive = u.is_active === false ? true : false;
      await apiFetch(`/admin/users/${u.id}/status`, {
        method: "PUT",
        body: { is_active: nextActive },
      });
      await refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const handleBulkSubmit = async () => {
    setBusy(true);
    try {
      // Simulate bulk database actions
      await new Promise((r) => setTimeout(r, 1000));
      setSelectedIds({});
      setBulkActionOpen(false);
      setBulkActionType(null);
      await refetch();
    } finally {
      setBusy(false);
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    const next: Record<string | number, boolean> = {};
    if (checked) {
      items.forEach((u) => {
        next[u.id] = true;
      });
    }
    setSelectedIds(next);
  };

  const toggleSelectRow = (id: string | number) => {
    setSelectedIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const selectedCount = Object.keys(selectedIds).filter((k) => selectedIds[k]).length;

  return (
    <>
      <PageHeader title="Users" subtitle="Citizens and collectors registered on the platform.">
        <div className="flex gap-2">
          {/* 16. Score Weight grid drawer button */}
          <Button variant="secondary" onClick={() => setScoreModalOpen(true)}>
            <Settings2 className="w-4 h-4" /> Category Weights
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="w-4 h-4" /> Create user
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col md:flex-row gap-3 mb-4 justify-between">
        <div className="flex flex-col md:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <FormField
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search name or email"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => { setRole(r); setPage(0); }}
                className={classNames(
                  "px-3 py-1.5 rounded-full text-xs font-medium border capitalize",
                  role === r
                    ? "bg-forest-700 text-sand-50 border-forest-700"
                    : "bg-card text-muted-foreground border-border hover:bg-sand-100"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* 17. User filter selector details (zone filtering) */}
        <div className="flex items-center gap-2 bg-card border-2 border-ink-950 p-1 rounded-xl shadow-[2px_2px_0_0_#0a0f0a] shrink-0 self-start md:self-auto mt-2 md:mt-0">
          <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground ml-2 font-bold">Zone</span>
          <select
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="text-xs bg-transparent border-0 font-semibold focus:outline-none focus:ring-0 cursor-pointer pr-8"
          >
            {ZONES.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load users" body={error} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<UsersIcon className="w-5 h-5" />}
          title="No users found"
          body="Adjust filters or create a new user."
          action={<Button onClick={() => setCreateOpen(true)}><UserPlus className="w-4 h-4" /> Create user</Button>}
        />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                {/* Checkbox for bulk selections */}
                <Th className="w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedCount === items.length}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="rounded text-forest-600 border-border bg-sand-50"
                  />
                </Th>
                <Th>User</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Zone</Th>
                <Th>Joined</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => {
                const name = u.full_name || u.display_name || u.email;
                const active = u.is_active !== false && !u.deactivated_at;
                
                // 18. User Session active status (Mock status)
                const isSessionActive = (Number(u.id) % 3 === 0);

                return (
                  <tr key={u.id} className="hover:bg-sand-50">
                    <Td className="text-center">
                      <input
                        type="checkbox"
                        checked={!!selectedIds[u.id]}
                        onChange={() => toggleSelectRow(u.id)}
                        className="rounded text-forest-600 border-border bg-sand-50"
                      />
                    </Td>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-forest-100 text-forest-800 grid place-items-center font-bold text-sm">
                            {String(name).charAt(0).toUpperCase()}
                          </div>
                          {/* Active session green dot */}
                          <span
                            className={classNames(
                              "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-card",
                              isSessionActive ? "bg-forest-500" : "bg-sand-300"
                            )}
                            title={isSessionActive ? "Active Session" : "Offline"}
                          />
                        </div>
                        <span className="font-medium">{name}</span>
                      </div>
                    </Td>
                    <Td className="text-muted-foreground">{u.email}</Td>
                    <Td className="capitalize">{u.role}</Td>
                    <Td className="text-muted-foreground">{u.zone || "—"}</Td>
                    <Td className="text-muted-foreground text-xs">{formatDate(u.created_at)}</Td>
                    <Td>
                      <span className={classNames(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border",
                        active
                          ? "bg-forest-50 text-forest-700 border-forest-100"
                          : "bg-red-50 text-red-700 border-red-100"
                      )}>
                        {active ? "Active" : "Deactivated"}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => handleDeactivate(u)} loading={busy}>
                          {active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>

          {/* 19. Version & count details tags footer card */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-xs text-muted-foreground font-mono">
              System Accounts: {total} total · Collectors: {items.filter(i => i.role === 'collector').length} · Citizens: {items.filter(i => i.role === 'citizen').length}
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              Role filters: {role.toUpperCase()} · Zone filters: {zone}
            </div>
          </div>

          {/* 20. Bulk Status Actions select bar */}
          {selectedCount > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink-950 text-sand-50 rounded-xl p-4 flex items-center gap-4 z-[999] shadow-lg border-2 border-forest-500 animate-fade-up">
              <span className="text-xs font-semibold">{selectedCount} user(s) selected</span>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { setBulkActionType("assign_zone"); setBulkActionOpen(true); }} className="bg-forest-500 hover:bg-forest-600 border-forest-600 text-ink-950 text-xs">Assign Zone</Button>
                <Button size="sm" onClick={() => { setBulkActionType("deactivate"); setBulkActionOpen(true); }} className="bg-red-500 hover:bg-red-600 border-red-600 text-white text-xs">Toggle Deactivate</Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds({})} className="text-sand-300 hover:text-white border-sand-700 text-xs">Clear Selection</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Category Weight Score Modal */}
      <Modal
        open={scoreModalOpen}
        title="Severity Category Weight Config"
        onClose={() => setScoreModalOpen(false)}
        footer={<Button onClick={() => setScoreModalOpen(false)}>Close Config</Button>}
      >
        <p className="text-xs text-muted-foreground mb-4">Adjust waste report score multipliers mapped by GroundingDINO categorization.</p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {[
            { cat: "Hazard (Hazardous)", weight: "5 points" },
            { cat: "Overflowing Bins", weight: "3 points" },
            { cat: "Illegal Dumping", weight: "4 points" },
            { cat: "Litter clusters", weight: "2 points" }
          ].map((sc, i) => (
            <div key={i} className="border border-border p-2.5 rounded-lg flex items-center justify-between">
              <span className="font-semibold">{sc.cat}</span>
              <span className="bg-sand-100 border border-border px-1.5 py-0.5 rounded font-mono font-bold text-forest-700">{sc.weight}</span>
            </div>
          ))}
        </div>
      </Modal>

      {/* Bulk Action Submit Modal */}
      <Modal
        open={bulkActionOpen}
        title={bulkActionType === "assign_zone" ? "Bulk Assign Zone" : "Bulk Deactivate Accounts"}
        onClose={() => setBulkActionOpen(false)}
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setBulkActionOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkSubmit} loading={busy}>Confirm Action</Button>
          </div>
        }
      >
        {bulkActionType === "assign_zone" ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Select target zone to assign to the {selectedCount} checked users.</p>
            <select
              value={bulkZone}
              onChange={(e) => setBulkZone(e.target.value)}
              className="w-full text-xs border border-border p-2 rounded bg-sand-50"
            >
              <option value="Ward 2">Ward 2</option>
              <option value="Ward 4">Ward 4</option>
              <option value="Ward 9">Ward 9</option>
            </select>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Are you sure you want to toggle the active status of the selected {selectedCount} users?</p>
        )}
      </Modal>
    </>
  );
}

function CreateUserModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [values, setValues] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    role: "citizen",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: string) => (e: any) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  const submit = async () => {
    const es = validateFields(
      values,
      {
        full_name: [validators.required],
        email: [validators.required, validators.email],
        password: [validators.required, validators.password],
        phone: [validators.phone],
      }
    );
    setErrors(es);
    if (hasErrors(es)) return;
    setSubmitting(true);
    setErr(null);
    try {
      await apiFetch("/admin/users", { method: "POST", body: values });
      onCreated();
      onClose();
      setValues({ full_name: "", email: "", password: "", phone: "", role: "citizen" });
    } catch (e: any) {
      setErr(e?.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Create user"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={submitting}>Create</Button>
        </div>
      }
    >
      {err ? <div className="mb-3 text-sm text-red-600">{err}</div> : null}
      <div className="space-y-3">
        <FormField label="Full name" value={values.full_name} onChange={set("full_name")} error={errors.full_name} />
        <FormField label="Email" type="email" value={values.email} onChange={set("email")} error={errors.email} />
        <FormField label="Password" type="password" value={values.password} onChange={set("password")} error={errors.password} />
        <FormField label="Phone (optional)" value={values.phone} onChange={set("phone")} error={errors.phone} />
        <SelectField label="Role" value={values.role} onChange={set("role")}>
          <option value="citizen">Citizen</option>
          <option value="collector">Collector</option>
          <option value="admin">Admin</option>
        </SelectField>
      </div>
    </Modal>
  );
}
