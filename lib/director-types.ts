/**
 * 导演室的数据结构。
 *
 * 心智模型：一场戏 = 一个「房间」。房间里坐着几个演员（participantIds），
 * 其中一个是主演（primaryCharacterId，默认就是你正在跑剧情的那个角色）。
 * 每次只让一个演员开口（activeSpeakerId），避免串戏、也避免一次烧好几次 API。
 *
 * 讨论出的结论存成「导演笔记」，每条单独开关；启用后会被注入该房间主演的
 * 下一次剧情生成（见 lib/story-engine.ts 的 buildStoryPromptMessages）。
 */

export type DirectorMessageRole = "user" | "assistant";

export type DirectorMessage = {
  id: string;
  roomId: string;
  role: DirectorMessageRole;
  /** assistant 消息是谁说的（角色 id）；user 消息为 null */
  speakerId: string | null;
  speakerName: string;
  content: string;
  createdAt: string;
};

export type DirectorNote = {
  id: string;
  roomId: string;
  /** 归属演员；null = 本房间通用（对所有在场演员生效） */
  characterId: string | null;
  text: string;
  /** 默认关闭：用户选的是「先存着，单独勾选要不要注入」 */
  enabled: boolean;
  createdAt: string;
};

export type DirectorRoom = {
  id: string;
  title: string;
  /** 主演：这条房间绑定的剧情角色 */
  primaryCharacterId: string;
  /** 在场演员（含主演） */
  participantIds: string[];
  /** 本次由谁开口 */
  activeSpeakerId: string;
  /** 每次把主演剧情里的最近多少条带进上下文 */
  contextTurns: number;
  createdAt: string;
  updatedAt: string;
};

export type DirectorState = {
  rooms: DirectorRoom[];
  messages: Record<string, DirectorMessage[]>;
  notes: DirectorNote[];
};

export const DEFAULT_DIRECTOR_CONTEXT_TURNS = 20;
export const DIRECTOR_CONTEXT_TURN_OPTIONS = [10, 20, 30, 50];

export function createEmptyDirectorState(): DirectorState {
  return { rooms: [], messages: {}, notes: [] };
}
