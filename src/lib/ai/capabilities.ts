"use server";
import { db } from "@/db";
import { tasks, people, initiatives, goals, strategyKernels, kernelActions, aiThreads, aiMessages, activityLog } from "@/db/schema";
import { and, asc, desc, eq, gte, isNull } from "drizzle-orm";
import { ai } from "@/lib/ai/provider";
import { getBoardSnapshot } from "@/lib/ai/snapshot";
import { getClarifyTargets, getEnrichedTasks } from "@/lib/gtd";

const VOICE = "Write in V's voice: concise, direct, warm but no fluff. Remove words that don't earn their place.";

/* 1 + 2. Capture parsing (+ auto-link) */
export async function parseCapture(rawText: string) {
  const { initiatives: inis, people: ppl } = await getClarifyTargets();
  const sys = "You turn a messy capture line into a structured GTD task. Return JSON only.";
  const prompt = `Capture line: "${rawText}"

Initiatives (id → title):
${inis.map((i) => `${i.id} :: ${i.title}`).join("\n")}

People: ${ppl.map((p) => p.name).join(", ")}

Return JSON: {
 "title": clean imperative task title,
 "initiativeId": the best-matching initiative id from the list or null,
 "initiativeReason": one short phrase why,
 "contexts": array from ["@home","@clinic","@deep-work","@calls","@claude-code","@errand","@review"],
 "waitingOnPersonName": a person name from the list if the line implies waiting on someone, else null,
 "dueDate": ISO date (YYYY-MM-DD) if a deadline is implied, else null,
 "blocker": short text if the line names a blocker, else null
}`;
  const out = await ai.completeJSON<any>("clarify", prompt, sys);
  const person = out.waitingOnPersonName ? ppl.find((p) => p.name.toLowerCase() === String(out.waitingOnPersonName).toLowerCase()) : null;
  return {
    title: out.title || rawText,
    initiativeId: inis.some((i) => i.id === out.initiativeId) ? out.initiativeId : null,
    initiativeReason: out.initiativeReason || null,
    contexts: Array.isArray(out.contexts) ? out.contexts : [],
    waitingOnPersonId: person?.id || null,
    waitingOnPersonName: person?.name || null,
    dueDate: out.dueDate || null,
    blocker: out.blocker || null,
  };
}

/* 4. Strategy coherence (Rumelt critique) */
export async function critiqueKernel(goalId: string) {
  const [g] = await db.select().from(goals).where(eq(goals.id, goalId));
  if (!g) return "Goal not found.";
  const [k] = await db.select().from(strategyKernels).where(eq(strategyKernels.goalId, goalId));
  const cas = k ? await db.select().from(kernelActions).where(eq(kernelActions.kernelId, k.id)) : [];
  const linked = await db.select({ title: initiatives.title }).from(initiatives).where(and(eq(initiatives.goalId, goalId), isNull(initiatives.archivedAt)));
  const sys = `You are a sharp strategy critic in the tradition of Richard Rumelt's "Good Strategy / Bad Strategy". Be pointed, not flattering. ${VOICE}`;
  const prompt = `Critique this goal's strategy kernel. Assess: does the diagnosis name a real crux? Do the guiding principles follow from it? Do the coherent actions follow from the principles? Flag any coherent action with no linked execution (strategy without execution) and any linked initiative doing work no principle justifies (execution without strategy). End with the single most important fix.

GOAL: ${g.title} (status ${g.status}${g.targetHorizon ? ", " + g.targetHorizon : ""})
DIAGNOSIS: ${k?.diagnosis || "(none yet)"}
GUIDING PRINCIPLES:
${((k?.guidingPrinciples as string[]) || []).map((p) => "- " + p).join("\n") || "(none)"}
COHERENT ACTIONS:
${cas.map((c) => `- ${c.text}${c.linkedNodeId ? " [linked to execution]" : " [NO execution link]"}`).join("\n") || "(none)"}
LINKED INITIATIVES: ${linked.map((l) => l.title).join(", ") || "(none)"}

Write 4-7 tight sentences. No preamble.`;
  return ai.complete("critique", prompt, sys);
}

/* 5. Daily brief (cached per day in ai_threads/ai_messages) */
export async function getDailyBrief(force = false) {
  const day = new Date().toISOString().slice(0, 10);
  const title = `brief:${day}`;
  const [existing] = await db.select().from(aiThreads).where(eq(aiThreads.title, title));
  if (existing && !force) {
    const [msg] = await db.select().from(aiMessages).where(eq(aiMessages.threadId, existing.id)).orderBy(desc(aiMessages.createdAt));
    if (msg) return { text: msg.content, cached: true, day };
  }
  const snap = await getBoardSnapshot();
  const sys = `You write a short morning focus brief for V, a hospital product manager running a multi-domain portfolio. ${VOICE}`;
  const prompt = `From this board snapshot, write today's brief (max ~120 words): the 3-4 things to focus on (respecting domain order), anything freshly unblocked, waiting-ons that have gone stale (>5d), and anything due. If the board is quiet, say so plainly. No headers, just 3-5 crisp lines.

SNAPSHOT:
${JSON.stringify(snap)}`;
  const text = await ai.complete("brief", prompt, sys);
  const thread = existing ?? (await db.insert(aiThreads).values({ title }).returning())[0];
  await db.insert(aiMessages).values({ threadId: thread.id, role: "assistant", content: text });
  return { text, cached: false, day };
}

