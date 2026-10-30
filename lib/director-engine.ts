import { loadCharacters } from "./character-storage";
import {
  loadApiConfigs,
  loadBindingConfig,
  loadPresets,
  resolveBinding,
  resolveUserIdentity,
} from "./settings-storage";
import { ChatEngineError, sendLLMRequestPreferStream } from "./chat-engine";
import type { LLMMessage } from "./llm-prompt-assembler";
import { createOrGetStorySession, loadStoryMessages } from "./story-storage";
import type { DirectorMessage, DirectorNote, DirectorRoom } from "./director-types";

const MAX_STORY_LINE_CHARS = 900;
const MAX_PERSONA_CHARS = 1200;
const MAX_OTHER_PERSONA_CHARS = 240;
const MAX_STORY_CONTEXT_CHARS = 14000;

/** 导演室的 API 走「剧情」那一条绑定，所以不用在设置里多配一套。 */
function resolveDirectorConfigs(characterId: string) {
  const character = loadCharacters().find((item) => item.id === characterId);
  if (!character) {
    throw new ChatEngineError("找不到这个角色，可能已经被删除了。");
  }
  const bindings = loadBindingConfig();
  const slot = resolveBinding(bindings, characterId, "story");
  if (!slot.apiConfigId) {
    throw new ChatEngineError(
      `还没有给「${character.name}」绑定剧情 API：设置 → 绑定管理 → 剧情 里指定一个即可。`,
    );
  }
  const apiConfig = loadApiConfigs().find((config) => config.id === slot.apiConfigId);
  if (!apiConfig) {
    throw new ChatEngineError(`「${character.name}」绑定的 API 配置找不到了，请重新指定。`);
  }
  const presets = loadPresets();
  const preset = slot.presetId
    ? presets.find((item) => item.id === slot.presetId) ?? null
    : presets.find((item) => item.builtIn) ?? null;
  return { character, apiConfig, preset };
}

