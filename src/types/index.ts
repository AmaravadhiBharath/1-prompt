// Core types for the 1prompt extension

export interface ScrapedPrompt {
  content: string;
  index: number;
  timestamp?: number;
  conversationId?: string;
  source?: "dom" | "keylog" | "network";
}

export interface ExtractionResult {
  platform: string;
  url: string;
  title: string;
  prompts: ScrapedPrompt[];
  extractedAt: number;
  conversationId?: string;
  summary?: string;
  model?: string;
  provider?: string;
}

export interface SummaryResult {
  original: ScrapedPrompt[];
  summary: string;
  promptCount: {
    before: number;
    after: number;
  };
  provider?: string;
  model?: string;
  usage?: any;
}

export interface HistoryItem {
  id: string;
  platform: string;
  promptCount: number;
  mode: Mode;
  timestamp: number;
  prompts: ScrapedPrompt[];
  preview: string;
  summary?: string;
  model?: string;
  provider?: string;
  duration?: number;
  isPinned?: boolean;
}

export type Mode = "capture" | "compile";

export interface PlatformAdapter {
  name: string;
  detect(): boolean;
  scrapePrompts(): ScrapedPrompt[];
  scrape(): Promise<ScrapedPrompt[]>;
  getScrollContainer(): HTMLElement | null;
}

// Message types for communication between content script, service worker, and side panel
export type MessageAction =
  | "EXTRACT_PROMPTS"
  | "EXTRACTION_RESULT"
  | "EXTRACTION_FROM_PAGE"
  | "EXTRACTION_FROM_PAGE_RESULT"
  | "SUMMARIZE_PROMPTS"
  | "SUMMARY_RESULT"
  | "GET_STATUS"
  | "STATUS_RESULT"
  | "TOGGLE_BUTTONS"
  | "CONTENT_COPIED"
  | "SAVE_SESSION_PROMPTS"
  | "GET_CONVERSATION_LOGS"
  | "OPEN_SIDE_PANEL"
  | "EXTRACT_TRIGERED_FROM_PAGE"
  | "CHECK_SIDEPANEL_OPEN"
  | "SIDEPANEL_OPENED"
  | "COPY_TEXT"
  | "ERROR"
  | "RE_SUMMARIZE";

export interface ExtractMessage {
  action: "EXTRACT_PROMPTS";
  mode: Mode;
  extractionSource?: "auto" | "dom" | "keylog";
}

export interface ExtractionResultMessage {
  action: "EXTRACTION_RESULT";
  result: ExtractionResult;
  mode?: Mode;
}

export interface SummarizeMessage {
  action: "SUMMARIZE_PROMPTS";
  prompts: ScrapedPrompt[];
}

export interface SummaryResultMessage {
  action: "SUMMARY_RESULT";
  result: SummaryResult;
}

export interface SetUserIdMessage {
  action: "SET_USER_ID";
  userId?: string;
}

export interface SyncPromptToCloudMessage {
  action: "SYNC_PROMPT_TO_CLOUD";
  prompt: ScrapedPrompt;
  platform: string;
}

export interface SyncPromptsToCloudMessage {
  action: "SYNC_PROMPTS_TO_CLOUD";
  prompts: ScrapedPrompt[];
  platform: string;
}

export interface GetSyncStatusMessage {
  action: "GET_SYNC_STATUS";
}

export interface ErrorMessage {
  action: "ERROR";
  error: string;
}

export interface StatusMessage {
  action: "GET_STATUS";
}

export interface StatusResultMessage {
  action: "STATUS_RESULT";
  supported: boolean;
  platform: string | null;
  hasPrompts?: boolean;
}

export interface ExtractionFromPageMessage {
  action: "EXTRACTION_FROM_PAGE";
  result: ExtractionResult;
  mode: Mode;
}

export interface ExtractionFromPageResultMessage {
  action: "EXTRACTION_FROM_PAGE_RESULT";
  result: ExtractionResult;
  mode: Mode;
}

export interface ToggleButtonsMessage {
  action: "TOGGLE_BUTTONS";
  visible: boolean;
}

export interface SaveSessionPromptsMessage {
  action: "SAVE_SESSION_PROMPTS";
  prompts: ScrapedPrompt[];
  platform: string;
}

export interface GetConversationLogsMessage {
  action: "GET_CONVERSATION_LOGS";
  platform: string;
  conversationId: string;
}

export interface OpenSidePanelMessage {
  action: "OPEN_SIDE_PANEL";
}

export interface ExtractTriggeredFromPageMessage {
  action: "EXTRACT_TRIGERED_FROM_PAGE";
  mode?: Mode;
}

export interface CheckSidePanelOpenMessage {
  action: "CHECK_SIDEPANEL_OPEN";
}

export interface SidePanelOpenedMessage {
  action: "SIDEPANEL_OPENED";
}

export interface CopyTextMessage {
  action: "COPY_TEXT";
  text: string;
}

export type Message =
  | ExtractMessage
  | ExtractionResultMessage
  | ExtractionFromPageMessage
  | ExtractionFromPageResultMessage
  | SummarizeMessage
  | SummaryResultMessage
  | SetUserIdMessage
  | SyncPromptToCloudMessage
  | SyncPromptsToCloudMessage
  | GetSyncStatusMessage
  | ErrorMessage
  | StatusMessage
  | StatusResultMessage
  | ToggleButtonsMessage
  | SaveSessionPromptsMessage
  | GetConversationLogsMessage
  | OpenSidePanelMessage
  | ExtractTriggeredFromPageMessage
  | CheckSidePanelOpenMessage
  | SidePanelOpenedMessage
  | CopyTextMessage
  | { action: "RE_SUMMARIZE" };
