'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Avatar, { hueFor } from '@/components/Avatar';
import type { EloEvent, EloHistory, EloPerson } from '@/lib/eloHistory';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Chart canvas is a fixed viewBox; the container keeps the same aspect ratio so
 *  absolutely-positioned avatar markers (in %) land exactly on the SVG points. */
const VIEW = { w: 1000, h: 420, pad: { l: 58, r: 30, t: 48, b: 36 } };

type Outcome = EloEvent['outcome'];

const OUTCOME_META: Record<
  Outcome,
  { verb: (name: string) => string; glow: string; badge: string; badgeClass: string; text: string }
> = {
  win: {
    verb: (name) => `Defeated ${name}`,
    glow: '0 0 0 2px rgba(52, 211, 153, 0.85), 0 0 16px rgba(52, 211, 153, 0.5)',
    badge: '▲',
    badgeClass: 'text-emerald-300',
    text: 'text-emerald-400',
  },
  loss: {
    verb: (name) => `Lost to ${name}`,
    glow: '0 0 0 2px rgba(251, 113, 133, 0.85), 0 0 16px rgba(251, 113, 133, 0.5)',
    badge: '▼',
    badgeClass: 'text-rose-300',
    text: 'text-rose-400',
  },
  draw: {
    verb: (name) => `Drew with ${name}`,
    glow: '0 0 0 2px rgba(148, 163, 184, 0.8), 0 0 14px rgba(148, 163, 184, 0.35)',
    badge: '◆',
    badgeClass: 'text-slate-300',
    text: 'text-slate-400',
  },
};

function lineColor(name: string): string {
  return `hsl(${hueFor(name)} 72% 62%)`;
}

function formatDate(ms: number, withYear = false): string {
  return new Date(ms).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

/** Hydration-safe date text for HTML contexts — server and client locales differ. */
function DateText({ ms, withYear = false, className }: { ms: number; withYear?: boolean; className?: string }) {
  return (
    <time dateTime={new Date(ms).toISOString()} className={className} suppressHydrationWarning>
      {formatDate(ms, withYear)}
    </time>
  );
}

interface PlotPoint {
  date: number;
  elo: number;
  event?: EloEvent;
}

function pointsOf(history: EloHistory): PlotPoint[] {
  return [
    { date: history.anchorDate, elo: history.startElo },
    ...history.events.map((event) => ({ date: event.date, elo: event.after, event })),
  ];
}

/** Evenly spaced, "nice" y ticks that cover [min, max]. */
function niceScale(min: number, max: number, target = 5) {
  const span = Math.max(max - min, 1);
  const rough = span / target;
  const step = [10, 25, 50, 100, 200, 250, 500].find((s) => s >= rough) ?? 1000;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi; v += step) ticks.push(v);
  return { lo, hi, ticks };
}

interface Frame {
  xDomain: [number, number];
  yDomain: [number, number];
  yTicks: number[];
  xTicks: number[];
}

/** Shared axes math — x is time, y is ELO; both padded away from the edges. */
function buildFrame(allPoints: PlotPoint[]): Frame {
  let minDate = Infinity;
  let maxDate = -Infinity;
  let minElo = Infinity;
  let maxElo = -Infinity;
  for (const p of allPoints) {
    minDate = Math.min(minDate, p.date);
    maxDate = Math.max(maxDate, p.date);
    minElo = Math.min(minElo, p.elo);
    maxElo = Math.max(maxElo, p.elo);
  }
  if (!Number.isFinite(minDate)) {
    const now = Date.now();
    minDate = now - DAY_MS;
    maxDate = now;
    minElo = 1000;
    maxElo = 1400;
  }
  // Keep at least a day of horizontal breathing room.
  if (maxDate - minDate < DAY_MS) {
    const mid = (minDate + maxDate) / 2;
    minDate = mid - DAY_MS / 2;
    maxDate = mid + DAY_MS / 2;
  }
  const { lo, hi, ticks } = niceScale(minElo - 15, maxElo + 15);
  const span = maxDate - minDate;
  const tickCount = span < 3 * DAY_MS ? 3 : span < 45 * DAY_MS ? 4 : 5;
  const xTicks = Array.from({ length: tickCount }, (_, i) => minDate + (span * i) / (tickCount - 1));
  return { xDomain: [minDate, maxDate], yDomain: [lo, hi], yTicks: ticks, xTicks };
}