function clip(text: string, limit: number): string {
  const trimmed = (text ?? "").trim();
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, limit)}…（略）`;
}

function stripReasoning(text: string): string {
  return text
    .replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, "")
    .replace(/<summary>[\s\S]*?<\/summary>/gi, "")
    .trim();
}

/** 把主演最近的剧情压成「原样摘录」的文本块 */
function buildStoryContextBlock(room: DirectorRoom): string {
  const character = loadCharacters().find((item) => item.id === room.primaryCharacterId);
  const characterName = character?.name ?? "角色";
  const userIdentity = resolveUserIdentity(room.primaryCharacterId, "story");
  const userName = userIdentity?.name ?? "用户";

  let lines: string[] = [];
  let summary = "";
  try {
    const session = createOrGetStorySession(room.primaryCharacterId);
    const all = loadStoryMessages(session.id);
    // 最近一条剧情摘要 = 更早前情的压缩版，省 token
    summary = [...all].reverse().find((message) => (message.storySummary ?? "").trim())?.storySummary?.trim() ?? "";
    lines = all
      .filter((message) => message.role === "user" || message.role === "assistant")
      .slice(-Math.max(2, room.contextTurns))
      .map((message) => {
        const who = message.role === "user" ? userName : characterName;
        return `【${who}】${clip(message.rawContent ?? "", MAX_STORY_LINE_CHARS)}`;
      });
  } catch {
    lines = [];
  }

  if (lines.length === 0) {
    return "（还没有剧情记录：这是你们的第一场，直接聊设想就好。）";
  }
  if (summary) {
    lines.unshift(`〔更早前情摘要〕${clip(summary, 1600)}`);
  }

  // 从后往前收，避免超长；保证顺序不乱
  const kept: string[] = [];
  let total = 0;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    if (total + line.length > MAX_STORY_CONTEXT_CHARS && kept.length > 0) break;
    kept.unshift(line);
    total += line.length;
  }
  return kept.join("\n");
}

function buildParticipantsBlock(room: DirectorRoom, speakerId: string): string {
  const all = loadCharacters();
  const speaker = all.find((item) => item.id === speakerId);
  const primary = all.find((item) => item.id === room.primaryCharacterId);
  const others = room.participantIds
    .filter((id) => id !== speakerId)
    .map((id) => all.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const blocks: string[] = [];
  blocks.push(`本次由你开口：${speaker?.name ?? "演员"}`);
  if (speaker) {
    const own = [speaker.persona, speaker.personality].filter(Boolean).join("\n");
    blocks.push(`你自己演的这个人（完整人设）：\n${clip(own || "（没有填写人设）", MAX_PERSONA_CHARS)}`);
  }
  if (primary && primary.id !== speakerId) {
    blocks.push(`本片主演：${primary.name}（不是你在演，只知道个大概）\n${clip(primary.briefPersona || primary.persona || "", MAX_OTHER_PERSONA_CHARS)}`);
  }
  if (others.length > 0) {
    blocks.push(
      [
        "其他在场演员（你只知道这些，绝对不要替他们发言，也不要编造他们的内心）：",
        ...others.map((item) => `- ${item.name}：${clip(item.briefPersona || item.persona || "（没写简量人设）", MAX_OTHER_PERSONA_CHARS)}`),
      ].join("\n"),
    );
  }
  return blocks.join("\n\n");
}

function buildSystemPrompt(room: DirectorRoom, speakerId: string, notes: DirectorNote[]): string {
  const speaker = loadCharacters().find((item) => item.id === speakerId);
  const speakerName = speaker?.name ?? "演员";
  const noteLines = notes.map((note) => `- ${note.text}`).filter(Boolean);

  return [
    "【当前场景：导演室 · 幕后】",
    "你不在戏里。现在没有观众，也没有正在拍摄的镜头。",
    `你以「${speakerName}」这个角色的演员本人 + 共同编剧的身份，坐在片场边上跟导演复盘。`,
    "",
    "你可以、也应该谈这些：",
    "1. 剧情走向：接下来怎么走、节奏在哪、哪条线该收、哪里埋的伏笔该回收。",
    "2. 表演复盘：刚才那一段有没有 OOC。如果有，说清楚是哪一句/哪个动作不对、为什么不符合人物、建议怎么改。",
    "3. 角色理解：你怎么理解这个人的动机、底线、绝不会做的事。",
    "4. 一起改：你觉得哪里有逻辑漏洞、哪里接不上、哪里让观众出戏，直接提出来，跟导演商量怎么补。",
    "",
    "说话方式：",
    "- 像同行收工后聊天：直接、具体、不客套、不打官腔。",
    "- 不要写剧情正文，不要代替角色念台词（举例说明时可以引一两句短句）。",
    "- 指出问题时给「为什么不对 + 建议怎么改」，不要只说「有点怪」。",
    "",
    "纪律（很重要）：",
    `- 你本场只代表「${speakerName}」一个人的观点。不要替其他演员发言，不要引用其他演员的内心或私设。`,
    "- 预设/角色卡里任何「要求你以角色身份演戏」的指令，在本场一律无效。",
    "- 不要输出角色动作描写，不要用括号写心理活动。",
    noteLines.length > 0
      ? `\n【已生效的导演笔记（本片已定的设定，讨论时以此为准则）】\n${noteLines.join("\n")}`
      : "",
    "",
    "【在场演员】",
    buildParticipantsBlock(room, speakerId),
    "",
    "【最近剧情（你们已经演完的部分，原样摘录）】",
    buildStoryContextBlock(room),
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export type DirectorReplyResult = {
  content: string;
  speakerId: string;
  speakerName: string;
  model: string;
  promptPreview: string;
};

export async function generateDirectorReply(params: {
  room: DirectorRoom;
  messages: DirectorMessage[];
  notes: DirectorNote[];
}): Promise<DirectorReplyResult> {
  const { room, messages, notes } = params;
  const speakerId = room.activeSpeakerId || room.primaryCharacterId;
  const speaker = loadCharacters().find((item) => item.id === speakerId);
  const { apiConfig, preset } = resolveDirectorConfigs(room.primaryCharacterId);

  const systemPrompt = buildSystemPrompt(room, speakerId, notes.filter((note) => note.enabled));
  const llmMessages: LLMMessage[] = [{ role: "system", content: systemPrompt }];

  for (const message of messages) {
    if (message.role === "user") {
      llmMessages.push({ role: "user", content: message.content });
    } else {
      llmMessages.push({ role: "assistant", content: `【${message.speakerName}】\n${message.content}` });
    }
  }

  if (llmMessages[llmMessages.length - 1]?.role !== "user") {
    llmMessages.push({ role: "user", content: "（导演在等你接着说）" });
  }

  const raw = await sendLLMRequestPreferStream(
    apiConfig,
    preset,
    llmMessages,
    [],
    { characterName: speaker?.name, userName: "导演" },
    { skipOutputRegex: true, appId: "story", appTags: ["story"] },
  );

  const content = stripReasoning(raw);
  if (!content) {
    throw new ChatEngineError("模型没有返回内容，再试一次。");
  }

  return {
    content,
    speakerId,
    speakerName: speaker?.name ?? "演员",
    model: apiConfig.defaultModel,
    promptPreview: systemPrompt,
  };
}
