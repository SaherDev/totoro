import type { Location } from "../schemas/location.js";

/**
 * Chat request DTO — matches POST /v1/chat wire body.
 *
 * `user_id` is injected by NestJS from the Clerk token; the frontend
 * never supplies it. The frontend still references this type as the
 * shape of fixture inputs (it just ignores user_id).
 *
 * `location` is always present. The frontend attaches it in the
 * HttpClient layer from a session-only store. When the user denied
 * geolocation or the API is unavailable, the value is explicitly `null`.
 *
 * `signal_tier` is an optional hint forwarded from GET /v1/user/context
 * (ADR-061). The AI service uses it for tier-aware consult behavior.
 * When omitted/null, the AI service defaults to "active".
 */
export interface ChatRequestDto {
  user_id: string;
  message: string;
  location: Location | null;
  signal_tier?: SignalTier | null;
}

export type ClientIntent = "consult" | "recall" | "save" | "assistant";

export interface ReasoningStep {
  step: string;
  summary: string;
  source?: "tool" | "agent" | "fallback";
  tool_name?: "recall" | "save" | "consult" | null;
  visibility?: "user" | "debug";
  duration_ms?: number;
  timestamp?: string;
}

// ── Unified place shape (ADR-054) ────────────────────────────────────────────

export type PlaceType =
  | "food_and_drink"
  | "things_to_do"
  | "shopping"
  | "services"
  | "accommodation";

export type PlaceSource =
  | "tiktok"
  | "instagram"
  | "youtube"
  | "manual"
  | "link"
  | "consult";

export interface PlaceLocationContext {
  neighborhood: string | null;
  city: string | null;
  country: string | null;
}

export interface PlaceAttributes {
  cuisine: string | null;
  price_hint: string | null;
  ambiance: string | null;
  dietary: string[];
  good_for: string[];
  location_context: PlaceLocationContext | null;
}

export interface PlaceHours {
  sunday?: string | null;
  monday?: string | null;
  tuesday?: string | null;
  wednesday?: string | null;
  thursday?: string | null;
  friday?: string | null;
  saturday?: string | null;
  timezone: string;
}

/**
 * Unified place object returned by every read and write path (ADR-054).
 * Tier 1 fields from PostgreSQL are always present; Tier 2 (Redis geo) and
 * Tier 3 (Redis enrichment) populate only when `enrich_batch` ran.
 */
export interface PlaceObject {
  // Tier 1 — always present
  place_id: string;
  place_name: string;
  place_type: PlaceType;
  subcategory: string | null;
  tags: string[];
  attributes: PlaceAttributes;
  source_url: string | null;
  source: PlaceSource | null;
  provider_id: string | null;
  created_at: string | null;

  // Tier 2 — Redis geo cache
  lat: number | null;
  lng: number | null;
  address: string | null;
  geo_fresh: boolean;

  // Tier 3 — Redis enrichment
  hours: PlaceHours | null;
  rating: number | null;
  phone: string | null;
  photo_url: string | null;
  popularity: number | null;
  enriched: boolean;
}

// ── Consult (POST /v1/chat, type="consult") ──────────────────────────────────

export type ConsultResultSource = "saved" | "discovered" | "suggested";

export interface ConsultResult {
  place: PlaceObject;
  source: ConsultResultSource;
}

export interface ConsultResponseData {
  recommendation_id: string | null;
  results: ConsultResult[];
  reasoning_steps: ReasoningStep[];
}

// ── Recall (POST /v1/chat, type="recall") ────────────────────────────────────

export type RecallMatchReason =
  | "filter"
  | "semantic"
  | "keyword"
  | "semantic + keyword";

export type RecallScoreType = "rrf" | "ts_rank";

export interface RecallResult {
  place: PlaceObject;
  match_reason: RecallMatchReason;
  relevance_score: number | null;
  score_type: RecallScoreType | null;
}

export interface RecallResponseData {
  results: RecallResult[];
  total_count: number;
  empty_state: boolean;
}

// ── Extract place (POST /v1/chat, type="extract-place") ──────────────────────

export type ExtractPlaceStatus =
  | "saved"
  | "needs_review"
  | "duplicate"
  | "pending"
  | "failed";

export interface ExtractPlaceItem {
  place: PlaceObject | null;
  confidence: number | null;
  status: ExtractPlaceStatus;
}

export interface ExtractPlaceData {
  results: ExtractPlaceItem[];
  source_url: string | null;
  request_id: string | null;
}

// ── Local UI/storage types (not on the wire) ─────────────────────────────────

export interface SavedPlaceStub {
  place_id: string;
  place_name: string;
  address: string;
  saved_at: string;
  source_url: string | null;
  thumbnail_url?: string;
}

export interface SaveSheetPlace {
  name: string;
  source: string;
  location: string;
  thumbnail_url?: string;
}

// ── Auth & plan types (016-gateway-rate-limit) ───────────────────────────────

export type PlanTier = "homebody" | "explorer" | "local_legend";

export interface AuthUser {
  id: string;
  ai_enabled: boolean;
  plan?: PlanTier;
}

// Signal types
export type SignalType =
  | "recommendation_accepted"
  | "recommendation_rejected"
  | "chip_confirm";

// Chip types
export type ChipStatus = "pending" | "confirmed" | "rejected";

export interface ChipItem {
  label: string;
  source_field: string;
  source_value: string;
  signal_count: number;
  query?: string;
  status: ChipStatus;
  selection_round: string | null;
}

// Signal request variants
export interface SignalRequestAccepted {
  signal_type: "recommendation_accepted";
  recommendation_id: string;
  place_id: string;
  metadata?: Record<string, unknown>;
}

export interface SignalRequestRejected {
  signal_type: "recommendation_rejected";
  recommendation_id: string;
  place_id: string;
  metadata?: Record<string, unknown>;
}

export interface SignalRequestChipConfirm {
  signal_type: "chip_confirm";
  metadata: {
    chips: ChipItem[];
  };
}

export type SignalRequest =
  | SignalRequestAccepted
  | SignalRequestRejected
  | SignalRequestChipConfirm;

export type SignalRequestWithUser = SignalRequest & { user_id: string };

export interface SignalResponse {
  status: string;
}

// User context
export type SignalTier = "cold" | "warming" | "chip_selection" | "active";

export interface UserContextResponse {
  saved_places_count: number;
  signal_tier: SignalTier;
  chips: ChipItem[];
}
