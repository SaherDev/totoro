import { Injectable } from '@nestjs/common';

interface UserRateLimitState {
  sessions: { count: number; date: string };
  toolCalls: { count: number; date: string };
  turns: number;
}

export interface PlanThresholds {
  sessions_per_day: number;
  tool_calls_per_day: number;
  turns_per_session: number;
}

export type RateLimitCounterName =
  | 'sessions_per_day'
  | 'tool_calls_per_day'
  | 'turns_per_session';

export interface RateLimitBreach {
  limit: RateLimitCounterName;
  limit_value: number;
}

@Injectable()
export class RateLimitService {
  private readonly state = new Map<string, UserRateLimitState>();

  private getTodayUtc(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private resetIfNewDay(counter: { count: number; date: string }): void {
    const today = this.getTodayUtc();
    if (counter.date !== today) {
      counter.count = 0;
      counter.date = today;
    }
  }

  private getOrCreate(userId: string): UserRateLimitState {
    if (!this.state.has(userId)) {
      const today = this.getTodayUtc();
      this.state.set(userId, {
        sessions: { count: 0, date: today },
        toolCalls: { count: 0, date: today },
        turns: 0,
      });
    }
    return this.state.get(userId)!;
  }

  check(userId: string, thresholds: PlanThresholds): RateLimitBreach | null {
    const s = this.getOrCreate(userId);

    this.resetIfNewDay(s.toolCalls);
    if (s.toolCalls.count >= thresholds.tool_calls_per_day) {
      return { limit: 'tool_calls_per_day', limit_value: thresholds.tool_calls_per_day };
    }

    if (s.turns >= thresholds.turns_per_session) {
      return { limit: 'turns_per_session', limit_value: thresholds.turns_per_session };
    }

    this.resetIfNewDay(s.sessions);
    if (s.sessions.count >= thresholds.sessions_per_day) {
      return { limit: 'sessions_per_day', limit_value: thresholds.sessions_per_day };
    }

    return null;
  }

  incrementTurns(userId: string): void {
    const s = this.getOrCreate(userId);
    s.turns += 1;
  }

  onSessionStarted(userId: string): void {
    const s = this.getOrCreate(userId);
    this.resetIfNewDay(s.sessions);
    s.sessions.count += 1;
    s.turns = 1;
  }

  addToolCalls(userId: string, n: number): void {
    const s = this.getOrCreate(userId);
    this.resetIfNewDay(s.toolCalls);
    s.toolCalls.count += n;
  }

  resetTurns(userId: string): void {
    const s = this.getOrCreate(userId);
    s.turns = 0;
  }
}
