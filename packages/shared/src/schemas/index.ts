/**
 * @see docs/05_AI_파이프라인_v0.1.md
 * @see docs/03_Firestore_스키마_v0.1.md
 */
import { z } from 'zod';

// ─── 공통 열거형 스키마 ───────────────────────────────────────────
export const TrackSchema = z.enum(['LIFE', 'WORK']);
export const PrioritySchema = z.enum(['URGENT', 'HIGH', 'NORMAL', 'LOW', 'SOMEDAY']);
export const StatusSchema = z.enum(['CONFIRMED', 'IN_PROGRESS', 'DONE', 'CANCELED']);
export const EntityTypeSchema = z.enum(['TASK', 'PERSON', 'EVENT']);
export const UserTierSchema = z.enum(['FREE', 'BASIC', 'PRO', 'ENT']);
export const LanguageSchema = z.enum(['ko', 'en', 'ja']);
export const EmotionSchema = z.enum(['positive', 'negative', 'neutral', 'stressed', 'excited', 'worried']);

// ─── AI 출력 스키마 (Zod) ─────────────────────────────────────────
// classifyInput 출력
export const ClassifyOutputSchema = z.object({
  track: TrackSchema,
  entityType: EntityTypeSchema,
  language: LanguageSchema,
  confidence: z.number().min(0).max(1),
});
export type ClassifyOutput = z.infer<typeof ClassifyOutputSchema>;

// extractEntities 출력
export const ExtractEntitiesOutputSchema = z.object({
  entities: z.array(z.object({
    type: EntityTypeSchema,
    text: z.string(),
    normalized: z.string().optional(),
  })),
  keywords: z.array(z.string()),
});
export type ExtractEntitiesOutput = z.infer<typeof ExtractEntitiesOutputSchema>;

// classifyPriority 출력
export const ClassifyPriorityOutputSchema = z.object({
  priority: PrioritySchema,
  reasoning: z.string().optional(),
});
export type ClassifyPriorityOutput = z.infer<typeof ClassifyPriorityOutputSchema>;

// extractEmotion 출력
export const ExtractEmotionOutputSchema = z.object({
  emotion: EmotionSchema,
  confidence: z.number().min(0).max(1),
});
export type ExtractEmotionOutput = z.infer<typeof ExtractEmotionOutputSchema>;

// draftGeneration 출력
export const DraftGenerationOutputSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().max(2000).optional(),
  dueDate: z.string().nullable().optional(),
  tags: z.array(z.string()).max(10),
  priority: PrioritySchema,
  personNames: z.array(z.string()).optional(),
});
export type DraftGenerationOutput = z.infer<typeof DraftGenerationOutputSchema>;

// mandalartSuggest 출력
export const MandalartSuggestOutputSchema = z.object({
  suggestions: z.array(z.object({
    title: z.string().min(1).max(50),
    description: z.string().max(200).optional(),
  })).min(1).max(8),
});
export type MandalartSuggestOutput = z.infer<typeof MandalartSuggestOutputSchema>;

// top3Recommendation 출력
export const Top3RecommendationOutputSchema = z.object({
  recommendations: z.array(z.object({
    taskId: z.string(),
    reasoning: z.string(),
    score: z.number().min(0).max(1),
  })).length(3),
});
export type Top3RecommendationOutput = z.infer<typeof Top3RecommendationOutputSchema>;

// dailyReport 출력
export const DailyReportOutputSchema = z.object({
  summary: z.string().max(500),
  completedCount: z.number(),
  pendingCount: z.number(),
  insights: z.array(z.string()).max(5),
  tomorrowSuggestions: z.array(z.string()).max(3),
});
export type DailyReportOutput = z.infer<typeof DailyReportOutputSchema>;

// ─── API 요청/응답 스키마 ─────────────────────────────────────────
// processTextInput 요청
export const ProcessTextInputRequestSchema = z.object({
  text: z.string().min(1).max(5000),
  mode: z.enum(['LIFE', 'WORK']),
  timezone: z.string().default('Asia/Seoul'),
});
export type ProcessTextInputRequest = z.infer<typeof ProcessTextInputRequestSchema>;

// processVoiceInput 요청
export const ProcessVoiceInputRequestSchema = z.object({
  audioUrl: z.string().url(),
  audioDurationSec: z.number().positive().max(300),
  mode: z.enum(['LIFE', 'WORK']),
  timezone: z.string().default('Asia/Seoul'),
});
export type ProcessVoiceInputRequest = z.infer<typeof ProcessVoiceInputRequestSchema>;

// updateDraft 요청
export const UpdateDraftRequestSchema = z.object({
  draftId: z.string(),
  title: z.string().min(1).max(100).optional(),
  body: z.string().max(2000).optional(),
  priority: PrioritySchema.optional(),
  dueDate: z.string().nullable().optional(),
  tags: z.array(z.string()).max(10).optional(),
  track: TrackSchema.optional(),
  entityType: EntityTypeSchema.optional(),
  projectId: z.string().nullable().optional(),
  personIds: z.array(z.string()).optional(),
});
export type UpdateDraftRequest = z.infer<typeof UpdateDraftRequestSchema>;

// confirmDraft 요청
export const ConfirmDraftRequestSchema = z.object({
  draftId: z.string(),
});
export type ConfirmDraftRequest = z.infer<typeof ConfirmDraftRequestSchema>;

// bulkConfirmDrafts 요청
export const BulkConfirmDraftsRequestSchema = z.object({
  draftIds: z.array(z.string()).min(1).max(50),
});
export type BulkConfirmDraftsRequest = z.infer<typeof BulkConfirmDraftsRequestSchema>;

// suggestMandalartSections 요청
export const SuggestMandalartSectionsRequestSchema = z.object({
  projectId: z.string(),
  centralTheme: z.string().min(1).max(100),
  language: LanguageSchema.optional(),
});
export type SuggestMandalartSectionsRequest = z.infer<typeof SuggestMandalartSectionsRequestSchema>;

// connectGoogleCalendar 요청
export const ConnectGoogleCalendarRequestSchema = z.object({
  authCode: z.string(),
  redirectUri: z.string().url(),
});
export type ConnectGoogleCalendarRequest = z.infer<typeof ConnectGoogleCalendarRequestSchema>;
