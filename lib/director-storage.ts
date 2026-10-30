import { hydrateKvDb, kvGet, kvSet } from "./kv-db";
import { loadCharacters } from "./character-storage";
import { loadStorySessions } from "./story-storage";
import {
  DEFAULT_DIRECTOR_CONTEXT_TURNS,
  createEmptyDirectorState,
  type DirectorMessage,
  type DirectorNote,
  type DirectorRoom,
  type DirectorState,
} from "./director-types";

const DIRECTOR_STORAGE_KEY = "ai-phone:director-state-v1";

let _hydrated = false;
let _state: DirectorState = createEmptyDirectorState();

function nowIso(): string {
  return new Date().toISOString();
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeState(raw: unknown): DirectorState {
  const empty = createEmptyDirectorState();
  if (!raw || typeof raw !== "object") {
    return empty;
  }
  const source = raw as Partial<DirectorState>;
  const rooms = Array.isArray(source.rooms)
    ? source.rooms
        .filter((room): room is DirectorRoom => Boolean(room && typeof room.id === "string" && typeof room.primaryCharacterId === "string"))
        .map((room) => ({
          ...room,
          participantIds: Array.isArray(room.participantIds) && room.participantIds.length > 0
            ? room.participantIds
            : [room.primaryCharacterId],
          activeSpeakerId: room.activeSpeakerId || room.primaryCharacterId,
          contextTurns: Number(room.contextTurns) > 0 ? Number(room.contextTurns) : DEFAULT_DIRECTOR_CONTEXT_TURNS,
          title: room.title || "导演室",
        }))
    : [];

  const messages: Record<string, DirectorMessage[]> = {};
  if (source.messages && typeof source.messages === "object") {
    for (const [roomId, list] of Object.entries(source.messages)) {
      if (Array.isArray(list)) {
        messages[roomId] = list.filter((item): item is DirectorMessage => Boolean(item && typeof item.id === "string"));
      }
    }
  }

  const notes = Array.isArray(source.notes)
    ? source.notes.filter((note): note is DirectorNote => Boolean(note && typeof note.id === "string" && typeof note.text === "string"))
    : [];

  return { rooms, messages, notes };
}

export async function hydrateDirectorStorage(): Promise<void> {
  if (_hydrated || typeof window === "undefined") {
    return;
  }
  try {
    await hydrateKvDb();
  } catch {
    // 读不到就当空房间，别让整个 App 打不开
  }
  const raw = kvGet(DIRECTOR_STORAGE_KEY);
  if (raw) {
    try {
      _state = normalizeState(JSON.parse(raw) as unknown);
    } catch {
      _state = createEmptyDirectorState();
    }
  }
  _hydrated = true;
}

export function loadDirectorState(): DirectorState {
  return _state;
}

function persist(): void {
  try {
    kvSet(DIRECTOR_STORAGE_KEY, JSON.stringify(_state));
  } catch {
    // 存不下就算了，下次进页面重新建房间
  }
}

/** 默认接管哪个角色：最近跑过剧情的那个；没有剧情就取第一个角色 */
export function resolveDefaultDirectorCharacterId(): string {
  const sessions = loadStorySessions()
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const fromStory = sessions.find((session) => session.characterId)?.characterId;
  if (fromStory) {
    return fromStory;
  }
  return loadCharacters()[0]?.id ?? "";
}

export function findDirectorRoom(roomId: string): DirectorRoom | null {
  return _state.rooms.find((room) => room.id === roomId) ?? null;
}

export function findRoomForCharacter(characterId: string): DirectorRoom | null {
  if (!characterId) return null;
  return (
    _state.rooms.find((room) => room.primaryCharacterId === characterId)
    ?? _state.rooms.find((room) => room.participantIds.includes(characterId))
    ?? null
  );
}

export function ensureDirectorRoom(characterId: string): DirectorRoom | null {
  if (!characterId) return null;
  const existing = findRoomForCharacter(characterId);
  if (existing) return existing;

  const character = loadCharacters().find((item) => item.id === characterId);
  const timestamp = nowIso();
  const room: DirectorRoom = {
    id: generateId("dir"),
    title: `${character?.name ?? "未命名"} · 导演室`,
    primaryCharacterId: characterId,
    participantIds: [characterId],
    activeSpeakerId: characterId,
    contextTurns: DEFAULT_DIRECTOR_CONTEXT_TURNS,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  _state.rooms = [..._state.rooms, room];
  _state.messages[room.id] = [];
  persist();
  return room;
}

export function updateDirectorRoom(roomId: string, patch: Partial<DirectorRoom>): DirectorRoom | null {
  const index = _state.rooms.findIndex((room) => room.id === roomId);
  if (index < 0) return null;
  const next: DirectorRoom = {
    ..._state.rooms[index],
    ...patch,
    id: _state.rooms[index].id,
    primaryCharacterId: _state.rooms[index].primaryCharacterId,
    updatedAt: nowIso(),
  };
  if (!next.participantIds.includes(next.primaryCharacterId)) {
    next.participantIds = [next.primaryCharacterId, ...next.participantIds];
  }
  if (!next.participantIds.includes(next.activeSpeakerId)) {
    next.activeSpeakerId = next.primaryCharacterId;
  }
  _state.rooms = _state.rooms.map((room, i) => (i === index ? next : room));
  persist();
  return next;
}

export function loadDirectorMessages(roomId: string): DirectorMessage[] {
  return _state.messages[roomId] ?? [];
}

export function appendDirectorMessage(
  roomId: string,
  message: Omit<DirectorMessage, "id" | "roomId" | "createdAt">,
): DirectorMessage {
  const entry: DirectorMessage = {
    ...message,
    id: generateId("dmsg"),
    roomId,
    createdAt: nowIso(),
  };
  _state.messages[roomId] = [...(_state.messages[roomId] ?? []), entry];
  const index = _state.rooms.findIndex((room) => room.id === roomId);
  if (index >= 0) {
    _state.rooms = _state.rooms.map((room, i) => (i === index ? { ...room, updatedAt: entry.createdAt } : room));
  }
  persist();
  return entry;
}

export function clearDirectorMessages(roomId: string): void {
  _state.messages[roomId] = [];
  persist();
}

export function loadDirectorNotes(roomId?: string): DirectorNote[] {
  return roomId ? _state.notes.filter((note) => note.roomId === roomId) : _state.notes;
}

export function addDirectorNote(roomId: string, text: string, characterId: string | null = null): DirectorNote | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const note: DirectorNote = {
    id: generateId("dnote"),
    roomId,
    characterId,
    text: trimmed,
    enabled: false,
    createdAt: nowIso(),
  };
  _state.notes = [note, ..._state.notes];
  persist();
  return note;
}

export function toggleDirectorNote(noteId: string): DirectorNote | null {
  const index = _state.notes.findIndex((note) => note.id === noteId);
  if (index < 0) return null;
  const next = { ..._state.notes[index], enabled: !_state.notes[index].enabled };
  _state.notes = _state.notes.map((note, i) => (i === index ? next : note));
  persist();
  return next;
}

export function deleteDirectorNote(noteId: string): void {
  _state.notes = _state.notes.filter((note) => note.id !== noteId);
  persist();
}

/**
 * 供剧情生成读取：这个角色对应房间里「已启用」的导演笔记。
 * 已删除的角色/房间不会残留。
 */
export async function loadEnabledDirectorNotesForCharacter(characterId: string): Promise<string[]> {
  if (!characterId) return [];
  // 剧情生成不一定经过导演室页面，这里自己保证状态已加载
  await hydrateDirectorStorage();
  const roomIds = _state.rooms
    .filter((room) => room.primaryCharacterId === characterId)
    .map((room) => room.id);
  if (roomIds.length === 0) return [];
  return _state.notes
    .filter((note) => note.enabled && roomIds.includes(note.roomId))
    .map((note) => note.text.trim())
    .filter(Boolean);
}
