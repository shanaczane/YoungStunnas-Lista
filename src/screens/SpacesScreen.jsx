import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { parseTask } from "../lib/ai";
import ProfileAvatar from "../components/ProfileAvatar";
import ScreenHeader from "../components/ScreenHeader";
import { formatDueDate } from "../lib/utils";
import { getCategoryColor } from "../lib/categories";
import mascot from "../mascots/home-mascot.png";

const SPACE_COLORS = [
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#10B981",
  "#EF4444",
  "#06B6D4",
  "#0EA5E9",
];
const CATEGORIES = ["Work", "Personal", "School", "Errands", "Health"];
const PINNED_KEY = "lista_pinned_spaces";

// ── Spaces list ───────────────────────────────────────────────────────────────
export default function SpacesScreen({ session, displayName, onNavigate }) {
  const [spaces, setSpaces] = useState([]);
  const [activeSpace, setActiveSpace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  const [pinnedIds, setPinnedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(PINNED_KEY) || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(PINNED_KEY, JSON.stringify(pinnedIds));
  }, [pinnedIds]);

  useEffect(() => {
    fetchSpaces();
  }, [session.user.id]);

  async function fetchSpaces() {
    setLoading(true);
    const { data } = await supabase
      .from("spaces")
      .select("*, space_members(user_id, display_name)")
      .eq("owner_id", session.user.id)
      .order("created_at", { ascending: false });
    setSpaces(data || []);
    setLoading(false);
  }

  function togglePin(id, e) {
    e.stopPropagation();
    setPinnedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [id, ...prev],
    );
  }

  const sorted = [...spaces].sort((a, b) => {
    const ap = pinnedIds.includes(a.id),
      bp = pinnedIds.includes(b.id);
    if (ap && !bp) return -1;
    if (!ap && bp) return 1;
    return 0;
  });

  async function handleCreateSpace({ name, description, color }) {
    const { data, error } = await supabase
      .from("spaces")
      .insert({ name, owner_id: session.user.id })
      .select()
      .single();
    if (!error && data) {
      await supabase
        .from("space_members")
        .insert({
          space_id: data.id,
          user_id: session.user.id,
          display_name: displayName,
        });
      const created = {
        ...data,
        description,
        color,
        space_members: [
          { user_id: session.user.id, display_name: displayName },
        ],
      };
      setSpaces((prev) => [created, ...prev]);
      setActiveSpace(created);
    }
    setShowCreate(false);
  }

  async function handleDeleteFromList(spaceId) {
    await supabase.from("tasks").delete().eq("space_id", spaceId);
    await supabase.from("space_members").delete().eq("space_id", spaceId);
    await supabase.from("spaces").delete().eq("id", spaceId);
    setSpaces((prev) => prev.filter((s) => s.id !== spaceId));
    setPinnedIds((prev) => prev.filter((p) => p !== spaceId));
    setEditingSpace(null);
  }

  if (activeSpace) {
    return (
      <SpaceBoard
        space={activeSpace}
        session={session}
        displayName={displayName}
        onNavigate={onNavigate}
        onBack={() => {
          setActiveSpace(null);
          fetchSpaces();
        }}
        onSpaceDeleted={() => {
          setActiveSpace(null);
          fetchSpaces();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-app-bg">
      <ScreenHeader>
        <div>
          <h1 className="text-slate-900 font-bold text-2xl">Spaces</h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Collaborate with your team
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="w-9 h-9 rounded-full bg-accent-deep flex items-center justify-center text-white transition-colors active:bg-accent-mid"
            style={{ boxShadow: "0 4px 12px rgba(10,46,92,0.35)" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <ProfileAvatar displayName={displayName} onNavigate={onNavigate} />
        </div>
      </ScreenHeader>

      {showCreate && (
        <CreateSpaceModal
          onConfirm={handleCreateSpace}
          onCancel={() => setShowCreate(false)}
        />
      )}
      {editingSpace && (
        <SpaceSettingsModal
          space={editingSpace}
          session={session}
          onSave={async (updates) => {
            await supabase
              .from("spaces")
              .update(updates)
              .eq("id", editingSpace.id);
            setSpaces((prev) =>
              prev.map((s) =>
                s.id === editingSpace.id ? { ...s, ...updates } : s,
              ),
            );
            setEditingSpace(null);
          }}
          onDelete={() => handleDeleteFromList(editingSpace.id)}
          onClose={() => setEditingSpace(null)}
        />
      )}

      <div className="flex-1 overflow-y-auto px-5 pb-24 pt-4">
        {loading ? (
          <div className="flex justify-center pt-20">
            <div className="w-6 h-6 border-2 border-accent-light border-t-transparent rounded-full animate-spin" />
          </div>
        ) : spaces.length === 0 ? (
          <EmptySpaces onCreate={() => setShowCreate(true)} />
        ) : (
          <div className="space-y-3">
            {sorted.map((space) => {
              const isPinned = pinnedIds.includes(space.id);
              const memberCount = (space.space_members || []).length;
              const shownMembers = (space.space_members || []).slice(0, 4);
              const spaceColor = space.color || "#6366F1";
              return (
                <div key={space.id}>
                  {isPinned && (
                    <div className="flex items-center gap-1 mb-1 pl-1">
                      <PinIcon size={10} filled />
                      <span className="text-[10px] font-bold text-accent-deep uppercase tracking-wider">
                        Pinned
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => setActiveSpace(space)}
                    className={`w-full bg-card-bg rounded-2xl p-4 card-elevated flex items-center gap-3 text-left transition-all active:scale-[0.99] ${isPinned ? "ring-1 ring-accent-deep/20" : ""}`}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
                      style={{
                        backgroundColor: spaceColor + "20",
                        color: spaceColor,
                      }}
                    >
                      {(space.name || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-slate-900 font-bold text-base truncate">
                          {space.name}
                        </p>
                        {space.owner_id === session.user.id && (
                          <span className="text-[10px] text-accent-deep border border-accent-deep/30 bg-accent-pale px-2 py-0.5 rounded-full flex-shrink-0">
                            Owner
                          </span>
                        )}
                      </div>
                      {space.description && (
                        <p className="text-slate-400 text-xs mt-0.5 truncate">
                          {space.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex -space-x-1.5">
                          {shownMembers.map((m, i) => (
                            <div
                              key={i}
                              className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white text-[8px] font-bold"
                              style={{ backgroundColor: spaceColor }}
                            >
                              {(m.display_name || "?")[0].toUpperCase()}
                            </div>
                          ))}
                          {memberCount > 4 && (
                            <div className="w-5 h-5 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-slate-500 text-[7px] font-bold">
                              +{memberCount - 4}
                            </div>
                          )}
                        </div>
                        <span className="text-slate-400 text-xs">
                          {memberCount} member{memberCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <div
                      className="flex flex-col items-center gap-1.5 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => togglePin(space.id, e)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isPinned ? "text-accent-deep" : "text-slate-200 hover:text-slate-400"}`}
                      >
                        <PinIcon filled={isPinned} size={14} />
                      </button>
                      <button
                        onClick={() => setEditingSpace(space)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300 hover:text-slate-600 transition-colors"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <circle cx="12" cy="5" r="1.5" />
                          <circle cx="12" cy="12" r="1.5" />
                          <circle cx="12" cy="19" r="1.5" />
                        </svg>
                      </button>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Space Board ───────────────────────────────────────────────────────────────
function SpaceBoard({
  space,
  session,
  displayName,
  onBack,
  onNavigate,
  onSpaceDeleted,
}) {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState(space.space_members || []);
  const [spaceData, setSpaceData] = useState(space);
  const [input, setInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseCard, setParseCard] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [memberFilter, setMemberFilter] = useState(null);
  const [sortBy, setSortBy] = useState("created");
  const [groupByMember, setGroupByMember] = useState(false);
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [modifications, setModifications] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`lista_mods_${space.id}`) || "{}");
    } catch {
      return {};
    }
  });
  const inputRef = useRef(null);

  function openMemberProfile(displayName) {
    if (!displayName) return;
    const found = members.find(
      (m) => m.display_name?.toLowerCase() === displayName.toLowerCase(),
    );
    setSelectedMember(found || { display_name: displayName, user_id: null });
  }

  const fetchSpaceTasks = useCallback(async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("space_id", spaceData.id)
      .order("created_at", { ascending: false });
    setTasks(data || []);
  }, [spaceData.id]);

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase
      .from("space_members")
      .select("user_id, display_name")
      .eq("space_id", spaceData.id);
    if (data) setMembers(data);
  }, [spaceData.id]);

  useEffect(() => {
    fetchSpaceTasks();
    fetchMembers();
    const channel = supabase
      .channel(`space-${spaceData.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `space_id=eq.${spaceData.id}`,
        },
        fetchSpaceTasks,
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [spaceData.id, fetchSpaceTasks, fetchMembers]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || parsing) return;
    setParsing(true);
    setParseCard(null);
    try {
      const parsed = await parseTask(trimmed);
      let assignee = parsed.assignee;
      if (assignee) {
        const match = members.find((m) =>
          m.display_name?.toLowerCase().includes(assignee.toLowerCase()),
        );
        // Only accept assignee if it matches a space member — otherwise ignore it
        assignee = match ? match.display_name : null;
      }
      setParseCard({
        raw: trimmed,
        ...parsed,
        assignee: assignee || displayName,
      });
    } catch {
      setParseCard({
        raw: trimmed,
        task: trimmed,
        due_date: null,
        category: "Work",
        assignee: displayName,
      });
    } finally {
      setParsing(false);
    }
  }

  async function handleConfirm() {
    if (!parseCard) return;
    const { error } = await supabase.from("tasks").insert({
      user_id: session.user.id,
      space_id: spaceData.id,
      content: parseCard.raw,
      task_name: parseCard.task,
      due_date: parseCard.due_date || null,
      category: parseCard.category || "Work",
      assignee: parseCard.assignee || displayName,
    });
    if (!error) fetchSpaceTasks();
    setParseCard(null);
    setInput("");
  }

  async function handleToggle(task) {
    const updated = !task.is_complete;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, is_complete: updated } : t)),
    );
    await supabase
      .from("tasks")
      .update({ is_complete: updated })
      .eq("id", task.id);
  }

  async function handleTaskUpdate(taskId, updates) {
    const oldTask = tasks.find((t) => t.id === taskId);
    // Ensure any assignee update is a valid space member
    if (updates && updates.assignee !== undefined && updates.assignee) {
      const match = members.find((m) => m.display_name === updates.assignee);
      if (!match) updates.assignee = null;
    }
    const { data } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId)
      .select()
      .single();
    if (data) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data : t)));

      // Track which fields changed (store actual new values for display)
      const changed = [];
      if (
        updates.task_name !== undefined &&
        updates.task_name !== oldTask?.task_name
      )
        changed.push({ field: "title", to: updates.task_name });
      if (
        updates.category !== undefined &&
        updates.category !== oldTask?.category
      )
        changed.push({ field: "category", to: updates.category });
      if (
        updates.due_date !== undefined &&
        updates.due_date !== oldTask?.due_date
      )
        changed.push({
          field: "due date",
          to: updates.due_date ? formatDueDate(updates.due_date) : "none",
        });
      if (
        updates.assignee !== undefined &&
        updates.assignee !== oldTask?.assignee
      )
        changed.push({
          field: "assignee",
          to: updates.assignee || "unassigned",
        });

      if (changed.length > 0) {
        setModifications((prev) => {
          const next = {
            ...prev,
            [taskId]: {
              by: displayName,
              at: new Date().toISOString(),
              changes: changed,
            },
          };
          localStorage.setItem(
            `lista_mods_${spaceData.id}`,
            JSON.stringify(next),
          );
          return next;
        });
      }
    }
    setEditingTask(null);
  }

  async function handleTaskDelete(taskId) {
    await supabase.from("tasks").delete().eq("id", taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setEditingTask(null);
  }

  async function handleSpaceSave(updates) {
    await supabase.from("spaces").update(updates).eq("id", spaceData.id);
    setSpaceData((prev) => ({ ...prev, ...updates }));
    setShowSettings(false);
  }

  async function handleSpaceDelete() {
    await supabase.from("tasks").delete().eq("space_id", spaceData.id);
    await supabase.from("space_members").delete().eq("space_id", spaceData.id);
    await supabase.from("spaces").delete().eq("id", spaceData.id);
    onSpaceDeleted?.();
  }

  // Filter + sort
  let filtered = tasks;
  if (statusFilter === "active")
    filtered = filtered.filter((t) => !t.is_complete);
  else if (statusFilter === "done")
    filtered = filtered.filter((t) => t.is_complete);
  if (categoryFilter)
    filtered = filtered.filter((t) => t.category === categoryFilter);
  if (memberFilter)
    filtered = filtered.filter((t) =>
      t.assignee?.toLowerCase().includes(memberFilter.toLowerCase()),
    );

  const displayed = [...filtered].sort((a, b) => {
    if (sortBy === "due") {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    }
    if (sortBy === "alpha")
      return (a.task_name || "").localeCompare(b.task_name || "");
    if (sortBy === "assignee")
      return (a.assignee || "zzz").localeCompare(b.assignee || "zzz");
    return 0;
  });

  const grouped = groupByMember
    ? displayed.reduce((acc, t) => {
        const key = t.assignee || "Unassigned";
        acc[key] = acc[key] || [];
        acc[key].push(t);
        return acc;
      }, {})
    : null;

  const activeFilterCount = [
    statusFilter !== "all",
    !!categoryFilter,
    !!memberFilter,
    sortBy !== "created",
    groupByMember,
  ].filter(Boolean).length;
  const spaceColor = spaceData.color || "#6366F1";

  return (
    <div className="flex flex-col min-h-screen bg-app-bg">
      <ScreenHeader className="px-5 pt-6 pb-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-accent-deep text-sm font-medium mb-3"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          All Spaces
        </button>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0"
              style={{ backgroundColor: spaceColor + "20", color: spaceColor }}
            >
              {(spaceData.name || "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-slate-900 font-bold text-xl truncate">
                {spaceData.name}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="flex -space-x-1">
                  {members.slice(0, 5).map((m, i) => (
                    <button
                      key={i}
                      onClick={() => openMemberProfile(m.display_name)}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold border-2 border-app-bg transition-transform active:scale-90"
                      style={{ backgroundColor: spaceColor }}
                    >
                      {(m.display_name || "?")[0].toUpperCase()}
                    </button>
                  ))}
                </div>
                <span className="text-slate-400 text-xs">
                  {members.length} member{members.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setShowActivity((v) => !v)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${showActivity ? "bg-accent-pale text-accent-deep" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </button>
            <ProfileAvatar displayName={displayName} onNavigate={onNavigate} />
          </div>
        </div>
      </ScreenHeader>

      {/* Filter row */}
      <div className="relative">
        <div className="px-5 pb-2 flex items-center gap-2">
          <button
            onClick={() => setShowFilterBar((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${activeFilterCount > 0 ? "bg-accent-deep text-white" : "border border-black/10 text-slate-400"}`}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
          <button
            onClick={() => setGroupByMember((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${groupByMember ? "bg-accent-pale text-accent-deep border border-accent-deep/20" : "border border-black/10 text-slate-400"}`}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
            By Member
          </button>
          <div className="flex-1" />
          <span className="text-slate-300 text-xs">
            {displayed.length} task{displayed.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Expanded filters — floats over task list */}
        {showFilterBar && (
          <div className="absolute top-full left-0 right-0 z-10 mx-4 rounded-2xl bg-card-bg border border-black/8 shadow-xl px-4 py-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px] w-16 flex-shrink-0 font-medium">
                Status
              </span>
              <div className="flex gap-1.5">
                {["all", "active", "done"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize transition-colors ${statusFilter === s ? "bg-accent-deep text-white" : "border border-black/10 text-slate-400"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-400 text-[11px] w-16 flex-shrink-0 font-medium pt-1">
                Category
              </span>
              <div className="flex gap-1.5 flex-wrap">
                {CATEGORIES.map((c) => {
                  const col = getCategoryColor(c);
                  return (
                    <button
                      key={c}
                      onClick={() =>
                        setCategoryFilter(categoryFilter === c ? null : c)
                      }
                      className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                      style={
                        categoryFilter === c
                          ? { backgroundColor: col.border, color: "#fff" }
                          : { backgroundColor: col.bg, color: col.text }
                      }
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
            {members.length > 1 && (
              <div className="flex items-start gap-2">
                <span className="text-slate-400 text-[11px] w-16 flex-shrink-0 font-medium pt-1">
                  Member
                </span>
                <div className="flex gap-1.5 flex-wrap">
                  {members.map((m) => (
                    <button
                      key={m.user_id}
                      onClick={() =>
                        setMemberFilter(
                          memberFilter === m.display_name
                            ? null
                            : m.display_name,
                        )
                      }
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${memberFilter === m.display_name ? "bg-accent-deep text-white" : "border border-black/10 text-slate-400"}`}
                    >
                      {m.display_name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px] w-16 flex-shrink-0 font-medium">
                Sort
              </span>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  ["created", "Recent"],
                  ["due", "Due"],
                  ["alpha", "A–Z"],
                  ["assignee", "Assignee"],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setSortBy(val)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${sortBy === val ? "bg-accent-deep text-white" : "border border-black/10 text-slate-400"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setCategoryFilter(null);
                  setMemberFilter(null);
                  setSortBy("created");
                  setGroupByMember(false);
                }}
                className="text-red-400 text-xs font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-5 pb-44 space-y-2.5">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[25vh] text-center">
            <p className="text-slate-400 text-sm font-medium">No tasks</p>
            <p className="text-slate-300 text-xs mt-1">
              {activeFilterCount > 0
                ? "Try adjusting your filters"
                : "Type below to add one for the team"}
            </p>
          </div>
        ) : grouped ? (
          Object.entries(grouped).map(([member, memberTasks]) => (
            <div key={member} className="space-y-2">
              <div className="flex items-center gap-2 px-1 pt-1">
                <button
                  onClick={() => openMemberProfile(member)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 transition-transform active:scale-90"
                  style={{ backgroundColor: spaceColor }}
                >
                  {member[0].toUpperCase()}
                </button>
                <span className="text-slate-600 text-xs font-bold">
                  {member}
                </span>
                <span className="text-slate-300 text-xs">
                  · {memberTasks.length}
                </span>
              </div>
              {memberTasks.map((task) => (
                <SpaceTaskCard
                  key={task.id}
                  task={task}
                  members={members}
                  spaceColor={spaceColor}
                  onToggle={() => handleToggle(task)}
                  onClick={() => setEditingTask(task)}
                  onMemberClick={openMemberProfile}
                />
              ))}
            </div>
          ))
        ) : (
          displayed.map((task) => (
            <SpaceTaskCard
              key={task.id}
              task={task}
              members={members}
              spaceColor={spaceColor}
              onToggle={() => handleToggle(task)}
              onClick={() => setEditingTask(task)}
              onMemberClick={openMemberProfile}
            />
          ))
        )}
      </div>

      {/* Bottom input */}
      <div className="fixed bottom-16 left-0 right-0 z-10 px-4 pb-3 pt-2 bg-app-bg/96 backdrop-blur-md flex flex-col gap-2.5">
        {parseCard && (
          <div className="bg-card-bg rounded-2xl p-4 card-elevated-lg">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">
              AI Parsed · Space Task
            </p>
            <p className="text-slate-800 text-sm font-semibold">
              {parseCard.task}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {parseCard.due_date && (
                <span className="text-slate-400 text-xs">
                  📅 {new Date(parseCard.due_date).toLocaleDateString()}
                </span>
              )}
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{
                  backgroundColor: getCategoryColor(parseCard.category).bg,
                  color: getCategoryColor(parseCard.category).text,
                }}
              >
                {parseCard.category}
              </span>
              {parseCard.assignee && (
                <span className="text-accent-deep text-xs font-medium">
                  → {parseCard.assignee}
                </span>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setParseCard(null)}
                className="flex-1 py-2.5 rounded-xl border border-black/10 text-slate-500 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 rounded-xl bg-accent-deep text-white text-sm font-bold"
              >
                Add to Space
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 bg-card-bg border border-black/10 rounded-2xl px-4 py-3 shadow-sm">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Add a task... "Mel finalize slides by Sunday"`}
            className="flex-1 bg-transparent text-slate-800 text-sm outline-none placeholder:text-slate-300"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || parsing}
            className="w-8 h-8 rounded-full bg-accent-deep hover:bg-accent-mid flex items-center justify-center transition-colors disabled:opacity-40 flex-shrink-0"
          >
            {parsing ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {showSettings && (
        <SpaceSettingsModal
          space={spaceData}
          session={session}
          onSave={handleSpaceSave}
          onDelete={handleSpaceDelete}
          onClose={() => {
            setShowSettings(false);
            fetchMembers();
          }}
          onMemberClick={(name) => {
            setShowSettings(false);
            openMemberProfile(name);
          }}
        />
      )}
      {editingTask && (
        <SpaceTaskModal
          task={editingTask}
          members={members}
          onSave={(updates) => handleTaskUpdate(editingTask.id, updates)}
          onDelete={() => handleTaskDelete(editingTask.id)}
          onClose={() => setEditingTask(null)}
          onMemberClick={openMemberProfile}
        />
      )}
      {showActivity && (
        <ActivityDrawer
          tasks={tasks}
          members={members}
          spaceColor={spaceColor}
          onClose={() => setShowActivity(false)}
          onMemberClick={openMemberProfile}
        />
      )}
      {selectedMember && (
        <MemberProfileModal
          member={selectedMember}
          tasks={tasks}
          modifications={modifications}
          spaceColor={spaceColor}
          onClose={() => setSelectedMember(null)}
          onNavigate={onNavigate}
          onOpenTask={(task) => {
            setSelectedMember(null);
            setEditingTask(task);
          }}
        />
      )}
    </div>
  );
}

// ── Task card ─────────────────────────────────────────────────────────────────
function SpaceTaskCard({
  task,
  members,
  spaceColor,
  onToggle,
  onClick,
  onMemberClick,
}) {
  const colors = getCategoryColor(task.category);
  const creator = members.find((m) => m.user_id === task.user_id);
  const creatorName = creator?.display_name || null;
  // Sanitize: treat the string "null"/"undefined" as absent
  const rawAssignee =
    task.assignee && task.assignee !== "null" && task.assignee !== "undefined"
      ? task.assignee
      : null;
  const effectiveAssignee = rawAssignee || creatorName;
  const sameAsCreator =
    effectiveAssignee &&
    creatorName &&
    effectiveAssignee.split(" ")[0].toLowerCase() ===
      creatorName.split(" ")[0].toLowerCase();

  return (
    <div
      className="bg-card-bg rounded-2xl flex items-center card-elevated transition-all overflow-hidden active:scale-[0.99] cursor-pointer"
      onClick={onClick}
    >
      <div
        className="w-1 self-stretch flex-shrink-0"
        style={{ backgroundColor: colors.border }}
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="w-11 h-11 flex items-center justify-center flex-shrink-0"
      >
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.is_complete ? "bg-accent-deep border-accent-deep" : "border-slate-300"}`}
        >
          {task.is_complete && (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path
                d="M10 3L5 8.5 2 5.5"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </button>
      <div className="flex-1 py-3.5 min-w-0">
        <p
          className={`text-sm font-semibold leading-tight truncate ${task.is_complete ? "line-through text-slate-300" : "text-slate-800"}`}
        >
          {task.task_name}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {task.category}
          </span>
          {task.due_date && (
            <p className="text-slate-400 text-xs">
              {formatDueDate(task.due_date)}
            </p>
          )}
          {effectiveAssignee && (
            <span className="text-accent-deep text-xs font-medium">
              → {effectiveAssignee}
            </span>
          )}
        </div>
      </div>
      {/* Stacked avatars: assignee on top, creator offset below if different */}
      <div className="flex-shrink-0 pr-3">
        <div className="relative flex flex-col items-center">
          {effectiveAssignee && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMemberClick?.(effectiveAssignee);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold ring-2 ring-white transition-transform active:scale-90"
              style={{ backgroundColor: spaceColor }}
            >
              {effectiveAssignee[0].toUpperCase()}
            </button>
          )}
          {creatorName && !sameAsCreator && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMemberClick?.(creatorName);
              }}
              className={`w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white transition-transform active:scale-90 ${effectiveAssignee ? "-mt-2" : ""}`}
            >
              {creatorName[0].toUpperCase()}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Edit task modal ───────────────────────────────────────────────────────────
function SpaceTaskModal({
  task,
  members,
  onSave,
  onDelete,
  onClose,
  onMemberClick,
}) {
  const creator = members.find((m) => m.user_id === task.user_id);
  const creatorName = creator?.display_name || null;
  const sanitizedAssignee =
    task.assignee && task.assignee !== "null" && task.assignee !== "undefined"
      ? task.assignee
      : null;

  const [taskName, setTaskName] = useState(task.task_name || "");
  const [category, setCategory] = useState(task.category || "Work");
  const [assignee, setAssignee] = useState(
    sanitizedAssignee || creatorName || "",
  );
  const [dueDate, setDueDate] = useState(
    task.due_date ? task.due_date.slice(0, 16) : "",
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const createdAt = task.created_at ? new Date(task.created_at) : null;
  const history = [];
  if (createdAt)
    history.push({
      label: "Created",
      date: createdAt,
      icon: "✦",
      color: "#94a3b8",
      person: creatorName,
    });
  if (task.is_complete)
    history.push({
      label: "Completed",
      date: new Date(task.updated_at || task.created_at),
      icon: "✓",
      color: "#34d399",
      person: task.assignee || creatorName,
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full bg-card-bg rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>
        <div className="overflow-y-auto flex-1 px-6 pb-4">
          <div className="flex items-center justify-between mt-2 mb-5">
            <h2 className="text-slate-900 font-bold text-xl">Edit Task</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <p className="text-slate-500 text-xs font-semibold mb-1.5 uppercase tracking-wide">
              Task
            </p>
            <input
              autoFocus
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 text-sm rounded-xl px-4 py-3 outline-none border border-black/10 focus:border-accent-deep transition-colors"
            />
          </div>

          <div className="mb-4">
            <p className="text-slate-500 text-xs font-semibold mb-2 uppercase tracking-wide">
              Category
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const col = getCategoryColor(c);
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={
                      category === c
                        ? { backgroundColor: col.border, color: "#fff" }
                        : { backgroundColor: col.bg, color: col.text }
                    }
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-slate-500 text-xs font-semibold mb-1.5 uppercase tracking-wide">
              Due Date
            </p>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 text-sm rounded-xl px-4 py-3 outline-none border border-black/10 focus:border-accent-deep transition-colors"
            />
          </div>

          <div className="mb-5">
            <p className="text-slate-500 text-xs font-semibold mb-2 uppercase tracking-wide">
              Assignee
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setAssignee("")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!assignee ? "bg-slate-200 text-slate-700" : "border border-black/10 text-slate-400"}`}
              >
                Unassigned
              </button>
              {members.map((m) => (
                <button
                  key={m.user_id}
                  onClick={() => setAssignee(m.display_name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${assignee === m.display_name ? "bg-accent-deep text-white" : "border border-black/10 text-slate-400"}`}
                >
                  {m.display_name}
                </button>
              ))}
            </div>
          </div>

          {history.length > 0 && (
            <div className="mb-5">
              <p className="text-slate-500 text-xs font-semibold mb-3 uppercase tracking-wide">
                History
              </p>
              <div className="relative pl-4">
                <div className="absolute left-3 top-3 bottom-3 w-px bg-slate-100" />
                <div className="space-y-3">
                  {history.map((ev, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 relative z-10"
                        style={{ backgroundColor: ev.color }}
                      >
                        {ev.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-600 text-xs font-semibold">
                          {ev.label}
                        </p>
                        <p className="text-slate-400 text-[10px] mt-0.5">
                          {ev.date.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}{" "}
                          at{" "}
                          {ev.date.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {ev.person ? (
                        <button
                          onClick={() => onMemberClick?.(ev.person)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 transition-transform active:scale-90"
                          style={{ backgroundColor: ev.color }}
                        >
                          {ev.person[0].toUpperCase()}
                        </button>
                      ) : (
                        <div className="w-7 h-7 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-[10px] flex-shrink-0">
                          ?
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {confirmDelete ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-2">
              <p className="text-red-600 text-sm font-semibold mb-1">
                Delete this task?
              </p>
              <p className="text-red-400 text-xs mb-3">
                This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2 rounded-xl border border-red-100 text-slate-500 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={onDelete}
                  className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-red-400 text-xs font-medium w-full text-center py-2"
            >
              Delete Task
            </button>
          )}
        </div>
        <div className="px-6 pb-8 pt-3 border-t border-black/8 flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-black/10 text-slate-500 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                task_name: taskName.trim(),
                category,
                assignee: assignee || null,
                due_date: dueDate || null,
              })
            }
            disabled={!taskName.trim()}
            className="flex-1 py-3 rounded-xl bg-accent-deep text-white text-sm font-bold disabled:opacity-40"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Space settings modal ──────────────────────────────────────────────────────
function SpaceSettingsModal({
  space,
  session,
  onSave,
  onDelete,
  onClose,
  onMemberClick,
}) {
  const [name, setName] = useState(space.name || "");
  const [description, setDescription] = useState(space.description || "");
  const [color, setColor] = useState(space.color || "#6366F1");
  const [members, setMembers] = useState(space.space_members || []);
  const [memberEmail, setMemberEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    supabase
      .from("space_members")
      .select("user_id, display_name")
      .eq("space_id", space.id)
      .then(({ data }) => {
        if (data) setMembers(data);
      });
  }, [space.id]);

  async function handleAddMember() {
    const email = memberEmail.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Enter a valid email");
      return;
    }
    setAddingMember(true);
    const displayName = email.split("@")[0];
    const { error } = await supabase.from("space_members").insert({
      space_id: space.id,
      user_id: crypto.randomUUID(),
      display_name: displayName,
    });
    if (!error) {
      setMembers((prev) => [
        ...prev,
        { user_id: crypto.randomUUID(), display_name: displayName },
      ]);
      setMemberEmail("");
      setEmailError("");
    } else {
      setEmailError("Could not add member");
    }
    setAddingMember(false);
  }

  async function handleRemoveMember(userId) {
    await supabase
      .from("space_members")
      .delete()
      .eq("space_id", space.id)
      .eq("user_id", userId);
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full bg-card-bg rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>
        <div className="overflow-y-auto flex-1 px-6 pb-4">
          <div className="flex items-center justify-between mt-2 mb-6">
            <h2 className="text-slate-900 font-bold text-xl">Space Settings</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <p className="text-slate-500 text-xs font-semibold mb-1.5 uppercase tracking-wide">
              Space Name
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 text-sm rounded-xl px-4 py-3 outline-none border border-black/10 focus:border-accent-deep transition-colors"
            />
          </div>

          <div className="mb-4">
            <p className="text-slate-500 text-xs font-semibold mb-1.5 uppercase tracking-wide">
              Description{" "}
              <span className="normal-case font-normal text-slate-300">
                (optional)
              </span>
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-slate-50 text-slate-800 text-sm rounded-xl px-4 py-3 outline-none border border-black/10 focus:border-accent-deep resize-none transition-colors"
            />
          </div>

          <div className="mb-5">
            <p className="text-slate-500 text-xs font-semibold mb-2 uppercase tracking-wide">
              Theme Color
            </p>
            <div className="flex flex-wrap gap-3">
              {SPACE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? "scale-125 ring-2 ring-offset-2 ring-slate-400" : "hover:scale-110"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="mb-5">
            <p className="text-slate-500 text-xs font-semibold mb-3 uppercase tracking-wide">
              Members
            </p>
            <div className="space-y-2 mb-3">
              {members.map((m) => (
                <div
                  key={m.user_id}
                  className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5"
                >
                  <button
                    onClick={() => onMemberClick?.(m.display_name)}
                    className="flex items-center gap-3 flex-1 text-left min-w-0"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {(m.display_name || "?")[0].toUpperCase()}
                    </div>
                    <span className="text-slate-700 text-sm font-medium truncate">
                      {m.display_name}
                    </span>
                    <svg
                      className="ml-auto flex-shrink-0 text-slate-300"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                  {m.user_id !== session.user.id && (
                    <button
                      onClick={() => handleRemoveMember(m.user_id)}
                      className="text-slate-300 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={memberEmail}
                onChange={(e) => {
                  setMemberEmail(e.target.value);
                  setEmailError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddMember();
                  }
                }}
                placeholder="Add member by email"
                className="flex-1 bg-slate-50 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none border border-black/10 focus:border-accent-deep transition-colors"
              />
              <button
                onClick={handleAddMember}
                disabled={addingMember}
                className="px-4 py-2.5 rounded-xl bg-accent-deep text-white text-sm font-semibold disabled:opacity-40 transition-colors"
              >
                Add
              </button>
            </div>
            {emailError && (
              <p className="text-red-500 text-xs mt-1">{emailError}</p>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">
              Danger Zone
            </p>
            {confirmDelete ? (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                <p className="text-red-600 text-sm font-semibold mb-1">
                  Delete "{space.name}"?
                </p>
                <p className="text-red-400 text-xs mb-3">
                  All tasks in this space will be permanently deleted.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2.5 rounded-xl border border-red-100 text-slate-500 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onDelete}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold"
                  >
                    Delete Space
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full py-2.5 rounded-xl border border-red-100 text-red-400 text-sm font-medium"
              >
                Delete Space
              </button>
            )}
          </div>
        </div>
        <div className="px-6 pb-8 pt-3 border-t border-black/8 flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-black/10 text-slate-500 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              name.trim() && onSave({ name: name.trim(), description, color })
            }
            disabled={!name.trim()}
            className="flex-1 py-3 rounded-xl bg-accent-deep text-white text-sm font-bold disabled:opacity-40"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Activity timeline drawer ──────────────────────────────────────────────────
function ActivityDrawer({
  tasks,
  members,
  spaceColor,
  onClose,
  onMemberClick,
}) {
  const events = [];
  tasks.forEach((task) => {
    const creator = members.find((m) => m.user_id === task.user_id);
    const creatorName = creator?.display_name || null;
    if (task.created_at) {
      events.push({
        type: "created",
        task,
        date: new Date(task.created_at),
        label: "Task created",
        person: creatorName,
      });
    }
    if (task.is_complete) {
      events.push({
        type: "completed",
        task,
        date: new Date(task.updated_at || task.created_at),
        label: "Task completed",
        person: task.assignee || creatorName,
      });
    }
  });
  events.sort((a, b) => b.date - a.date);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full bg-card-bg rounded-t-3xl max-h-[70vh] flex flex-col shadow-2xl">
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>
        <div className="px-6 pt-3 pb-2 flex items-center justify-between flex-shrink-0">
          <h2 className="text-slate-900 font-bold text-lg">
            Activity Timeline
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 pb-8">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[20vh] text-center">
              <p className="text-slate-400 text-sm">No activity yet</p>
              <p className="text-slate-300 text-xs mt-1">
                Task events will appear here
              </p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-3.5 top-4 bottom-4 w-px bg-slate-100" />
              <div className="space-y-4">
                {events.map((ev, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 relative z-10"
                      style={{
                        backgroundColor:
                          ev.type === "completed" ? "#34d399" : spaceColor,
                      }}
                    >
                      {ev.type === "completed" ? "✓" : "✦"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wide">
                        {ev.label}
                      </p>
                      <p className="text-slate-800 text-sm font-medium mt-0.5 truncate">
                        {ev.task.task_name}
                      </p>
                      <p className="text-slate-400 text-[10px] mt-0.5">
                        {ev.date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        ·{" "}
                        {ev.date.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {ev.person ? (
                      <button
                        onClick={() => onMemberClick?.(ev.person)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 transition-transform active:scale-90"
                        style={{
                          backgroundColor:
                            ev.type === "completed" ? "#34d399" : spaceColor,
                        }}
                        title={ev.person}
                      >
                        {ev.person[0].toUpperCase()}
                      </button>
                    ) : (
                      <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-[10px] flex-shrink-0">
                        ?
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Create space modal ────────────────────────────────────────────────────────
function CreateSpaceModal({ onConfirm, onCancel }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366F1");
  const [memberEmail, setMemberEmail] = useState("");
  const [members, setMembers] = useState([]);
  const [emailError, setEmailError] = useState("");
  const [photo, setPhoto] = useState(null);
  const photoRef = useRef(null);

  function handleAddMember() {
    const email = memberEmail.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Enter a valid email");
      return;
    }
    if (members.includes(email)) {
      setEmailError("Already added");
      return;
    }
    setMembers((prev) => [...prev, email]);
    setMemberEmail("");
    setEmailError("");
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target.result);
    reader.readAsDataURL(file);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full bg-card-bg rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>
        <div className="overflow-y-auto flex-1 px-6 pb-4">
          <h2 className="text-slate-900 font-bold text-xl mt-2 mb-6">
            Create a Space
          </h2>

          <div className="flex justify-center mb-6">
            <button
              type="button"
              onClick={() => photoRef.current?.click()}
              className="relative group"
            >
              <div
                className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-200 group-hover:border-accent-deep transition-colors"
                style={{ backgroundColor: color + "20" }}
              >
                {photo ? (
                  <img
                    src={photo}
                    alt="group"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold" style={{ color }}>
                    {name ? name[0].toUpperCase() : "?"}
                  </span>
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-7 h-7 bg-accent-deep rounded-full flex items-center justify-center border-2 border-white">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
            </button>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          <div className="mb-4">
            <p className="text-slate-500 text-xs font-semibold mb-1.5 uppercase tracking-wide">
              Space Name
            </p>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim())
                  onConfirm({ name: name.trim(), description, color, members });
              }}
              placeholder="e.g. Sprint 3, Study Group, Thesis Team"
              className="w-full bg-slate-50 text-slate-800 text-sm rounded-xl px-4 py-3 outline-none border border-black/10 focus:border-accent-deep placeholder:text-slate-300 transition-colors"
            />
          </div>

          <div className="mb-4">
            <p className="text-slate-500 text-xs font-semibold mb-1.5 uppercase tracking-wide">
              Description{" "}
              <span className="text-slate-300 normal-case font-normal">
                (optional)
              </span>
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this space for?"
              rows={2}
              className="w-full bg-slate-50 text-slate-800 text-sm rounded-xl px-4 py-3 outline-none border border-black/10 focus:border-accent-deep placeholder:text-slate-300 resize-none transition-colors"
            />
          </div>

          <div className="mb-4">
            <p className="text-slate-500 text-xs font-semibold mb-2 uppercase tracking-wide">
              Theme Color
            </p>
            <div className="flex flex-wrap gap-3">
              {SPACE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? "scale-125 ring-2 ring-offset-2 ring-slate-400" : "hover:scale-110"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="mb-2">
            <p className="text-slate-500 text-xs font-semibold mb-1.5 uppercase tracking-wide">
              Invite Members
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={memberEmail}
                onChange={(e) => {
                  setMemberEmail(e.target.value);
                  setEmailError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddMember();
                  }
                }}
                placeholder="Enter email address"
                className="flex-1 bg-slate-50 text-slate-800 text-sm rounded-xl px-4 py-3 outline-none border border-black/10 focus:border-accent-deep placeholder:text-slate-300 transition-colors"
              />
              <button
                type="button"
                onClick={handleAddMember}
                className="px-4 py-3 rounded-xl bg-accent-deep text-white text-sm font-semibold hover:bg-accent-mid transition-colors"
              >
                Add
              </button>
            </div>
            {emailError && (
              <p className="text-red-500 text-xs mt-1">{emailError}</p>
            )}
            {members.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {members.map((email) => (
                  <div
                    key={email}
                    className="flex items-center gap-1.5 bg-accent-pale text-accent-deep px-3 py-1.5 rounded-full text-xs font-medium"
                  >
                    <div className="w-4 h-4 rounded-full bg-accent-deep text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                      {email[0].toUpperCase()}
                    </div>
                    <span className="max-w-[140px] truncate">{email}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setMembers((prev) => prev.filter((m) => m !== email))
                      }
                      className="text-accent-deep/50 hover:text-red-400 ml-0.5 leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-8 pt-3 border-t border-black/8 flex gap-3 flex-shrink-0">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-black/10 text-slate-500 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              name.trim() &&
              onConfirm({ name: name.trim(), description, color, members })
            }
            disabled={!name.trim()}
            className="flex-1 py-3 rounded-xl bg-accent-deep text-white text-sm font-bold disabled:opacity-40 hover:bg-accent-mid transition-colors"
          >
            Create Space
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Member profile modal ──────────────────────────────────────────────────────
function MemberProfileModal({
  member,
  tasks,
  modifications = {},
  spaceColor,
  onClose,
  onNavigate,
  onOpenTask,
}) {
  const name = member.display_name || "Unknown";
  const [activeTab, setActiveTab] = useState("all");

  const createdTasks = tasks.filter((t) => t.user_id === member.user_id);
  const assignedTasks = tasks.filter(
    (t) => t.assignee?.toLowerCase() === name.toLowerCase(),
  );
  const completedTasks = assignedTasks.filter((t) => t.is_complete);
  const activeTasks = assignedTasks.filter((t) => !t.is_complete);
  const completionRate =
    assignedTasks.length > 0
      ? Math.round((completedTasks.length / assignedTasks.length) * 100)
      : 0;

  // Modified = tasks where this member made an edit (tracked in localStorage)
  const modifiedTasks = tasks
    .filter(
      (t) => modifications[t.id]?.by?.toLowerCase() === name.toLowerCase(),
    )
    .sort(
      (a, b) =>
        new Date(modifications[b.id].at) - new Date(modifications[a.id].at),
    );

  const allTasks = [
    ...new Map(
      [...createdTasks, ...assignedTasks, ...modifiedTasks].map((t) => [
        t.id,
        t,
      ]),
    ).values(),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Build history events
  const historyEvents = [];
  tasks.forEach((task) => {
    const isCreator = task.user_id === member.user_id;
    const isAssigned = task.assignee?.toLowerCase() === name.toLowerCase();
    const mod = modifications[task.id];
    const isModifier = mod?.by?.toLowerCase() === name.toLowerCase();
    if (isCreator)
      historyEvents.push({
        date: new Date(task.created_at),
        label: "Created",
        task,
        color: spaceColor,
      });
    if (isAssigned && task.is_complete)
      historyEvents.push({
        date: new Date(task.updated_at || task.created_at),
        label: "Completed",
        task,
        color: "#34d399",
      });
    if (isModifier)
      historyEvents.push({
        date: new Date(mod.at),
        label: "Edited",
        task,
        color: "#8B5CF6",
        detail: mod.changes
          .map((c) => (typeof c === "object" ? `${c.field} → "${c.to}"` : c))
          .join(" · "),
      });
    if (isAssigned && !isCreator && !isModifier)
      historyEvents.push({
        date: new Date(task.created_at),
        label: "Assigned",
        task,
        color: "#94a3b8",
      });
  });
  historyEvents.sort((a, b) => b.date - a.date);

  const TABS = [
    { id: "all", label: "All", tasks: allTasks },
    { id: "created", label: "Created", tasks: createdTasks },
    { id: "completed", label: "Completed", tasks: completedTasks },
    { id: "active", label: "In Progress", tasks: activeTasks },
    { id: "modified", label: "Modified", tasks: modifiedTasks },
    { id: "history", label: "History", tasks: null },
  ];

  const lastActive = allTasks[0]?.created_at;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full bg-card-bg rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pt-4 pb-4 flex-shrink-0 border-b border-black/6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
                style={{ backgroundColor: spaceColor }}
              >
                {name[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-slate-900 font-bold text-lg leading-tight">
                  {name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: spaceColor + "cc" }}
                  >
                    Member
                  </span>
                  {lastActive && (
                    <span className="text-slate-400 text-[10px]">
                      Active{" "}
                      {new Date(lastActive).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Compact stats row */}
          <div className="flex gap-2">
            {[
              {
                label: "Created",
                value: createdTasks.length,
                color: spaceColor,
              },
              { label: "Done", value: completedTasks.length, color: "#34d399" },
              {
                label: "Edited",
                value: modifiedTasks.length,
                color: "#8B5CF6",
              },
              { label: "Rate", value: `${completionRate}%`, color: "#6366F1" },
            ].map((s) => (
              <div
                key={s.label}
                className="flex-1 bg-slate-50 rounded-xl px-2 py-2 text-center"
              >
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
                  {s.label}
                </p>
                <p
                  className="text-base font-bold mt-0.5"
                  style={{ color: s.color }}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1.5 px-5 pt-3 pb-2 overflow-x-auto flex-shrink-0"
          style={{ scrollbarWidth: "none" }}
        >
          {TABS.map((tab) => {
            const count = tab.tasks ? tab.tasks.length : historyEvents.length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "bg-accent-deep text-white"
                    : "text-slate-400 border border-black/10"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.id ? "bg-card-bg/20" : "bg-slate-100 text-slate-400"}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 pb-6">
          {activeTab === "history" ? (
            <HistoryTimeline events={historyEvents} spaceColor={spaceColor} />
          ) : (
            <ProfileTaskSection
              tasks={TABS.find((t) => t.id === activeTab)?.tasks || []}
              spaceColor={spaceColor}
              onOpenTask={onOpenTask}
              modifications={activeTab === "modified" ? modifications : {}}
            />
          )}

          <button
            onClick={() => {
              onClose();
              onNavigate?.("profile");
            }}
            className="w-full mt-5 py-3 rounded-2xl border-2 border-black/8 text-slate-600 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
          >
            See Full Profile
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileTaskSection({
  tasks,
  spaceColor,
  onOpenTask,
  modifications = {},
}) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-slate-400 text-sm font-medium">No tasks here</p>
      </div>
    );
  }
  return (
    <div className="space-y-2 pt-2">
      {tasks.map((task) => (
        <ProfileTaskCard
          key={task.id}
          task={task}
          spaceColor={spaceColor}
          modInfo={modifications[task.id] || null}
          onOpen={() => onOpenTask?.(task)}
        />
      ))}
    </div>
  );
}

function ProfileTaskCard({ task, spaceColor, modInfo, onOpen }) {
  const colors = getCategoryColor(task.category);
  return (
    <button
      onClick={onOpen}
      className="w-full bg-card-bg rounded-2xl flex items-stretch card-elevated overflow-hidden text-left transition-all active:scale-[0.99]"
    >
      <div
        className="w-1 flex-shrink-0"
        style={{ backgroundColor: modInfo ? "#8B5CF6" : colors.border }}
      />
      <div className="flex-1 px-3.5 py-3 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm font-semibold leading-tight flex-1 ${task.is_complete ? "line-through text-slate-300" : "text-slate-800"}`}
          >
            {task.task_name}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
            {modInfo && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded-full">
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Modified
              </span>
            )}
            {task.is_complete && (
              <div className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center">
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M10 3L5 8.5 2 5.5"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {task.category}
          </span>
          {task.due_date && (
            <span className="text-slate-400 text-[10px]">
              {formatDueDate(task.due_date)}
            </span>
          )}
          {task.assignee && (
            <span className="text-accent-deep text-[10px] font-medium">
              → {task.assignee}
            </span>
          )}
        </div>
        {modInfo ? (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-purple-400 text-[9px] font-medium">
              {modInfo.changes
                .map((c) =>
                  typeof c === "object" ? `${c.field} → "${c.to}"` : c,
                )
                .join(" · ")}
            </span>
            <span className="text-slate-300 text-[9px]">·</span>
            <span className="text-slate-400 text-[9px]">
              {timeAgo(modInfo.at)}
            </span>
          </div>
        ) : (
          <p className="text-slate-300 text-[9px] mt-1.5">
            {new Date(task.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}
      </div>
    </button>
  );
}

function HistoryTimeline({ events, spaceColor }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-slate-400 text-sm font-medium">No history yet</p>
      </div>
    );
  }

  const now = new Date();
  const todayStr = now.toDateString();
  const yestStr = new Date(now - 86400000).toDateString();
  const weekAgo = new Date(now - 7 * 86400000);
  const groups = {};
  const ORDER = ["Today", "Yesterday", "This Week", "Older"];

  events.forEach((ev) => {
    const ds = ev.date.toDateString();
    const key =
      ds === todayStr
        ? "Today"
        : ds === yestStr
          ? "Yesterday"
          : ev.date >= weekAgo
            ? "This Week"
            : "Older";
    if (!groups[key]) groups[key] = [];
    groups[key].push(ev);
  });

  return (
    <div className="pt-2 space-y-5">
      {ORDER.filter((k) => groups[k]).map((groupKey) => (
        <div key={groupKey}>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-3 px-1">
            {groupKey}
          </p>
          <div className="relative">
            <div className="absolute left-3.5 top-3 bottom-3 w-px bg-slate-100" />
            <div className="space-y-2.5">
              {groups[groupKey].map((ev, i) => {
                const col = getCategoryColor(ev.task.category);
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 relative z-10"
                      style={{ backgroundColor: ev.color }}
                    >
                      {ev.label === "Completed"
                        ? "✓"
                        : ev.label === "Created"
                          ? "+"
                          : "→"}
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2.5 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-[10px] font-bold"
                          style={{ color: ev.color }}
                        >
                          {ev.label}
                        </span>
                        <span className="text-slate-400 text-[9px] flex-shrink-0">
                          {timeAgo(ev.date.toISOString())}
                        </span>
                      </div>
                      <p className="text-slate-700 text-xs font-semibold mt-0.5 truncate">
                        {ev.task.task_name}
                      </p>
                      {ev.detail && (
                        <p
                          className="text-[9px] mt-0.5"
                          style={{ color: ev.color }}
                        >
                          {ev.detail}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: col.bg, color: col.text }}
                        >
                          {ev.task.category}
                        </span>
                        {ev.task.due_date && (
                          <span className="text-slate-400 text-[9px]">
                            {formatDueDate(ev.task.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ── Pin icon ──────────────────────────────────────────────────────────────────
function PinIcon({ filled = false, size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptySpaces({ onCreate }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <img
        src={mascot}
        alt="Ollie"
        className="w-36 h-36 object-contain mb-2"
        style={{ mixBlendMode: "multiply" }}
      />
      <p className="text-slate-500 text-sm mb-1">No spaces yet</p>
      <p className="text-slate-300 text-xs mb-5">
        Create a space to collaborate with your team
      </p>
      <button
        onClick={onCreate}
        className="bg-accent-deep hover:bg-accent-mid text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
      >
        Create a Space
      </button>
    </div>
  );
}
