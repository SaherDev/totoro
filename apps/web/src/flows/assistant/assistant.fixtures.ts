import type { ChatRequestDto, ChatResponseDto } from '@totoro/shared';

export async function assistantFixture(req: ChatRequestDto): Promise<ChatResponseDto> {
  const { message } = req;

  // Clarification fixture
  if (message === 'clarify me') {
    return {
      type: 'clarification',
      message: 'Could you add a cuisine or area so I can narrow it down?',
      data: null,
    };
  }

  // Fall-through: all other messages → assistant reply
  return {
    type: 'assistant',
    message: "I'm not sure how to help with that yet — try asking for a place or pasting a link.",
    data: null,
  };
}
