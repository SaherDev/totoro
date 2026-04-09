/**
 * Chat request DTO for unified AI gateway
 * Handles extract-place, consult, recall, and general queries
 */
export interface ChatRequestDto {
  user_id: string;
  message: string;
  location?: { lat: number; lng: number };
}

/**
 * Chat response DTO for unified AI gateway
 * Type discriminates between different response kinds
 */
export interface ChatResponseDto {
  type: 'extract-place' | 'consult' | 'recall' | 'assistant' | 'clarification' | 'error';
  message: string;
  data: Record<string, unknown> | null;
}
