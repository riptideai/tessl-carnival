import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const RINGS_PER_ROUND = 8;
export const NECK_RADIUS = 14;
/** Seconds a ring spends in the air. */
export const FLIGHT_TIME = 0.6;
/** How far, in pixels, the throw drifts left or right of the aim. */
export const SWAY = 24;
const SWAY_SPEED = 2.5;
export const THROWER = { x: WIDTH / 2, y: HEIGHT - 40 } as const;
/** Back row first: bottles further back score more. */
const ROWS = [
  { y: 120, points: 30 },
  { y: 190, points: 20 },
  { y: 260, points: 10 },
];
const BOTTLES_PER_ROW = 5;

export interface Bottle {
  x: number;
  y: number;
  points: number;
}

export interface Ring {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** 0 when thrown, 1 when it lands. */
  progress: number;
}

export interface LandedRing {
  x: number;
  y: number;
  ringer: boolean;
}

export interface RingTossState {
  bottles: Bottle[];
  flying: Ring | null;
  landed: LandedRing[];
  ringsLeft: number;
  score: number;
  time: number;
  phase: 'playing' | 'over';
}

export function createState(): RingTossState {
  const spacing = WIDTH / (BOTTLES_PER_ROW + 1);
  const bottles = ROWS.flatMap((row) =>
    Array.from({ length: BOTTLES_PER_ROW }, (_, i) => ({
      x: spacing * (i + 1),
      y: row.y,
      points: row.points,
    })),
  );
  return {
    bottles,
    flying: null,
    landed: [],
    ringsLeft: RINGS_PER_ROUND,
    score: 0,
    time: 0,
    phase: 'playing',
  };
}

/** The throw drifts from side to side over time, so aiming takes timing too. */
export function swayOffset(time: number): number {
  return SWAY * Math.sin(time * SWAY_SPEED);
}

/** The bottle whose neck a ring landing at (x, y) rings, if any. */
export function bottleAt(state: RingTossState, x: number, y: number): Bottle | undefined {
  return state.bottles.find((b) => Math.hypot(x - b.x, y - b.y) <= NECK_RADIUS);
}

/** Throws one ring towards the aim. Returns false if nothing was thrown. */
export function throwRing(state: RingTossState, aimX: number, aimY: number): boolean {
  if (state.phase !== 'playing' || state.ringsLeft === 0 || state.flying) return false;
  state.flying = {
    fromX: THROWER.x,
    fromY: THROWER.y,
    toX: aimX + swayOffset(state.time),
    toY: Math.min(aimY, THROWER.y - 1),
    progress: 0,
  };
  state.ringsLeft -= 1;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: RingTossState, dt: number): void {
  state.time += dt;

  const ring = state.flying;
  if (ring) {
    ring.progress = Math.min(ring.progress + dt / FLIGHT_TIME, 1);
    if (ring.progress >= 1) {
      const bottle = bottleAt(state, ring.toX, ring.toY);
      if (bottle) state.score += bottle.points;
      state.landed.push({
        x: bottle ? bottle.x : ring.toX,
        y: bottle ? bottle.y : ring.toY,
        ringer: Boolean(bottle),
      });
      state.flying = null;
    }
  }

  if (state.ringsLeft === 0 && !state.flying) state.phase = 'over';
}

/** Where a ring in flight is drawn: along the line, lifted in an arc. */
export function ringPosition(ring: Ring): { x: number; y: number } {
  const t = ring.progress;
  return {
    x: ring.fromX + (ring.toX - ring.fromX) * t,
    y: ring.fromY + (ring.toY - ring.fromY) * t - Math.sin(t * Math.PI) * 80,
  };
}

function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x, y, NECK_RADIUS + 4, (NECK_RADIUS + 4) * 0.45, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function draw(ctx: CanvasRenderingContext2D, state: RingTossState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  for (const row of ROWS) {
    ctx.fillStyle = colors.wood;
    ctx.fillRect(40, row.y + 30, WIDTH - 80, 6);
    ctx.fillStyle = colors.muted;
    ctx.font = canvasFont('small');
    ctx.textAlign = 'left';
    ctx.fillText(`${row.points}`, 12, row.y + 30);
  }

  for (const bottle of state.bottles) {
    ctx.fillStyle = colors.water;
    ctx.fillRect(bottle.x - 12, bottle.y + 4, 24, 26);
    ctx.fillRect(bottle.x - 4, bottle.y - 10, 8, 16);
    ctx.fillStyle = colors.surface;
    ctx.fillRect(bottle.x - 4, bottle.y - 12, 8, 4);
  }

  for (const ring of state.landed) {
    drawRing(ctx, ring.x, ring.y, ring.ringer ? colors.accent : colors.muted);
  }

  if (state.flying) {
    const { x, y } = ringPosition(state.flying);
    drawRing(ctx, x, y, colors.accent);
  }

  // The aim, where the throw would land right now.
  if (state.phase === 'playing' && !state.flying && state.ringsLeft > 0) {
    ctx.strokeStyle = colors.danger;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(aim.x + swayOffset(state.time), Math.min(aim.y, THROWER.y - 1), 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = colors.surface;
  ctx.beginPath();
  ctx.arc(THROWER.x, THROWER.y, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Rings ${state.ringsLeft}/${RINGS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of rings! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const ringToss: CarnivalGame = {
  id: 'ring-toss',
  name: 'Ring Toss',
  description:
    'Land rings on the bottle necks before you run out. Bottles further back score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: ROWS[1].y };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        throwRing(state, aim.x, aim.y);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(ringToss.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default ringToss;
