import { z } from 'zod';
import type { FlowDefinition, FlowId } from './flow-definition';
import type { ChatResponseType, ClientIntent } from '@totoro/shared';
import { consultFlow } from './consult';
import { saveFlow } from './save';
import { recallFlow } from './recall';

function stubFlow(id: FlowId, responseType: ChatResponseType, clientIntent?: ClientIntent): FlowDefinition {
  return {
    id,
    matches: { responseType, ...(clientIntent ? { clientIntent } : {}) },
    phase: 'thinking',
    inputPlaceholderKey: 'chat.placeholder',
    schema: z.unknown(),
    fixture: async () => ({ type: responseType, message: '', data: null, tool_calls_used: 0 }),
    onResponse: (res, store) => {
      // Generic fallback: push the message to the thread if the API returned one
      if (res.message) store.pushMessage(res.message);
    },
    Component: () => null,
  };
}

// Registry is populated incrementally per sub-plan.
// consult is fully implemented (T032). Others are stubs until their sub-plans.
// The `satisfies` constraint ensures every FlowId is present at compile time.
export const FLOW_REGISTRY = {
  consult: consultFlow,
  recall: recallFlow,
  save: saveFlow,
  assistant: stubFlow('assistant', 'assistant', 'assistant'),
  clarification: stubFlow('clarification', 'clarification'),
} as const satisfies Record<FlowId, FlowDefinition>;

export const FLOW_BY_RESPONSE_TYPE: Record<ChatResponseType, FlowDefinition> = {
  consult: FLOW_REGISTRY.consult,
  recall: FLOW_REGISTRY.recall,
  'extract-place': FLOW_REGISTRY.save,
  assistant: FLOW_REGISTRY.assistant,
  clarification: FLOW_REGISTRY.clarification,
  error: stubFlow('clarification', 'error'),
};

export const FLOW_BY_CLIENT_INTENT: Partial<Record<ClientIntent, FlowDefinition>> = {
  consult: FLOW_REGISTRY.consult,
  recall: FLOW_REGISTRY.recall,
  save: FLOW_REGISTRY.save,
  assistant: FLOW_REGISTRY.assistant,
};
