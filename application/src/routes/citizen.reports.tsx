import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, FileText, Share2, ThumbsUp, Star, Calendar, Clock, MapPin, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { FormField } from "@/components/portal/FormField";
import { Table, Th, Td } from "@/components/portal/Table";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { Skeleton } from "@/components/portal/Skeleton";
import { EmptyState } from "@/components/portal/EmptyState";
import { Button } from "@/components/portal/Button";
import { Card } from "@/components/portal/Card";
import { useApi } from "@/hooks/useApi";
import { classNames, formatDate } from "@/utils/helpers";

export const Route = createFileRoute("/citizen/reports")({
  component: MyReports,
});

const STATUSES = ["all", "pending", "assigned", "in_progress", "resolved", "cancelled"];
const PAGE_SIZE = 10;

function MyReports() {
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  // States for new interactive details panel
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [upvotes, setUpvotes] = useState<Record<string | number, number>>({});
  const [ratings, setRatings] = useState<Record<string | number, { stars: number; comment: string }>>({});
  const [ratingStars, setRatingStars] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState<string>("");
  const [shareCopied, setShareCopied] = useState<string | number | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("skip", String(page * PAGE_SIZE));
    p.set("limit", String(PAGE_SIZE));
    if (status !== "all") p.set("status", status);
    if (search.trim()) p.set("search", search.trim());
    return p.toString();
  }, [status, search, page]);

  const { data, loading, error } = useApi<any>(`/reports/?${qs}`, {}, [qs]);
  const items: any[] = Array.isArray(data) ? data : data?.items ?? [];
  const total: number = data?.total ?? items.length;

  const handleUpvote = (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    setUpvotes(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + 1
    }));
  };

  const handleShare = (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/reports/${id}`);
    setShareCopied(id);
    setTimeout(() => setShareCopied(null), 2000);
  };

  const handleRateReport = (id: string | number, e: React.FormEvent) => {
    e.preventDefault();
    setRatings(prev => ({
      ...prev,
      [id]: { stars: ratingStars, comment: ratingComment }
    }));
    setRatingStars(0);
    setRatingComment("");
  };

  const toggleRow = (id: string | number) => {
    setExpandedId(expandedId === id ? null : id);
    setRatingStars(0);
    setRatingComment("");
  };

  return (
    <>
      <PageHeader title="My reports" subtitle="Track everything you've reported." />

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <FormField
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search address or description"
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

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load reports" body={error} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-5 h-5" />}
          title="No reports match"
          body="Try adjusting filters, or file a new one."
          action={<Link to="/citizen/new"><Button>New report</Button></Link>}
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
                <Th>Date</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const isExpanded = expandedId === r.id;
                const upvoteCount = upvotes[r.id] || Math.floor((Number(r.id) * 3) % 15);
                const hasRated = ratings[r.id];

                return (
                  <>
                    <tr
                      key={r.id}
                      onClick={() => toggleRow(r.id)}
                      className={classNames(
                        "hover:bg-sand-50 cursor-pointer transition-colors border-b border-border/60",
                        isExpanded ? "bg-sand-100/50" : ""
                      )}
                    >
                      <Td className="text-center font-bold text-muted-foreground select-none">
                        {isExpanded ? "−" : "+"}
                      </Td>
                      <Td className="font-mono text-xs">#{String(r.id).slice(0, 6)}</Td>
                      <Td>{r.category || r.tags?.[0] || "—"}</Td>
                      <Td><StatusBadge status={r.priority || "medium"} /></Td>
                      <Td className="max-w-[260px] truncate">{r.address || r.block || "—"}</Td>
                      <Td className="text-muted-foreground">{formatDate(r.created_at)}</Td>
                      <Td><StatusBadge status={r.status} /></Td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-sand-50/40">
                        <td colSpan={7} className="px-6 py-4 border-b border-border/60">
                          <div className="grid md:grid-cols-3 gap-6 animate-fade-up">
                            
                            {/* Feature 11: Interactive Report Progress Timeline */}
                            <div className="md:col-span-2 space-y-4">
                              <h4 className="font-display font-semibold text-sm flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-forest-600" /> Tracking Progress
                              </h4>
                              
                              <div className="relative border-l-2 border-forest-200 ml-3.5 pl-6 space-y-4 text-xs">
                                <div className="relative">
                                  <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-forest-500 text-white flex items-center justify-center font-bold">✓</span>
                                  <div className="font-medium text-ink-950">Report Submitted</div>
                                  <div className="text-muted-foreground text-[10px]">{formatDate(r.created_at)}</div>
                                </div>
                                <div className="relative">
                                  <span className={classNames(
                                    "absolute -left-[31px] top-0 w-4 h-4 rounded-full text-white flex items-center justify-center font-bold text-[9px]",
                                    r.ml_status !== "pending" ? "bg-forest-500" : "bg-sand-300"
                                  )}>{r.ml_status !== "pending" ? "✓" : "2"}</span>
                                  <div className="font-medium text-ink-950">AI Detection Scanning</div>
                                  <div className="text-muted-foreground text-[10px]">
                                    {r.ml_status !== "pending" ? `Verified with ${r.ml_status.replace(/_/g, " ")} status` : "In queue..."}
                                  </div>
                                </div>
                                <div className="relative">
                                  <span className={classNames(
                                    "absolute -left-[31px] top-0 w-4 h-4 rounded-full text-white flex items-center justify-center font-bold text-[9px]",
                                    ["in_progress", "resolved"].includes((r.status || "").toLowerCase()) ? "bg-forest-500" : "bg-sand-300"
                                  )}>{["in_progress", "resolved"].includes((r.status || "").toLowerCase()) ? "✓" : "3"}</span>
                                  <div className="font-medium text-ink-950">Crew Dispatched & Started</div>
                                  <div className="text-muted-foreground text-[10px]">
                                    {r.assigned_worker_id ? `Assigned to collector #${r.assigned_worker_id}` : "Pending assignment"}
                                  </div>
                                </div>
                                <div className="relative">
                                  <span className={classNames(
                                    "absolute -left-[31px] top-0 w-4 h-4 rounded-full text-white flex items-center justify-center font-bold text-[9px]",
                                    r.status === "resolved" ? "bg-forest-500" : "bg-sand-300"
                                  )}>{r.status === "resolved" ? "✓" : "4"}</span>
                                  <div className="font-medium text-ink-950">Cleanup Resolution Completed</div>
                                  <div className="text-muted-foreground text-[10px]">
                                    {r.completed_at ? `Resolved at ${formatDate(r.completed_at)}` : "Pending cleanup"}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Actions & Eco Feedbacks */}
                            <div className="space-y-4">
                              <h4 className="font-display font-semibold text-sm">Details & Actions</h4>
                              
                              {/* Feature 12: Estimated Completion Time (ETA) Badge */}
                              <div className="bg-card p-3 rounded-lg border border-border flex items-center gap-2">
                                <Clock className="w-4 h-4 text-forest-500" />
                                <div className="text-xs">
                                  <div className="font-semibold">Resolution ETA</div>
                                  <div className="text-muted-foreground mt-0.5">
                                    {r.status === "resolved" ? "Completed" : r.priority === "urgent" ? "~2 hours" : r.priority === "high" ? "~6 hours" : "~24 hours"}
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                {/* Feature 13: Community Upvote / Echoing System */}
                                <Button size="sm" variant="secondary" onClick={(e) => handleUpvote(r.id, e)} className="flex-1 flex items-center justify-center gap-1">
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                  <span>{upvoteCount} Upvote{upvoteCount === 1 ? "" : "s"}</span>
                                </Button>

                                {/* Feature 14: Report Share Sheet */}
                                <Button size="sm" variant="secondary" onClick={(e) => handleShare(r.id, e)} className="flex-1 flex items-center justify-center gap-1">
                                  <Share2 className="w-3.5 h-3.5" />
                                  <span>{shareCopied === r.id ? "Copied!" : "Share"}</span>
                                </Button>
                              </div>

                              {/* Feature 15: Quick Feedback/Rating Modal */}
                              {r.status === "resolved" && (
                                <div className="border border-border/80 rounded-xl p-3 bg-card mt-3">
                                  <h5 className="text-xs font-semibold text-ink-950 mb-1.5">Rate resolution quality</h5>
                                  {hasRated ? (
                                    <div className="text-xs text-forest-700 flex items-center gap-1.5">
                                      <CheckCircle className="w-3.5 h-3.5" /> Feedback saved! Thank you!
                                    </div>
                                  ) : (
                                    <form onSubmit={(e) => handleRateReport(r.id, e)} className="space-y-2">
                                      <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((num) => (
                                          <button
                                            type="button"
                                            key={num}
                                            onClick={() => setRatingStars(num)}
                                            className="text-yellow-400 hover:scale-110 transition-transform"
                                          >
                                            <Star className="w-4 h-4" fill={ratingStars >= num ? "currentColor" : "none"} />
                                          </button>
                                        ))}
                                      </div>
                                      <input
                                        type="text"
                                        placeholder="Add comment (e.g. 'Very clean!')"
                                        value={ratingComment}
                                        onChange={(e) => setRatingComment(e.target.value)}
                                        className="w-full text-xs p-1.5 border border-border bg-sand-50 rounded"
                                      />
                                      <Button size="sm" className="w-full text-[10px]" disabled={ratingStars === 0}>Submit Rating</Button>
                                    </form>
                                  )}
                                </div>
                              )}
                            </div>

                          </div>
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