function xAt(date: number, frame: Frame): number {
  const [min, max] = frame.xDomain;
  return VIEW.pad.l + ((date - min) / (max - min)) * (VIEW.w - VIEW.pad.l - VIEW.pad.r);
}

function yAt(elo: number, frame: Frame): number {
  const [min, max] = frame.yDomain;
  return VIEW.h - VIEW.pad.b - ((elo - min) / (max - min)) * (VIEW.h - VIEW.pad.t - VIEW.pad.b);
}

function pathFor(points: PlotPoint[], frame: Frame): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(p.date, frame).toFixed(1)} ${yAt(p.elo, frame).toFixed(1)}`)
    .join(' ');
}

/** % position of a point inside the chart container — matches the viewBox mapping. */
function pctOf(point: PlotPoint, frame: Frame): { left: number; top: number } {
  return {
    left: (100 * xAt(point.date, frame)) / VIEW.w,
    top: (100 * yAt(point.elo, frame)) / VIEW.h,
  };
}

function ChartFrame({ frame, children }: { frame: Frame; children: React.ReactNode }) {
  const hasBaseline = 1200 > frame.yDomain[0] && 1200 < frame.yDomain[1];
  return (
    <svg
      viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
      role="presentation"
    >
      {frame.yTicks.map((tick) => {
        const isBaseline = tick === 1200 && hasBaseline;
        return (
          <g key={tick}>
            <line
              x1={VIEW.pad.l}
              x2={VIEW.w - VIEW.pad.r}
              y1={yAt(tick, frame)}
              y2={yAt(tick, frame)}
              stroke={isBaseline ? 'rgba(0, 192, 243, 0.28)' : 'rgba(255, 255, 255, 0.06)'}
              strokeDasharray={isBaseline ? '6 6' : undefined}
            />
            <text
              x={VIEW.pad.l - 10}
              y={yAt(tick, frame) + 4}
              textAnchor="end"
              fontSize={13}
              fontWeight={600}
              fill={isBaseline ? 'rgba(0, 192, 243, 0.75)' : '#64748b'}
            >
              {tick}
            </text>
          </g>
        );
      })}
      {frame.xTicks.map((tick, i) => (
        <text
          key={i}
          x={xAt(tick, frame)}
          y={VIEW.h - 10}
          textAnchor="middle"
          fontSize={13}
          fontWeight={600}
          fill="#64748b"
          suppressHydrationWarning
        >
          {formatDate(tick)}
        </text>
      ))}
      {children}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Overview: every duelist's ELO trail on one canvas                   */
/* ------------------------------------------------------------------ */

function OverviewChart({
  histories,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: {
  histories: EloHistory[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const frame = useMemo(() => buildFrame(histories.flatMap(pointsOf)), [histories]);

  return (
    <div className="overflow-x-auto">
      <div className="relative min-w-[620px]" style={{ aspectRatio: `${VIEW.w} / ${VIEW.h}` }}>
        <ChartFrame frame={frame}>
          {histories.map((h) => {
            const hue = hueFor(h.member.name);
            const emphasized = h.member.id === selectedId || h.member.id === hoveredId;
            const dimmed = selectedId !== null && h.member.id !== selectedId;
            const d = pathFor(pointsOf(h), frame);
            return (
              <g key={h.member.id}>
                <path
                  d={d}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    stroke: lineColor(h.member.name),
                    strokeWidth: emphasized ? 3.5 : 2.25,
                    opacity: dimmed ? 0.25 : 1,
                    filter: `drop-shadow(0 0 6px hsla(${hue}, 80%, 60%, ${emphasized ? 0.55 : 0.3}))`,
                    transition: 'opacity 200ms, stroke-width 200ms',
                  }}
                />
                {/* fat invisible hit-line for hover/click */}
                <path
                  d={d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={18}
                  style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                  onMouseEnter={() => onHover(h.member.id)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onSelect(h.member.id)}
                />
              </g>
            );
          })}
        </ChartFrame>

        {histories.map((h) => {
          const points = pointsOf(h);
          const { left, top } = pctOf(points[points.length - 1], frame);
          const hue = hueFor(h.member.name);
          const dimmed = selectedId !== null && h.member.id !== selectedId;
          return (
            <button
              key={h.member.id}
              onClick={() => onSelect(h.member.id)}
              onMouseEnter={() => onHover(h.member.id)}
              onMouseLeave={() => onHover(null)}
              aria-label={`${h.member.name}, now ${h.currentElo} ELO — show rating history`}
              className="group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full p-1.5 transition-opacity hover:z-20"
              style={{ left: `${left}%`, top: `${top}%`, opacity: dimmed ? 0.35 : 1 }}
            >
              <span
                className="rounded-full transition-transform group-hover:scale-110"
                style={{
                  boxShadow: `0 0 0 2px hsla(${hue}, 80%, 60%, 0.9), 0 0 12px hsla(${hue}, 80%, 60%, 0.45)`,
                }}
              >
                <Avatar
                  name={h.member.name}
                  avatarPath={h.member.avatarPath}
                  colors={h.member.colors}
                  size={26}
                  dimmed
                />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Detail: one duelist, each match stamped with the opponent's avatar  */
/* ------------------------------------------------------------------ */

interface Hovered {
  event: EloEvent;
  left: number;
  top: number;
}

function DetailChart({
  history,
  peopleById,
}: {
  history: EloHistory;
  peopleById: Map<string, EloPerson>;
}) {
  const [hovered, setHovered] = useState<Hovered | null>(null);
  const points = useMemo(() => pointsOf(history), [history]);
  const frame = useMemo(() => buildFrame(points), [points]);
  const hue = hueFor(history.member.name);
  const last = points[points.length - 1];
  const lastPos = pctOf(last, frame);

  return (
    <div className="overflow-x-auto">
      <div className="relative min-w-[620px]" style={{ aspectRatio: `${VIEW.w} / ${VIEW.h}` }}>
        <ChartFrame frame={frame}>
          <defs>
            <linearGradient id={`area-${history.member.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={`hsla(${hue}, 72%, 60%, 0.22)`} />
              <stop offset="1" stopColor={`hsla(${hue}, 72%, 60%, 0)`} />
            </linearGradient>
          </defs>
          <path
            d={`${pathFor(points, frame)} L ${xAt(points[points.length - 1].date, frame)} ${VIEW.h - VIEW.pad.b} L ${xAt(points[0].date, frame)} ${VIEW.h - VIEW.pad.b} Z`}
            fill={`url(#area-${history.member.id})`}
          />
          <path
            d={pathFor(points, frame)}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              stroke: lineColor(history.member.name),
              strokeWidth: 3,
              filter: `drop-shadow(0 0 7px hsla(${hue}, 80%, 60%, 0.5))`,
            }}
          />
          {/* join-date anchor: the rating they started on */}
          <circle
            cx={xAt(points[0].date, frame)}
            cy={yAt(points[0].elo, frame)}
            r={4.5}
            fill="#12151c"
            stroke={lineColor(history.member.name)}
            strokeWidth={2.5}
          />
          <text
            x={xAt(last.date, frame)}
            y={yAt(last.elo, frame) - 34}
            textAnchor="end"
            fontSize={17}
            fontWeight={800}
            fill={lineColor(history.member.name)}
          >
            {last.elo}
          </text>
        </ChartFrame>

        {points
          .filter((p) => p.event)
          .map((p) => {
            const event = p.event!;
            const opponent = peopleById.get(event.opponentId);
            const meta = OUTCOME_META[event.outcome];
            const { left, top } = pctOf(p, frame);
            return (
              <button
                key={event.id}
                className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform duration-150 hover:z-30 hover:scale-110 focus:z-30 focus:scale-110 focus:outline-none"
                style={{ left: `${left}%`, top: `${top}%` }}
                onMouseEnter={() => setHovered({ event, left, top })}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered({ event, left, top })}
                onBlur={() => setHovered(null)}
                aria-label={`${event.context}: ${meta.verb(opponent?.name ?? 'unknown')} — ELO ${event.before} to ${event.after}`}
              >
                <span className="relative block rounded-full" style={{ boxShadow: meta.glow }}>
                  <Avatar
                    name={opponent?.name ?? '?'}
                    avatarPath={opponent?.avatarPath ?? null}
                    colors={opponent?.colors ?? null}
                    size={34}
                    dimmed
                  />
                  <span
                    aria-hidden
                    className={`absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-base/90 text-[8px] font-black ${meta.badgeClass}`}
                  >
                    {meta.badge}
                  </span>
                </span>
              </button>
            );
          })}

        {hovered && <EventTooltip hovered={hovered} peopleById={peopleById} />}
      </div>
    </div>
  );
}

