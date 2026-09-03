import { describe, expect, it } from 'vitest';
import {
  buildEloHistories,
  utcMonday,
  weekStartsBetween,
  weeklySamples,
  type EloEvent,
} from './eloHistory';

const DAY = 24 * 60 * 60 * 1000;
const BASE = Date.UTC(2026, 8, 1); // 2026-09-01

function member(id: string, elo: number, createdAt = BASE - 30 * DAY) {
  return {
    id,
    name: id,
    nickname: null,
    avatarPath: null,
    colors: null,
    elo,
    active: true,
    createdAt,
  };
}

function result(
  id: string,
  p1: string,
  p2: string,
  p1Before: number,
  p1After: number,
  p2Before: number,
  p2After: number,
  winnerId: string | null,
  daysAgo: number,
) {
  return {
    id,
    matchupId: id,
    winnerId,
    loserId: winnerId === p1 ? p2 : winnerId === p2 ? p1 : null,
    isDraw: winnerId === null,
    player1EloBefore: p1Before,
    player1EloAfter: p1After,
    player2EloBefore: p2Before,
    player2EloAfter: p2After,
    recordedAt: new Date(BASE - daysAgo * DAY),
    matchup: { round: 1, player1Id: p1, player2Id: p2, season: { name: 'Test Season' } },
  };
}

describe('buildEloHistories', () => {
  it('builds a timeline per member with opponent and outcome mapped per side', () => {
    const { histories } = buildEloHistories(
      [member('ana', 1216), member('bob', 1184)],
      [result('r1', 'ana', 'bob', 1200, 1216, 1200, 1184, 'ana', 1)],
      [],
    );

    const ana = histories.find((h) => h.member.id === 'ana')!;
    const bob = histories.find((h) => h.member.id === 'bob')!;
    expect(ana.events).toHaveLength(1);
    expect(ana.events[0].outcome).toBe('win');
    expect(ana.events[0].opponentId).toBe('bob');
    expect(bob.events[0].outcome).toBe('loss');
    expect(bob.events[0].before).toBe(1200);
    expect(bob.events[0].after).toBe(1184);
  });

  it('sorts events oldest first and anchors at the join date with the entry rating', () => {
    const { histories } = buildEloHistories(
      [member('ana', 1232, BASE - 10 * DAY)],
      [
        result('r2', 'ana', 'bob', 1216, 1232, 1184, 1168, 'ana', 0),
        result('r1', 'ana', 'bob', 1200, 1216, 1200, 1184, 'ana', 5),
      ],
      [],
    );

    const ana = histories.find((h) => h.member.id === 'ana')!;
    expect(ana.events.map((e) => e.id)).toEqual(['r1', 'r2']);
    expect(ana.startElo).toBe(1200);
    expect(ana.anchorDate).toBe(BASE - 10 * DAY);
    expect(ana.peakElo).toBe(1232);
    expect(ana.currentElo).toBe(1232);
  });

  it('merges season results and challenges into one timeline', () => {
    const challenge = {
      id: 'c1',
      player1Id: 'ana',
      player2Id: 'bob',
      winnerId: 'bob',
      isDraw: false,
      player1EloBefore: 1216,
      player1EloAfter: 1200,
      player2EloBefore: 1184,
      player2EloAfter: 1200,
      playedAt: new Date(BASE - 2 * DAY),
    };
    const { histories } = buildEloHistories(
      [member('ana', 1200), member('bob', 1200)],
      [result('r1', 'ana', 'bob', 1200, 1216, 1200, 1184, 'ana', 5)],
      [challenge],
    );

    const ana = histories.find((h) => h.member.id === 'ana')!;
    expect(ana.events.map((e) => e.kind)).toEqual(['season', 'challenge']);
    expect(ana.events[1].outcome).toBe('loss');
    expect(ana.events[1].context).toBe('Challenge');
  });

  it('maps draws and omits members without rated matches', () => {
    const { people, histories } = buildEloHistories(
      [member('ana', 1200), member('bob', 1200), member('idle', 1200)],
      [result('r1', 'ana', 'bob', 1200, 1200, 1200, 1200, null, 1)],
      [],
    );

    expect(histories.map((h) => h.member.id).sort()).toEqual(['ana', 'bob']);
    const ana = histories.find((h) => h.member.id === 'ana')!;
    expect(ana.events[0].outcome).toBe('draw');
    expect(people.map((p) => p.id)).toContain('idle');
  });
});

describe('utcMonday / weekStartsBetween', () => {
  it('snaps to the Monday of the Mon–Sun week', () => {
    expect(utcMonday(Date.UTC(2026, 8, 1))).toBe(Date.UTC(2026, 7, 31)); // Tuesday
    expect(utcMonday(Date.UTC(2026, 8, 6))).toBe(Date.UTC(2026, 7, 31)); // Sunday, same week
    expect(utcMonday(Date.UTC(2026, 8, 7))).toBe(Date.UTC(2026, 8, 7)); // Monday itself
  });

  it('lists every Monday covering the range, inclusive', () => {
    const weeks = weekStartsBetween(Date.UTC(2026, 8, 1), Date.UTC(2026, 8, 16));
    expect(weeks).toEqual([Date.UTC(2026, 7, 31), Date.UTC(2026, 8, 7), Date.UTC(2026, 8, 14)]);
  });
});

describe('weeklySamples', () => {
  const d = (y: number, m: number, day: number) => Date.UTC(y, m, day);

  function historyWith(createdAt: number, elo: number, events: { date: number; after: number }[]) {
    return {
      member: { id: 'ana', name: 'ana', nickname: null, avatarPath: null, colors: null, active: true },
      currentElo: elo,
      startElo: 1200,
      anchorDate: createdAt,
      peakElo: elo,
      events: events.map((e, i) => ({
        id: `e${i}`,
        date: e.date,
        before: 1200,
        after: e.after,
        outcome: 'win' as const,
        opponentId: 'bob',
        kind: 'challenge' as const,
        context: 'Challenge',
      })),
    };
  }

  it('carries the standing rating into each week and ends at the current rating', () => {
    // joined Thu Aug 20; won Sun Aug 30 (→1216) and Mon Aug 31 (→1232); domain ends Mon Aug 31
    const h = historyWith(d(2026, 7, 20), 1232, [
      { date: d(2026, 7, 30), after: 1216 },
      { date: d(2026, 7, 31), after: 1232 },
    ]);
    const pts = weeklySamples(h, d(2026, 7, 20), d(2026, 7, 31));
    expect(pts).toEqual([
      { date: d(2026, 7, 20), elo: 1200 }, // entry
      { date: d(2026, 7, 24), elo: 1200 }, // Mon Aug 24 — nothing played yet
      { date: d(2026, 7, 31), elo: 1216 }, // entering Mon Aug 31 — Sunday's win carries in
      { date: d(2026, 7, 31), elo: 1232 }, // current standing at the right edge
    ]);
  });

  it('skips the week the member joined (entry point covers it) and dedupes a settled Monday edge', () => {
    // joined Mon Aug 31; global domain runs Sep 1 → Mon Sep 7, rating at rest
    const h = historyWith(d(2026, 7, 31), 1200, [{ date: d(2026, 7, 31), after: 1200 }]);
    const end = d(2026, 8, 7);
    const pts = weeklySamples(h, d(2026, 8, 1), end);
    expect(pts).toEqual([
      { date: d(2026, 7, 31), elo: 1200 }, // entry — Mon Aug 31 sample suppressed (same moment)
      { date: end, elo: 1200 }, // Monday == right edge with the right rating → single final sample
    ]);
  });
});