/* 6. Draft the nudge */
export async function draftNudge(taskId: string) {
  const [t] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!t) return "Task not found.";
  const person = t.waitingOnPersonId ? (await db.select().from(people).where(eq(people.id, t.waitingOnPersonId)))[0] : null;
  const days = t.waitingSince ? Math.floor((Date.now() - new Date(t.waitingSince).getTime()) / 86400000) : 0;
  const sys = `You draft short, friendly-but-direct follow-up messages a manager sends a colleague. ${VOICE} No greeting boilerplate beyond a name; no sign-off fluff.`;
  const prompt = `Draft a 2-3 sentence follow-up message to ${person?.name || "the colleague"} about: "${t.title}". V has been waiting ${days} day(s). Make it easy for them to say where it stands. Output only the message.`;
  return ai.complete("nudge", prompt, sys);
}

/* 3. Weekly Review copilot */
export async function reviewPrep() {
  const all = await getEnrichedTasks();
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const doneThisWeek = await db.select().from(tasks).where(and(eq(tasks.gtdStatus, "done"), gte(tasks.completedAt, weekAgo)));
  const staleWaiting = all.filter((t) => t.gtdStatus === "waiting" && (t.waitingDays ?? 0) >= 5);
  const snap = await getBoardSnapshot();
  const sys = `You are V's weekly-review copilot (GTD). Do the legwork; V drives. ${VOICE}`;
  const prompt = `Prepare V's weekly review. Using the data, write four short sections (label each on its own line, then 1-3 bullets):
"What got done", "Nudge candidates (stale waiting-ons)", "Move to Someday?", "Goals with no movement".
Be specific and brief.

DONE THIS WEEK: ${doneThisWeek.map((t) => t.title + (t.completionNote ? ` — ${t.completionNote}` : "")).join(" | ") || "(none)"}
STALE WAITING-ONS: ${staleWaiting.map((t) => `${t.title} (on ${t.waitingOn?.name}, ${t.waitingDays}d)`).join(" | ") || "(none)"}
SNAPSHOT: ${JSON.stringify(snap)}`;
  const text = await ai.complete("review", prompt, sys);
  return { text, doneCount: doneThisWeek.length, staleCount: staleWaiting.length };
}

/* The ⌘J assistant — board Q&A, cited, with a confirmable proposed action. */
export async function assistantTurn(threadId: string | null, message: string) {
  const snap = await getBoardSnapshot();
  const sys = `You are V's command-center assistant. Answer from the board snapshot only — never invent initiatives, people, goals, or tasks. ${VOICE}
Return JSON: {
 "answer": markdown answer (concise),
 "citations": array of exact titles from the snapshot you used (initiatives/goals/tasks), max 5,
 "proposedAction": null OR { "kind": "capture"|"createTask", "label": human label for a confirm button, "text": the task/inbox text, "initiativeId": id-or-null }
}
Only propose an action if V is clearly asking to create/capture something. Reads need no action.`;
  const prompt = `User: ${message}\n\nSNAPSHOT:\n${JSON.stringify(snap)}`;
  const out = await ai.completeJSON<any>("assistant", prompt, sys);

  // resolve citation titles → hrefs
  const titleToHref = new Map<string, { title: string; href: string }>();
  for (const d of snap.domains) for (const i of d.initiatives) titleToHref.set(i.title, { title: i.title, href: `/n/initiative/${i.id}` });
  for (const g of snap.goals) titleToHref.set(g.title, { title: g.title, href: `/n/goal/${g.id}` });
  const citations = (Array.isArray(out.citations) ? out.citations : []).map((t: string) => titleToHref.get(t)).filter(Boolean);

  // persist
  let tid = threadId;
  if (!tid) tid = (await db.insert(aiThreads).values({ title: message.slice(0, 60) }).returning())[0].id;
  await db.insert(aiMessages).values({ threadId: tid, role: "user", content: message });
  await db.insert(aiMessages).values({ threadId: tid, role: "assistant", content: out.answer || "", citations });
  await db.update(aiThreads).set({ lastMessageAt: new Date() }).where(eq(aiThreads.id, tid));

  return { threadId: tid, answer: out.answer || "", citations, proposedAction: out.proposedAction || null };
}

import { revalidatePath } from "next/cache";
import { inboxItems } from "@/db/schema";
import { max } from "drizzle-orm";

/** Commit a confirmable assistant-proposed write. */
export async function runAssistantAction(kind: string, text: string, initiativeId: string | null) {
  const t = text.trim(); if (!t) return { ok: false };
  if (kind === "capture") {
    await db.insert(inboxItems).values({ rawText: t });
  } else if (kind === "createTask") {
    const [m] = await db.select({ v: max(tasks.sortOrder) }).from(tasks);
    await db.insert(tasks).values({ title: t, initiativeId: initiativeId || null, gtdStatus: "next", isNextAction: true, sortOrder: (m?.v ?? 0) + 1 });
  } else return { ok: false };
  revalidatePath("/"); revalidatePath("/inbox"); revalidatePath("/gtd");
  return { ok: true };
}
