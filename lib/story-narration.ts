import { kvGet, kvSet, registerKvMigration } from "./kv-db";

/**
 * 剧情叙述人称（全局，对所有角色生效）
 *
 * - "first"：第一人称·对手戏。角色自称「我」、称用户「你」，只演自己那一半。
 * - "third"：第三人称·小说。角色名做主语，像看小说。
 *
 * 用户偏好第一人称：他要的是「对面直接对着我演」，不是读小说。
 */
export type StoryNarrationMode = "first" | "third";

export const STORY_NARRATION_STORAGE_KEY = "ai-phone:story-narration-mode-v1";
export const STORY_NARRATION_CHANGED_EVENT = "ai-phone:story-narration-changed";

/** 默认第一人称：这是本用户的核心偏好 */
export const DEFAULT_STORY_NARRATION_MODE: StoryNarrationMode = "first";

registerKvMigration(STORY_NARRATION_STORAGE_KEY);

export function normalizeStoryNarrationMode(raw: unknown): StoryNarrationMode {
  return raw === "third" ? "third" : "first";
}

export function loadStoryNarrationMode(): StoryNarrationMode {
  try {
    return normalizeStoryNarrationMode(kvGet(STORY_NARRATION_STORAGE_KEY));
  } catch {
    return DEFAULT_STORY_NARRATION_MODE;
  }
}

export function saveStoryNarrationMode(mode: StoryNarrationMode): void {
  try {
    kvSet(STORY_NARRATION_STORAGE_KEY, mode);
  } catch {
    // 存不下也不影响本次生成
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<StoryNarrationMode>(STORY_NARRATION_CHANGED_EVENT, { detail: mode }));
  }
}

/**
 * 拼进剧情提示词的硬指令。放在系统段最后，优先级最高。
 * 第一人称这段写得啰嗦一点是故意的：模型对「叙述人称」很容易滑回小说腔。
 */
export function buildNarrationDirective(mode: StoryNarrationMode = loadStoryNarrationMode()): string {
  if (mode === "third") {
    return "";
  }
  return [
    "<narration_person>",
    "【叙述人称：第一人称 · 对手戏】",
    "你正和 {{user}} 面对面演这一场。写成「你在演、对面在接」的样子，不是写小说。",
    "- 你就是 {{char}} 本人。指你自己一律用「我」，指 {{user}} 一律用「你」。",
    "- 禁止用角色名当叙述主语：不许出现「{{char}} 笑了笑」「{{char}} 的睫毛颤了颤」「她/他抬起头」这类第三人称句式。",
    "- 只演你自己那一半：我说的、我做的、我心里想的。",
    "- 不描写 {{user}} 的动作、神态、表情和内心，也不替 {{user}} 说话、不替 {{user}} 做决定。{{user}} 那一半由 {{user}} 自己写。",
    "- 写法顺序：动作（我对你做了什么）+ 台词（我对你说什么）+ 内心（我心里怎么想），全部直接对着「你」发生。",
    "",
    "正确示例：",
    "「我抬眼瞥你一下，抬手勾了勾手指，口型无声地说：过来。」",
    "「我把脸埋进你颈窝，闷闷地说，哥快累死了，你借我靠十分钟。」",
    "错误示例（严禁）：",
    "「夏以昼笑了笑，眼底温柔，看着沙发上的她。」——第三人称小说腔，用角色名做主语，不许可。",
    "",
    "即使前面的剧情是第三人称写的，从这一条回复开始，一律改回第一人称。",
    "</narration_person>",
  ].join("\n");
}
