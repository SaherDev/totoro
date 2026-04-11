import { z } from 'zod';
import type { FlowDefinition, FlowId } from './flow-definition';
import type { ChatResponseType, ClientIntent } from '@totoro/shared';
import { consultFlow } from './consult';

function stubFlow(id: FlowId, responseType: ChatResponseType, clientIntent?: ClientIntent): FlowDefinition {
  return {
    id,
    matches: { responseType, ...(clientIntent ? { clientIntent } : {}) },
    phase: 'idle',
    inputPlaceholderKey: 'home.idle.placeholder',
    schema: z.unknown(),
    fixture: async () => ({ type: responseType, message: '', data: null }),
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- stub replaced when flow is registered in its sub-plan
    onResponse: () => {},
    Component: () => null,
  };
}

// Registry is populated incrementally per sub-plan.
// consult is fully implemented (T032). Others are stubs until their sub-plans.
// The `satisfies` constraint ensures every FlowId is present at compile time.
export const FLOW_REGISTRY = {
  consult: consultFlow,
  recall: stubFlow('recall', 'recall', 'recall'),
  save: stubFlow('save', 'extract-place', 'save'),
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