function EventTooltip({ hovered, peopleById }: { hovered: Hovered; peopleById: Map<string, EloPerson> }) {
  const { event } = hovered;
  const opponent = peopleById.get(event.opponentId);
  const meta = OUTCOME_META[event.outcome];
  const delta = event.after - event.before;
  const flipX = hovered.left > 76;
  const flipY = hovered.top < 32;
  const xPart = flipX ? '-92%' : '-50%';
  const yPart = flipY ? '16px' : 'calc(-100% - 14px)';

  return (
    <div
      role="status"
      className="pointer-events-none absolute z-40 w-56 rounded-xl border border-white/10 bg-panel/95 p-3 shadow-xl shadow-black/50 backdrop-blur"
      style={{ left: `${hovered.left}%`, top: `${hovered.top}%`, transform: `translate(${xPart}, ${yPart})` }}
    >
      <div className="flex items-center gap-2.5">
        <Avatar
          name={opponent?.name ?? '?'}
          avatarPath={opponent?.avatarPath ?? null}
          colors={opponent?.colors ?? null}
          size={30}
          dimmed
        />
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-slate-100">vs {opponent?.name ?? 'Unknown'}</p>
          <p className={`text-[11px] font-semibold ${meta.text}`}>{meta.verb(opponent?.name ?? 'unknown')}</p>
        </div>
      </div>
      <p className="mt-2 border-t border-white/5 pt-2 text-[11px] font-semibold text-slate-400">
        {event.context} · <DateText ms={event.date} withYear />
      </p>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold tabular-nums text-slate-200">
          {event.before} → {event.after}
        </span>
        <span className={`text-sm font-black tabular-nums ${delta === 0 ? 'text-slate-400' : meta.text}`}>
          {delta > 0 ? '+' : ''}
          {delta}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Match log under the detail chart                                    */
/* ------------------------------------------------------------------ */

function MatchLog({ history, peopleById }: { history: EloHistory; peopleById: Map<string, EloPerson> }) {
  const rows = [...history.events].reverse(); // newest first
  return (
    <ul className="space-y-2">
      {rows.map((event) => {
        const opponent = peopleById.get(event.opponentId);
        const meta = OUTCOME_META[event.outcome];
        const delta = event.after - event.before;
        return (
          <li
            key={event.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5 sm:gap-3 sm:px-4"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar
                name={opponent?.name ?? '?'}
                avatarPath={opponent?.avatarPath ?? null}
                colors={opponent?.colors ?? null}
                size={30}
                dimmed
              />
              <div className="min-w-0">
                <p className={`truncate text-xs font-bold ${meta.text}`}>{meta.verb(opponent?.name ?? 'unknown')}</p>
                <p className="truncate text-[11px] font-semibold text-slate-500">
                  {event.context} · <DateText ms={event.date} withYear />
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-bold tabular-nums text-slate-200">
                {event.before} → {event.after}
              </p>
              <p className={`text-[11px] font-black tabular-nums ${delta === 0 ? 'text-slate-500' : meta.text}`}>
                {delta > 0 ? '+' : ''}
                {delta}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Page shell                                                          */
/* ------------------------------------------------------------------ */

export default function EloTracker({
  people,
  histories,
  initialMemberId,
}: {
  people: EloPerson[];
  histories: EloHistory[];
  /** Profile cookie — preselects that duelist's detail view on load. */
  initialMemberId: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    initialMemberId && histories.some((h) => h.member.id === initialMemberId) ? initialMemberId : null,
  );
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  const detailRef = useRef<HTMLElement>(null);
  const interactedRef = useRef(false);

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const selected = histories.find((h) => h.member.id === selectedId) ?? null;

  useEffect(() => {
    if (selected && interactedRef.current) {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selected]);

  function select(id: string) {
    interactedRef.current = true;
    setHoveredLine(null);
    setSelectedId((prev) => (prev === id ? null : id));
  }

  if (histories.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-4 p-10 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- local static art */}
        <img
          src="/art/empty-sanctuary.jpg"
          alt=""
          className="float h-36 w-36 rounded-full object-cover opacity-70 ring-2 ring-white/10"
        />
        <div className="space-y-1">
          <p className="font-display text-lg font-bold uppercase tracking-widest text-slate-200">
            No rated matches yet
          </p>
          <p className="text-sm text-slate-400">
            Record results in a season or log a challenge — every ELO point lands here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="section-title">
          Rating trails
          <span className="h-px flex-1 bg-gradient-to-r from-navy via-plum to-transparent" />
        </h2>
        <div className="card space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap gap-1.5">
            {histories.map((h) => {
              const isSelected = h.member.id === selectedId;
              return (
                <button
                  key={h.member.id}
                  onClick={() => select(h.member.id)}
                  onMouseEnter={() => setHoveredLine(h.member.id)}
                  onMouseLeave={() => setHoveredLine(null)}
                  aria-pressed={isSelected}
                  className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs font-bold transition ${
                    isSelected
                      ? 'bg-accent/15 text-accent ring-1 ring-accent/50'
                      : 'bg-black/25 text-slate-300 ring-1 ring-white/5 hover:bg-white/10 hover:text-slate-100'
                  } ${h.member.active ? '' : 'opacity-50'}`}
                >
                  <Avatar
                    name={h.member.name}
                    avatarPath={h.member.avatarPath}
                    colors={h.member.colors}
                    size={22}
                    dimmed={!isSelected}
                  />
                  <span className="max-w-[10rem] truncate">{h.member.nickname ?? h.member.name}</span>
                  <span className={`tabular-nums ${isSelected ? 'text-accent/80' : 'text-slate-500'}`}>
                    {h.currentElo}
                  </span>
                </button>
              );
            })}
          </div>
          <OverviewChart
            histories={histories}
            selectedId={selectedId}
            hoveredId={hoveredLine}
            onSelect={select}
            onHover={setHoveredLine}
          />
          <p className="text-center text-[11px] font-semibold text-slate-500">
            Click a trail or a duelist above — every point on the detail chart is the opponent they faced.
          </p>
        </div>
      </section>

      <section ref={detailRef} className="space-y-3 scroll-mt-24">
        <h2 className="section-title">
          {selected ? `${selected.member.nickname ?? selected.member.name}'s climb` : 'Duelist detail'}
          <span className="h-px flex-1 bg-gradient-to-r from-navy via-plum to-transparent" />
        </h2>

        {selected ? (
          <div className="card space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar
                  name={selected.member.name}
                  avatarPath={selected.member.avatarPath}
                  colors={selected.member.colors}
                  size={44}
                />
                <div>
                  <p className="font-display text-lg font-bold text-slate-100">
                    {selected.member.nickname ?? selected.member.name}
                  </p>
                  <p className="text-xs font-semibold text-slate-500">
                    {selected.currentElo} ELO now · started at {selected.startElo}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedId(null)} className="btn-ghost !px-3 !py-1.5 !text-xs">
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Current', value: `${selected.currentElo}` },
                { label: 'Peak', value: `${selected.peakElo}` },
                { label: 'Rated matches', value: `${selected.events.length}` },
                {
                  label: 'Record W–L–D',
                  value: `${selected.events.filter((e) => e.outcome === 'win').length}–${selected.events.filter((e) => e.outcome === 'loss').length}–${selected.events.filter((e) => e.outcome === 'draw').length}`,
                },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{stat.label}</p>
                  <p className="text-sm font-black tabular-nums text-slate-100">{stat.value}</p>
                </div>
              ))}
            </div>

            <DetailChart history={selected} peopleById={peopleById} />

            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Matches that moved the needle — newest first
              </p>
              <MatchLog history={selected} peopleById={peopleById} />
            </div>
          </div>
        ) : (
          <div className="card p-6 text-center text-sm text-slate-400">
            Pick a duelist above — their full rating history appears here, opponent avatars marking every swing.
          </div>
        )}
      </section>
    </div>
  );
}
