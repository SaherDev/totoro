import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitService, PlanThresholds } from './rate-limit.service';

const THRESHOLDS: PlanThresholds = {
  sessions_per_day: 3,
  tool_calls_per_day: 30,
  turns_per_session: 10,
};

describe('RateLimitService', () => {
  let service: RateLimitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RateLimitService],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);
  });

  it('check() returns null when all counters are under threshold', () => {
    expect(service.check('user1', THRESHOLDS)).toBeNull();
  });

  it('check() returns tool_calls_per_day breach when toolCalls.count equals threshold', () => {
    for (let i = 0; i < 30; i++) service.addToolCalls('user2', 1);
    const breach = service.check('user2', THRESHOLDS);
    expect(breach).toEqual({ limit: 'tool_calls_per_day', limit_value: 30 });
  });

  it('check() returns turns_per_session breach when turns equals threshold', () => {
    for (let i = 0; i < 10; i++) service.incrementTurns('user3');
    const breach = service.check('user3', THRESHOLDS);
    expect(breach).toEqual({ limit: 'turns_per_session', limit_value: 10 });
  });

  it('check() returns sessions_per_day breach when sessions.count equals threshold', () => {
    service.onSessionStarted('user4');
    service.onSessionStarted('user4');
    service.onSessionStarted('user4');
    const breach = service.check('user4', THRESHOLDS);
    expect(breach).toEqual({ limit: 'sessions_per_day', limit_value: 3 });
  });

  it('check() tests tool_calls before turns before sessions', () => {
    // Set all three at threshold
    for (let i = 0; i < 30; i++) service.addToolCalls('user5', 1);
    for (let i = 0; i < 10; i++) service.incrementTurns('user5');
    service.onSessionStarted('user5');
    service.onSessionStarted('user5');
    service.onSessionStarted('user5');

    const breach = service.check('user5', THRESHOLDS);
    // tool_calls checked first
    expect(breach?.limit).toBe('tool_calls_per_day');
  });

  it('check() resets daily counter when stored date is yesterday UTC', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // Manually set toolCalls to yesterday with count at threshold
    service.addToolCalls('user6', 30);
    // Access internal state to backdate
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = (service as any).state.get('user6');
    state.toolCalls.date = yesterday;
    state.sessions.date = yesterday;

    // check() should reset the stale counter → no breach
    const breach = service.check('user6', THRESHOLDS);
    expect(breach).toBeNull();
  });

  it('onSessionStarted() increments sessions and sets turns to 1', () => {
    service.incrementTurns('user7');
    service.incrementTurns('user7');
    service.onSessionStarted('user7');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = (service as any).state.get('user7');
    expect(state.sessions.count).toBe(1);
    expect(state.turns).toBe(1);
  });

  it('resetTurns() sets turns to 0 without changing sessions or toolCalls', () => {
    service.onSessionStarted('user8');
    service.addToolCalls('user8', 5);
    service.incrementTurns('user8');
    service.incrementTurns('user8');

    service.resetTurns('user8');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = (service as any).state.get('user8');
    expect(state.turns).toBe(0);
    expect(state.sessions.count).toBe(1);
    expect(state.toolCalls.count).toBe(5);
  });
});
