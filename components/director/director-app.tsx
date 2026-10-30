"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquareQuote, Send, StickyNote, Users, X } from "lucide-react";

import { PageShell } from "@/components/ui/page-shell";
import { loadCharacters } from "@/lib/character-storage";
import type { Character } from "@/lib/character-types";
import { hydrateStoryStorage } from "@/lib/story-storage";
import { generateDirectorReply } from "@/lib/director-engine";
import {
  addDirectorNote,
  appendDirectorMessage,
  clearDirectorMessages,
  deleteDirectorNote,
  ensureDirectorRoom,
  hydrateDirectorStorage,
  loadDirectorMessages,
  loadDirectorNotes,
  resolveDefaultDirectorCharacterId,
  toggleDirectorNote,
  updateDirectorRoom,
} from "@/lib/director-storage";
import {
  DIRECTOR_CONTEXT_TURN_OPTIONS,
  type DirectorMessage,
  type DirectorNote,
  type DirectorRoom,
} from "@/lib/director-types";

type DirectorAppProps = {
  onClose: () => void;
  onNotice?: (message: string) => void;
  /** 从剧情页进来时带上当前角色；从桌面图标进来则自动接管最近在演的那个 */
  characterId?: string | null;
};

const CARD: React.CSSProperties = {
  borderRadius: 16,
  background: "rgba(255,255,255,0.72)",
  border: "1px solid rgba(124,108,146,0.14)",
  padding: "10px 12px",
};

const CHIP_BASE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 12,
  lineHeight: 1.4,
  border: "1px solid rgba(124,108,146,0.24)",
  background: "rgba(255,255,255,0.9)",
  color: "var(--c-text, #2B2433)",
  cursor: "pointer",
};

function timeLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function DirectorApp({ onClose, onNotice, characterId }: DirectorAppProps) {
  const [ready, setReady] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [room, setRoom] = useState<DirectorRoom | null>(null);
  const [messages, setMessages] = useState<DirectorMessage[]>([]);
  const [notes, setNotes] = useState<DirectorNote[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [castingOpen, setCastingOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback((targetRoom: DirectorRoom | null) => {
    if (!targetRoom) {
      setMessages([]);
      setNotes([]);
      return;
    }
    setMessages(loadDirectorMessages(targetRoom.id));
    setNotes(loadDirectorNotes(targetRoom.id));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await hydrateDirectorStorage();
      await hydrateStoryStorage().catch(() => undefined);
      if (cancelled) return;
      const list = loadCharacters();
      setCharacters(list);
      const targetId = characterId || resolveDefaultDirectorCharacterId();
      const nextRoom = targetId ? ensureDirectorRoom(targetId) : null;
      setRoom(nextRoom);
      refresh(nextRoom);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [characterId, refresh]);

  useEffect(() => {
    const node = listRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages.length, sending]);

  const participants = useMemo(
    () => (room ? room.participantIds.map((id) => characters.find((item) => item.id === id)).filter(Boolean) as Character[] : []),
    [room, characters],
  );

  const activeSpeaker = useMemo(
    () => characters.find((item) => item.id === room?.activeSpeakerId) ?? null,
    [characters, room?.activeSpeakerId],
  );

  const enabledNoteCount = notes.filter((note) => note.enabled).length;

  const switchRoom = useCallback(
    (nextCharacterId: string) => {
      const nextRoom = ensureDirectorRoom(nextCharacterId);
      setRoom(nextRoom);
      refresh(nextRoom);
      setCastingOpen(false);
    },
    [refresh],
  );

  const toggleParticipant = useCallback(
    (id: string) => {
      if (!room) return;
      const has = room.participantIds.includes(id);
      if (has && room.primaryCharacterId === id) {
        onNotice?.("主演必须在场，不能移出。");
        return;
      }
      const nextIds = has ? room.participantIds.filter((item) => item !== id) : [...room.participantIds, id];
      if (nextIds.length === 0) return;
      const next = updateDirectorRoom(room.id, { participantIds: nextIds });
      if (next) {
        setRoom(next);
        refresh(next);
      }
    },
    [room, onNotice, refresh],
  );

  const setSpeaker = useCallback(
    (id: string) => {
      if (!room) return;
      const next = updateDirectorRoom(room.id, { activeSpeakerId: id });
      if (next) {
        setRoom(next);
        refresh(next);
      }
    },
    [room, refresh],
  );

  const setContextTurns = useCallback(
    (turns: number) => {
      if (!room) return;
      const next = updateDirectorRoom(room.id, { contextTurns: turns });
      if (next) {
        setRoom(next);
      }
    },
    [room],
  );

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending || !room) return;
    setError("");
    setDraft("");
    appendDirectorMessage(room.id, {
      role: "user",
      speakerId: null,
      speakerName: "导演",
      content: text,
    });
    const afterUser = loadDirectorMessages(room.id);
    setMessages(afterUser);
    setSending(true);
    try {
      const result = await generateDirectorReply({ room, messages: afterUser, notes });
      appendDirectorMessage(room.id, {
        role: "assistant",
        speakerId: result.speakerId,
        speakerName: result.speakerName,
        content: result.content,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setSending(false);
      setMessages(loadDirectorMessages(room.id));
      setNotes(loadDirectorNotes(room.id));
    }
  }, [draft, sending, room, notes]);

  const saveLastReplyAsNote = useCallback(() => {
    if (!room) return;
    const last = [...messages].reverse().find((message) => message.role === "assistant");
    if (!last) {
      onNotice?.("还没有可存成笔记的发言。");
      return;
    }
    addDirectorNote(room.id, last.content, last.speakerId);
    setNotes(loadDirectorNotes(room.id));
    setNotesOpen(true);
    onNotice?.("已存成导演笔记，默认不生效，去笔记里勾选才会注入剧情。");
  }, [room, messages, onNotice]);

  const handleClear = useCallback(() => {
    if (!room) return;
    clearDirectorMessages(room.id);
    setMessages([]);
    onNotice?.("这个房间的讨论已清空（笔记保留）。");
  }, [room, onNotice]);

  const headerRight = (
    <button
      type="button"
      onClick={() => setNotesOpen(true)}
      style={{ ...CHIP_BASE, background: enabledNoteCount > 0 ? "rgba(139,111,82,0.14)" : "rgba(255,255,255,0.9)" }}
    >
      <StickyNote size={13} />
      笔记 {notes.length > 0 ? `(${enabledNoteCount}/${notes.length})` : ""}
    </button>
  );

  if (!ready) {
    return (
      <PageShell title="导演室" onBack={onClose}>
        <div style={{ padding: 24, fontSize: 13, color: "var(--c-icon, #8b8095)" }}>正在打开导演室…</div>
      </PageShell>
    );
  }

  if (!room) {
    return (
      <PageShell title="导演室" onBack={onClose}>
        <div style={{ padding: 24, fontSize: 13, lineHeight: 1.8, color: "var(--c-text, #2B2433)" }}>
          还没有角色，先去「角色」里建一个，再回来开会。
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="导演室" onBack={onClose} rightAction={headerRight}>
      <div style={{ display: "flex", flexDirection: "column", padding: "0 12px 16px", flex: "1 1 auto", minHeight: 0 }}>
        <div style={{ ...CARD, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <button
              type="button"
              onClick={() => setCastingOpen(true)}
              style={{ ...CHIP_BASE, background: "rgba(139,111,82,0.12)" }}
            >
              <Users size={13} />
              本场主角：{characters.find((item) => item.id === room.primaryCharacterId)?.name ?? "未命名"}
            </button>
            <select
              value={room.contextTurns}
              onChange={(event) => setContextTurns(Number(event.target.value))}
              style={{ fontSize: 12, borderRadius: 10, padding: "4px 6px", border: "1px solid rgba(124,108,146,0.24)", background: "white" }}
            >
              {DIRECTOR_CONTEXT_TURN_OPTIONS.map((turns) => (
                <option key={turns} value={turns}>
                  带入最近 {turns} 条剧情
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {participants.map((item) => {
              const speaking = item.id === room.activeSpeakerId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSpeaker(item.id)}
                  onDoubleClick={() => toggleParticipant(item.id)}
                  style={{
                    ...CHIP_BASE,
                    background: speaking ? "rgba(139,111,82,0.86)" : "rgba(255,255,255,0.9)",
                    color: speaking ? "#fff" : "var(--c-text, #2B2433)",
                    borderColor: speaking ? "transparent" : "rgba(124,108,146,0.24)",
                  }}
                  title="点一下＝这次让他说；双击＝移出/放回在场"
                >
                  {item.name}
                  {speaking ? " ·在说" : ""}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                const used = new Set(room.participantIds);
                const first = characters.find((item) => !used.has(item.id));
                if (!first) {
                  onNotice?.("所有角色都已经在场了。");
                  return;
                }
                toggleParticipant(first.id);
              }}
              style={{ ...CHIP_BASE, borderStyle: "dashed" }}
            >
              + 加演员
            </button>
          </div>
          <div style={{ fontSize: 11, color: "var(--c-icon, #8b8095)", marginTop: 6, lineHeight: 1.6 }}>
            一次只有一个人开口（防串戏）。点名字切换谁来说，双击把某个演员移出/放回在场。
          </div>
        </div>

        <div
          ref={listRef}
          style={{
            flex: "1 1 auto",
            minHeight: 140,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "2px 2px 4px",
            marginBottom: 10,
          }}
        >
          {messages.length === 0 ? (
            <div style={{ ...CARD, fontSize: 12.5, lineHeight: 1.85, color: "var(--c-text, #2B2433)" }}>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>收工了，坐这边聊。</div>
              你可以问我：
              <br />· 刚才那一段，我是不是演飘了？
              <br />· 下一场你想怎么走？
              <br />· 你对你这个角色怎么看，他会不会做这种事？
              <br />· 我觉得这里接不上，我们一起改改。
            </div>
          ) : (
            messages.map((message) => {
              const mine = message.role === "user";
              return (
                <div
                  key={message.id}
                  style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}
                >
                  <div
                    style={{
                      maxWidth: "86%",
                      borderRadius: 14,
                      padding: "8px 11px",
                      fontSize: 12.5,
                      lineHeight: 1.75,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      background: mine ? "rgba(139,111,82,0.9)" : "rgba(255,255,255,0.92)",
                      color: mine ? "#fff" : "var(--c-text, #2B2433)",
                      border: mine ? "none" : "1px solid rgba(124,108,146,0.14)",
                    }}
                  >
                    {!mine ? (
                      <div style={{ fontSize: 11, opacity: 0.62, marginBottom: 3 }}>
                        {message.speakerName} · {timeLabel(message.createdAt)}
                      </div>
                    ) : null}
                    {message.content}
                  </div>
                </div>
              );
            })
          )}
          {sending ? (
            <div style={{ fontSize: 11.5, color: "var(--c-icon, #8b8095)", paddingLeft: 4 }}>
              {activeSpeaker?.name ?? "演员"} 正在想…
            </div>
          ) : null}
          {error ? (
            <div style={{ ...CARD, borderColor: "rgba(200,80,80,0.4)", color: "#a3403f", fontSize: 12, lineHeight: 1.7 }}>
              {error}
            </div>
          ) : null}
        </div>

        <div style={{ ...CARD, padding: 8 }}>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder={`跟 ${activeSpeaker?.name ?? "演员"} 聊这场戏…（Ctrl/Cmd + Enter 发送）`}
            rows={2}
            style={{
              width: "100%",
              resize: "none",
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 12.5,
              lineHeight: 1.7,
              color: "var(--c-text, #2B2433)",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
            <button type="button" onClick={saveLastReplyAsNote} style={CHIP_BASE} title="把上一条发言存成导演笔记">
              <MessageSquareQuote size={13} />
              存成笔记
            </button>
            <button type="button" onClick={handleClear} style={CHIP_BASE} title="清空这个房间的讨论（笔记保留）">
              清空
            </button>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || !draft.trim()}
              style={{
                ...CHIP_BASE,
                background: sending || !draft.trim() ? "rgba(124,108,146,0.18)" : "rgba(139,111,82,0.9)",
                color: sending || !draft.trim() ? "rgba(43,36,51,0.5)" : "#fff",
                borderColor: "transparent",
              }}
            >
              <Send size={13} />
              发送
            </button>
          </div>
        </div>
      </div>

      {notesOpen ? (
        <Sheet title="导演笔记" onClose={() => setNotesOpen(false)}>
          <div style={{ fontSize: 11.5, lineHeight: 1.8, color: "var(--c-icon, #8b8095)", marginBottom: 10 }}>
            勾选「注入」的笔记会进入{characters.find((item) => item.id === room.primaryCharacterId)?.name ?? "主演"}下一次剧情生成的提示词。
            默认不生效，防止你随手记的东西乱改戏。
          </div>
          {notes.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--c-icon, #8b8095)" }}>还没有笔记。先聊，聊出结论点「存成笔记」。</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {notes.map((note) => (
                <div key={note.id} style={{ ...CARD, background: "rgba(255,255,255,0.94)" }}>
                  <div style={{ fontSize: 12.5, lineHeight: 1.7, whiteSpace: "pre-wrap", color: "var(--c-text, #2B2433)" }}>
                    {note.text}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={note.enabled}
                        onChange={() => {
                          toggleDirectorNote(note.id);
                          setNotes(loadDirectorNotes(room.id));
                        }}
                      />
                      注入剧情
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        deleteDirectorNote(note.id);
                        setNotes(loadDirectorNotes(room.id));
                      }}
                      style={{ ...CHIP_BASE, padding: "2px 8px" }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Sheet>
      ) : null}

      {castingOpen ? (
        <Sheet title="选择本场主角" onClose={() => setCastingOpen(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {characters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => switchRoom(item.id)}
                style={{
                  ...CARD,
                  textAlign: "left",
                  cursor: "pointer",
                  background: item.id === room.primaryCharacterId ? "rgba(139,111,82,0.14)" : "rgba(255,255,255,0.94)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
                  {item.briefPersona || item.persona || "（没写人设）"}
                </div>
              </button>
            ))}
          </div>
        </Sheet>
      ) : null}
    </PageShell>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 60,
        background: "rgba(43,36,51,0.28)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "78vh",
          overflowY: "auto",
          background: "#FBF8FF",
          borderRadius: "18px 18px 0 0",
          padding: 16,
          paddingBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <strong style={{ fontSize: 14 }}>{title}</strong>
          <button type="button" onClick={onClose} style={{ ...CHIP_BASE, padding: "2px 8px" }} aria-label="关闭">
            <X size={13} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
