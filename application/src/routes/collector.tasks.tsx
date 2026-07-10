import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Play, Check, XCircle, ListChecks, ArrowUpDown, ScanLine, Image, MessageSquare, RefreshCw, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { FormField } from "@/components/portal/FormField";
import { Table, Th, Td } from "@/components/portal/Table";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { Skeleton } from "@/components/portal/Skeleton";
import { EmptyState } from "@/components/portal/EmptyState";
import { Button } from "@/components/portal/Button";
import { Card } from "@/components/portal/Card";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/api";
import { classNames, formatDate } from "@/utils/helpers";

export const Route = createFileRoute("/collector/tasks")({
  component: TaskList,
});

const STATUSES = ["all", "assigned", "in_progress", "resolved"];
const PAGE_SIZE = 10;

const notePresets = [
  "Overflowing bins cleared, debris swept and area sanitized.",
  "Illegal dumpsite bags loaded, pavement scrubbed clean.",
  "Large cardboard packaging items flattened and loaded.",
  "Litter cluster gathered and placed in standard trash bin."
];

function TaskList() {
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [updating, setUpdating] = useState<string | number | null>(null);

  // Sorting state
  const [sortBy, setSortBy] = useState<"date" | "priority" | "address">("date");

  // Expanded details panel
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  // QR Code Simulator
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedId, setScannedId] = useState<string | number | null>(null);
  const [scanState, setScanState] = useState<"idle" | "scanning" | "done">("idle");

  // Custom presets & notes
  const [customNotes, setCustomNotes] = useState<Record<string | number, string>>({});
  const [uploadedBeforeAfter, setUploadedBeforeAfter] = useState<Record<string | number, string>>({});

  // Reject / Reassign State
  const [rejectOpen, setRejectOpen] = useState<string | number | null>(null);
  const [rejectReason, setRejectReason] = useState("full");

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page + 1));
    p.set("limit", String(PAGE_SIZE));
    if (status !== "all") p.set("status", status);
    if (search.trim()) p.set("search", search.trim());
    return p.toString();
  }, [status, search, page]);

  const { data, loading, error, refetch } = useApi<any>(`/collector/tasks?${qs}`, {}, [qs]);
  const rawItems: any[] = Array.isArray(data) ? data : data?.items ?? [];
  const total: number = data?.total ?? rawItems.length;

  // Apply sorting client-side
  const items = useMemo(() => {
    const sorted = [...rawItems];
    if (sortBy === "priority") {
      const w: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
      sorted.sort((a, b) => (w[b.priority || "medium"] || 0) - (w[a.priority || "medium"] || 0));
    } else if (sortBy === "address") {
      sorted.sort((a, b) => (a.address || "").localeCompare(b.address || ""));
    } else {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return sorted;
  }, [rawItems, sortBy]);

  const update = async (id: string | number, next: string, reason?: string) => {
    setUpdating(id);
    try {
      const payload: any = { status: next };
      if (reason) payload.cancel_reason = reason;
      await apiFetch(`/collector/tasks/${id}`, { method: "PATCH", body: payload });
      await refetch();
    } finally {
      setUpdating(null);
      setScannerOpen(false);
      setScannedId(null);
      setScanState("idle");
      setRejectOpen(null);
    }
  };

  const simulateScanner = (id: string | number) => {
    setScannerOpen(true);
    setScannedId(id);
    setScanState("scanning");
    setTimeout(() => {
      setScanState("done");
    }, 2000);
  };

  const handleNotesChange = (id: string | number, val: string) => {
    setCustomNotes(prev => ({ ...prev, [id]: val }));
  };

  const selectPreset = (id: string | number, preset: string) => {
    setCustomNotes(prev => ({ ...prev, [id]: preset }));
  };

  const triggerUploadMock = (id: string | number) => {
    setUploadedBeforeAfter(prev => ({
      ...prev,
      [id]: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300&h=200&q=80"
    }));
  };

  return (
    <>
      <PageHeader title="Tasks" subtitle="Everything assigned to you." />

      <div className="flex flex-col md:flex-row gap-3 mb-4 justify-between items-stretch md:items-center">
        <div className="flex flex-col md:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <FormField
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search address or category"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => { setStatus(s); setPage(0); }}
                className={classNames(
                  "px-3 py-1.5 rounded-full text-xs font-medium border capitalize",
                  status === s
                    ? "bg-forest-700 text-sand-50 border-forest-700"
                    : "bg-card text-muted-foreground border-border hover:bg-sand-100"
                )}
              >
                {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        {/* 11. Task Sorting Filter Selector */}
        <div className="flex items-center gap-2 mt-2 md:mt-0 bg-card border-2 border-ink-950 p-1 rounded-xl shadow-[2px_2px_0_0_#0a0f0a] shrink-0 self-start md:self-auto">
          <ArrowUpDown className="w-3.5 h-3.5 ml-2 text-muted-foreground" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs bg-transparent border-0 font-semibold uppercase focus:outline-none focus:ring-0 cursor-pointer pr-8"
          >
            <option value="date">Sort: Date</option>
            <option value="priority">Sort: Priority</option>
            <option value="address">Sort: Address</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load tasks" body={error} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="w-5 h-5" />}
          title="No tasks match"
          body="Try clearing filters or check back soon."
        />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <Th className="w-10"></Th>
                <Th>ID</Th>
                <Th>Category</Th>
                <Th>Priority</Th>
                <Th>Address</Th>
                <Th>Assigned</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => {
                const st = (t.status || "").toLowerCase();
                const isExpanded = expandedId === t.id;
                const isScanned = scannedId === t.id && scanState === "done";
                const isRejecting = rejectOpen === t.id;

                return (
                  <>
                    <tr
                      key={t.id}
                      onClick={() => setExpandedId(isExpanded ? null : t.id)}
                      className={classNames(
                        "hover:bg-sand-50 cursor-pointer transition-colors border-b border-border/60",
                        isExpanded ? "bg-sand-100/50" : ""
                      )}
                    >
                      <Td className="text-center font-bold text-muted-foreground select-none">
                        {isExpanded ? "−" : "+"}
                      </Td>
                      <Td className="font-mono text-xs">#{String(t.id).slice(0, 6)}</Td>
                      <Td>{t.category || t.tags?.[0] || "—"}</Td>
                      <Td><StatusBadge status={t.priority || "medium"} /></Td>
                      <Td className="max-w-[260px] truncate">{t.address || t.block || "—"}</Td>
                      <Td className="text-muted-foreground">{formatDate(t.assigned_at || t.created_at)}</Td>
                      <Td><StatusBadge status={t.status} /></Td>
                      <Td>
                        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {st === "assigned" ? (
                            <Button size="sm" loading={updating === t.id} onClick={() => update(t.id, "in_progress")}>
                              <Play className="w-3.5 h-3.5" /> Start
                            </Button>
                          ) : null}
                          {st === "in_progress" ? (
                            <>
                              <Button
                                size="sm"
                                disabled={!isScanned}
                                title={!isScanned ? "Must scan bin barcode first" : "Complete task"}
                                loading={updating === t.id}
                                onClick={() => update(t.id, "resolved")}
                              >
                                <Check className="w-3.5 h-3.5" /> Complete
                              </Button>
                              <Button size="sm" variant="ghost" loading={updating === t.id} onClick={() => setRejectOpen(t.id)}>
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </Td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-sand-50/40">
                        <td colSpan={8} className="px-6 py-4 border-b border-border/60">
                          <div className="grid md:grid-cols-3 gap-6 animate-fade-up">
                            
                            {/* 12. Before & After Photo View */}
                            <div>
                              <h4 className="font-display font-semibold text-xs mb-2 flex items-center gap-1.5">
                                <Image className="w-4 h-4 text-forest-600" /> Photo Comparison
                              </h4>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="relative">
                                  {t.photo_url ? (
                                    <img src={t.photo_url} className="w-full h-24 object-cover rounded-lg border border-border" alt="Before" />
                                  ) : (
                                    <div className="w-full h-24 bg-sand-200 rounded-lg flex items-center justify-center text-[10px] text-muted-foreground">No image</div>
                                  )}
                                  <span className="absolute bottom-1 left-1 bg-red-600 text-white text-[8px] font-mono px-1 rounded">Before</span>
                                </div>
                                <div className="relative cursor-pointer" onClick={() => triggerUploadMock(t.id)}>
                                  {uploadedBeforeAfter[t.id] ? (
                                    <img src={uploadedBeforeAfter[t.id]} className="w-full h-24 object-cover rounded-lg border border-border animate-fade-up" alt="After" />
                                  ) : (
                                    <div className="w-full h-24 bg-card border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-center p-1 hover:bg-sand-100">
                                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                      <span className="text-[9px] text-muted-foreground font-semibold mt-1">Upload Fix</span>
                                    </div>
                                  )}
                                  <span className="absolute bottom-1 left-1 bg-forest-600 text-white text-[8px] font-mono px-1 rounded">After</span>
                                </div>
                              </div>
                            </div>

                            {/* 13. Barcode Container Scanner Simulation */}
                            <div>
                              <h4 className="font-display font-semibold text-xs mb-2 flex items-center gap-1.5">
                                <ScanLine className="w-4 h-4 text-forest-600" /> Container Scanner
                              </h4>
                              {st !== "in_progress" ? (
                                <p className="text-[11px] text-muted-foreground">Start task to activate scanner validation.</p>
                              ) : isScanned ? (
                                <div className="bg-forest-50 border border-forest-300 text-forest-700 p-3 rounded-lg text-xs flex items-center gap-2 animate-fade-up">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <div>
                                    <div className="font-bold">Container Verified</div>
                                    <div className="text-[10px]">Barcode CC-8472-X matched.</div>
                                  </div>
                                </div>
                              ) : scannerOpen ? (
                                <div className="bg-card border-2 border-red-500 rounded-lg p-4 text-center space-y-2 relative overflow-hidden animate-pulse">
                                  <div className="w-full h-1 bg-red-500 absolute top-1/2 left-0 -translate-y-1/2 animate-bounce" />
                                  <div className="text-xs font-bold text-red-500">Scanning container...</div>
                                  <div className="text-[10px] text-muted-foreground">Keep camera pointed at QR label</div>
                                </div>
                              ) : (
                                <Button size="sm" onClick={() => simulateScanner(t.id)} className="w-full bg-forest-500 hover:bg-forest-600 border-forest-600 text-ink-950 flex items-center justify-center gap-1.5">
                                  <ScanLine className="w-4 h-4" /> Verify Container Barcode
                                </Button>
                              )}
                            </div>

                            {/* 14. Quick Notes Template Presets */}
                            <div>
                              <h4 className="font-display font-semibold text-xs mb-2 flex items-center gap-1.5">
                                <MessageSquare className="w-4 h-4 text-forest-600" /> Resolution Notes
                              </h4>
                              <div className="space-y-2">
                                <textarea
                                  value={customNotes[t.id] || ""}
                                  onChange={(e) => handleNotesChange(t.id, e.target.value)}
                                  placeholder="Describe details of the cleanup resolution..."
                                  className="w-full text-xs p-2 border border-border rounded-lg bg-card focus:outline-none"
                                  rows={2}
                                />
                                <div className="flex gap-1.5 flex-wrap">
                                  {notePresets.map((note, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => selectPreset(t.id, note)}
                                      className="text-[9px] bg-sand-100 hover:bg-sand-200 border border-border px-1.5 py-0.5 rounded font-medium"
                                      title={note}
                                    >
                                      Preset {idx + 1}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                          </div>

                          {/* 15. Quick Dispatch Reject/Reassign form */}
                          {isRejecting && (
                            <div className="border border-red-200 rounded-xl p-3 bg-red-50/40 mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-fade-up">
                              <div>
                                <div className="text-xs font-semibold text-red-950">Request Reassignment</div>
                                <div className="text-[10px] text-red-800">Flag this report back to Admin dispatch queue.</div>
                              </div>
                              <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  className="text-xs border border-border bg-card p-1.5 rounded-lg font-medium"
                                >
                                  <option value="full">Truck Filled to Capacity</option>
                                  <option value="access">Access Blocked by Cars</option>
                                  <option value="unsafe">Unsafe / Needs Heavy Gear</option>
                                </select>
                                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white border-red-700" onClick={() => update(t.id, "cancelled", rejectReason)}>Reject Job</Button>
                                <Button size="sm" variant="ghost" onClick={() => setRejectOpen(null)}>Cancel</Button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </Table>
          <div className="flex items-center justify-between mt-4">
            <div className="text-xs text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + items.length} of {total}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={items.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
