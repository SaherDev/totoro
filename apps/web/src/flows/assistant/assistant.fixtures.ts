import type { ChatResponseDto } from '@totoro/shared';
import type { ChatClientOptions } from '../../lib/chat-client';

export async function assistantFixture(req: ChatClientOptions): Promise<ChatResponseDto> {
  const { message } = req;

  // Clarification fixture
  if (message === 'clarify me') {
    return {
      type: 'clarification',
      message: 'Could you add a cuisine or area so I can narrow it down?',
      data: null,
      tool_calls_used: 0,
    };
  }

  // Fall-through: all other messages → assistant reply
  return {
    type: 'assistant',
    message: "I'm not sure how to help with that yet — try asking for a place or pasting a link.",
    data: null,
    tool_calls_used: 0,
  };
}
