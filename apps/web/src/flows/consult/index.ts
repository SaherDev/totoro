import type { ConsultResponseData } from '@totoro/shared';
import type { FlowDefinition } from '../flow-definition';
import type { HomeStoreApi } from '@/store/home-store';
import { ConsultResponseDataSchema } from './consult.schema';
import { consultFixture } from './consult.fixtures';
import { ConsultDispatcher } from './ConsultDispatcher';

export const consultFlow: FlowDefinition<ConsultResponseData> = {
  id: 'consult',
  matches: { clientIntent: 'consult', responseType: 'consult' },
  phase: 'thinking',
  inputPlaceholderKey: 'consult.placeholder',
  schema: ConsultResponseDataSchema,
  fixture: consultFixture,
  onResponse: (res, store: HomeStoreApi) => {
    store.setPendingResult(res.data as ConsultResponseData);
    store.tryRevealResult();
  },
  Component: ConsultDispatcher,
};
