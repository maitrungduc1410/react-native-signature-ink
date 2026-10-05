<script setup lang="ts">
// Web approximation of <SignatureInk />. The ink is a port of the Android
// renderer (4-point rolling window, Square's control points, width tapered
// by pen speed with an exponential velocity filter). Units: CSS pixels stand
// in for dp/points. Export, undo and stroke-data semantics follow Android.
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useData } from 'vitepress';

type Point = { x: number; y: number; t: number };
type Stroke = { color: string; minWidth: number; maxWidth: number; points: Point[] };
type Output =
  | { kind: 'image'; title: string; url: string; bytes: number; w: number; h: number; ext: string }
  | { kind: 'text'; title: string; text: string; url: string; ext: string };

const STRINGS = {
  en: {
    badge: 'Web approximation',
    note: 'Drawn in the browser with a port of the Android ink algorithm. The real component is native: PencilKit on iOS, a Kotlin renderer on Android.',
    canvasLabel: 'Signature pad. Draw with a mouse, finger or pen.',
    pen: 'Pen',
    penColor: 'penColor',
    canvas: 'Canvas',
    transparent: 'transparent',
    baseline: 'Baseline',
    toolbar: 'Toolbar',
    position: 'position',
    tint: 'toolbarTintColor',
    platformDefault: 'default',
    methods: 'Ref methods',
    trim: 'trim',
    speed: 'speed',
    events: 'Events',
    noEvents: 'Draw something to see events.',
    output: 'Result',
    download: 'Download',
    copied: 'PNG copied to the clipboard.',
    copyFailed: 'This browser blocked clipboard access.',
    emptyCanvas: 'The canvas is empty.',
    code: 'Matching JSX',
    bytes: 'bytes',
  },
  vi: {
    badge: 'Mô phỏng trên web',
    note: 'Được vẽ trong trình duyệt bằng bản port thuật toán mực của Android. Component thật là native: PencilKit trên iOS, renderer Kotlin trên Android.',
    canvasLabel: 'Bảng ký tên. Vẽ bằng chuột, ngón tay hoặc bút.',
    pen: 'Bút',
    penColor: 'penColor',
    canvas: 'Canvas',
    transparent: 'trong suốt',
    baseline: 'Đường kẻ ký tên',
    toolbar: 'Toolbar',
    position: 'vị trí',
    tint: 'toolbarTintColor',
    platformDefault: 'mặc định',
    methods: 'Phương thức qua ref',
    trim: 'trim',
    speed: 'speed',
    events: 'Sự kiện',
    noEvents: 'Hãy vẽ thử để xem sự kiện.',
    output: 'Kết quả',
    download: 'Tải về',
    copied: 'Đã sao chép ảnh PNG vào clipboard.',
    copyFailed: 'Trình duyệt này chặn quyền truy cập clipboard.',
    emptyCanvas: 'Canvas đang trống.',
    code: 'JSX tương ứng',
    bytes: 'byte',
  },
  zh: {
    badge: '网页近似效果',
    note: '在浏览器中用 Android 墨迹算法的移植版绘制。真实组件是原生的：iOS 使用 PencilKit，Android 使用 Kotlin 渲染器。',
    canvasLabel: '签名板。可以用鼠标、手指或手写笔书写。',
    pen: '笔',
    penColor: 'penColor',
    canvas: '画布',
    transparent: '透明',
    baseline: '签名基线',
    toolbar: '工具栏',
    position: '位置',
    tint: 'toolbarTintColor',
    platformDefault: '默认',
    methods: 'Ref 方法',
    trim: 'trim',
    speed: 'speed',
    events: '事件',
    noEvents: '写几笔即可看到事件。',
    output: '结果',
    download: '下载',
    copied: '已将 PNG 复制到剪贴板。',
    copyFailed: '当前浏览器不允许访问剪贴板。',
    emptyCanvas: '画布为空。',
    code: '对应的 JSX',
    bytes: '字节',
  },
};

const { lang } = useData();
const t = computed(() =>
  lang.value.startsWith('vi') ? STRINGS.vi : lang.value.startsWith('zh') ? STRINGS.zh : STRINGS.en
);

const PEN_COLORS = ['#111111', '#1d4ed8', '#047857', '#b91c1c', '#ffffff'];
const BACKGROUNDS = ['transparent', '#ffffff', '#0c0c0c'];
const TINTS = ['', '#047857', '#2563eb', '#ffffff'];
const TOOLBAR_HEIGHT = 48;
const BASELINE_OFFSET = 16;

const props = reactive({
  penColor: '#111111',
  penMinWidth: 1,
  penMaxWidth: 3,
  velocityFilterWeight: 0.7,
  backgroundColor: 'transparent',
  showBaseline: true,
  baselineStyle: 'dashed' as 'solid' | 'dashed' | 'dotted',
  showToolbar: true,
  toolbarPosition: 'bottom' as 'top' | 'bottom',
  toolbarTintColor: '',
});
const exportOpts = reactive({ trim: true, speed: 1 });

const canvasEl = ref<HTMLCanvasElement | null>(null);
const size = reactive({ w: 0, h: 0 });
const strokes: Stroke[] = [];
const undone: Stroke[] = [];
const strokeCount = ref(0);
const redoCount = ref(0);
const replayProgress = ref<number | null>(null);
const events = ref<{ id: number; name: string; payload: string }[]>([]);
const output = ref<Output | null>(null);
const status = ref('');
let eventId = 0;

function emit(name: string, payload?: unknown) {
  events.value = [
    { id: ++eventId, name, payload: payload === undefined ? '' : JSON.stringify(payload) },
    ...events.value,
  ].slice(0, 6);
}
function emitChange() {
  strokeCount.value = strokes.length;
  redoCount.value = undone.length;
  emit('onChange', { isEmpty: strokes.length === 0, strokeCount: strokes.length });
}

// ---- ink algorithm (SignatureCanvasView.kt / ink/*.kt) ----

type InkState = { active: Point[]; lastVelocity: number; lastWidth: number };

function controlPoints(s1: Point, s2: Point, s3: Point) {
  const dx1 = s1.x - s2.x, dy1 = s1.y - s2.y;
  const dx2 = s2.x - s3.x, dy2 = s2.y - s3.y;
  const m1x = (s1.x + s2.x) / 2, m1y = (s1.y + s2.y) / 2;
  const m2x = (s2.x + s3.x) / 2, m2y = (s2.y + s3.y) / 2;
  const l1 = Math.hypot(dx1, dy1), l2 = Math.hypot(dx2, dy2);
  const k = l1 + l2 === 0 ? 0 : l2 / (l1 + l2);
  const cmx = m2x + (m1x - m2x) * k, cmy = m2y + (m1y - m2y) * k;
  const tx = s2.x - cmx, ty = s2.y - cmy;
  return { c1: { x: m1x + tx, y: m1y + ty }, c2: { x: m2x + tx, y: m2y + ty } };
}

function cubic(t: number, p0: number, p1: number, p2: number, p3: number) {
  const o = 1 - t;
  return o * o * o * p0 + 3 * o * o * t * p1 + 3 * o * t * t * p2 + t * t * t * p3;
}

function drawBezier(
  ctx: CanvasRenderingContext2D,
  p0: { x: number; y: number }, c1: { x: number; y: number },
  c2: { x: number; y: number }, p3: { x: number; y: number },
  w0: number, w1: number,
) {
  let len = 0, px = p0.x, py = p0.y;
  for (let i = 1; i <= 10; i++) {
    const s = i / 10;
    const x = cubic(s, p0.x, c1.x, c2.x, p3.x), y = cubic(s, p0.y, c1.y, c2.y, p3.y);
    len += Math.hypot(x - px, y - py);
    px = x; py = y;
  }
  const steps = Math.max(1, Math.ceil(len));
  px = p0.x; py = p0.y;
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const x = cubic(s, p0.x, c1.x, c2.x, p3.x), y = cubic(s, p0.y, c1.y, c2.y, p3.y);
    ctx.lineWidth = w0 + (w1 - w0) * s;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
    px = x; py = y;
  }
}

function addPoint(ctx: CanvasRenderingContext2D, s: Stroke, st: InkState, p: Point) {
  st.active.push(p);
  if (st.active.length > 4) st.active.shift();
  ctx.strokeStyle = s.color;
  if (st.active.length === 2) {
    const [a, b] = st.active;
    ctx.lineWidth = (s.minWidth + s.maxWidth) / 2;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  if (st.active.length === 4) {
    const [a, b, c, d] = st.active;
    const first = controlPoints(a, b, c), second = controlPoints(b, c, d);
    const dt = Math.max(1, c.t - b.t);
    const velocity = Math.hypot(c.x - b.x, c.y - b.y) / dt;
    const w = props.velocityFilterWeight;
    const filtered = w * velocity + (1 - w) * st.lastVelocity;
    const newWidth = Math.max(s.maxWidth / (filtered + 1), s.minWidth);
    drawBezier(ctx, b, first.c2, second.c1, c, st.lastWidth, newWidth);
    st.lastVelocity = filtered;
    st.lastWidth = newWidth;
  }
}

function flush(ctx: CanvasRenderingContext2D, s: Stroke, st: InkState) {
  if (st.active.length < 2) return;
  const a = st.active[st.active.length - 2], b = st.active[st.active.length - 1];
  ctx.strokeStyle = s.color;
  ctx.lineWidth = (s.minWidth + s.maxWidth) / 2;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}

function dot(ctx: CanvasRenderingContext2D, s: Stroke, p: Point) {
  ctx.fillStyle = s.color;
  ctx.beginPath(); ctx.arc(p.x, p.y, (s.minWidth + s.maxWidth) / 4, 0, Math.PI * 2); ctx.fill();
}

function newState(s: Stroke): InkState {
  return { active: [], lastVelocity: 0, lastWidth: (s.minWidth + s.maxWidth) / 2 };
}

function paintStroke(ctx: CanvasRenderingContext2D, s: Stroke, take = s.points.length) {
  const pts = s.points.slice(0, take);
  if (pts.length === 1) return dot(ctx, s, pts[0]);
  const st = newState(s);
  for (const p of pts) addPoint(ctx, s, st, p);
  flush(ctx, s, st);
}

function context(): CanvasRenderingContext2D | null {
  const c = canvasEl.value;
  const ctx = c?.getContext('2d');
  if (!c || !ctx) return null;
  const dpr = c.width / Math.max(1, size.w);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  return ctx;
}

function repaint(list: Stroke[] = strokes, takeTotal = Infinity) {
  const ctx = context();
  if (!ctx) return;
  ctx.clearRect(0, 0, size.w, size.h);
  let left = takeTotal;
  for (const s of list) {
    if (left <= 0) break;
    const take = Math.min(left, s.points.length);
    paintStroke(ctx, s, take);
    left -= take;
  }
}

// ---- input ----

let current: Stroke | null = null;
let currentState: InkState | null = null;

function local(e: PointerEvent): Point {
  const r = canvasEl.value!.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top, t: Math.round(e.timeStamp) };
}

function onDown(e: PointerEvent) {
  if (e.button > 0) return;
  cancelReplay();
  canvasEl.value!.setPointerCapture(e.pointerId);
  const p = local(e);
  current = { color: props.penColor, minWidth: props.penMinWidth, maxWidth: props.penMaxWidth, points: [p] };
  currentState = newState(current);
  currentState.active.push(p);
  emit('onBegin');
}

function onMove(e: PointerEvent) {
  if (!current || !currentState) return;
  const ctx = context();
  if (!ctx) return;
  const samples = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e];
  for (const sample of samples.length ? samples : [e]) {
    const p = local(sample);
    const last = current.points[current.points.length - 1];
    if (last.x === p.x && last.y === p.y) continue;
    current.points.push(p);
    addPoint(ctx, current, currentState, p);
  }
}

function onUp(e: PointerEvent) {
  if (!current || !currentState) return;
  onMove(e);
  const ctx = context();
  if (ctx) {
    if (current.points.length === 1) dot(ctx, current, current.points[0]);
    else flush(ctx, current, currentState);
  }
  strokes.push(current);
  undone.length = 0;
  current = null;
  currentState = null;
  emitChange();
  emit('onEnd');
}

// ---- ref methods ----

function clear() {
  cancelReplay();
  strokes.length = 0;
  undone.length = 0;
  repaint();
  emitChange();
}
function undo() {
  cancelReplay();
  if (!strokes.length) return;
  undone.push(strokes.pop()!);
  repaint();
  emitChange();
}
function redo() {
  cancelReplay();
  if (!undone.length) return;
  strokes.push(undone.pop()!);
  repaint();
  emitChange();
}

let raf = 0;
let snapshot: Stroke[] = [];
function replay() {
  if (!strokes.length) return;
  cancelReplay();
  snapshot = strokes.slice();
  const total = snapshot.reduce((n, s) => n + s.points.length, 0);
  const duration = Math.max(500, total * 4) / Math.max(0.05, exportOpts.speed);
  const start = performance.now();
  const tick = (now: number) => {
    const progress = Math.min(1, (now - start) / duration);
    replayProgress.value = progress;
    repaint(snapshot, Math.max(1, Math.floor(progress * total)));
    if (progress < 1) raf = requestAnimationFrame(tick);
    else {
      raf = 0;
      replayProgress.value = null;
      repaint();
      emit('onReplayProgress', { progress: 1 });
    }
  };
  emit('onReplayProgress', { progress: 0 });
  raf = requestAnimationFrame(tick);
}
function cancelReplay() {
  if (!raf) return;
  cancelAnimationFrame(raf);
  raf = 0;
  replayProgress.value = null;
  repaint();
}

function bounds() {
  let l = Infinity, tp = Infinity, r = -Infinity, b = -Infinity;
  for (const s of strokes)
    for (const p of s.points) {
      l = Math.min(l, p.x); tp = Math.min(tp, p.y); r = Math.max(r, p.x); b = Math.max(b, p.y);
    }
  const pad = props.penMaxWidth * 0.6 + 2;
  return { l: l - pad, t: tp - pad, r: r + pad, b: b + pad };
}

function render(trim: boolean, opaque: boolean): HTMLCanvasElement {
  const src = canvasEl.value!;
  const dpr = src.width / Math.max(1, size.w);
  let rect = { l: 0, t: 0, r: size.w, b: size.h };
  if (trim && strokes.length) {
    const bb = bounds();
    rect = { l: Math.max(0, bb.l), t: Math.max(0, bb.t), r: Math.min(size.w, bb.r), b: Math.min(size.h, bb.b) };
  }
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round((rect.r - rect.l) * dpr));
  out.height = Math.max(1, Math.round((rect.b - rect.t) * dpr));
  const ctx = out.getContext('2d')!;
  const bg = props.backgroundColor;
  if (bg !== 'transparent' || opaque) {
    ctx.fillStyle = bg === 'transparent' ? '#ffffff' : bg;
    ctx.fillRect(0, 0, out.width, out.height);
  }
  ctx.drawImage(src, -rect.l * dpr, -rect.t * dpr);
  return out;
}

function setOutput(o: Output) {
  if (output.value) URL.revokeObjectURL(output.value.url);
  output.value = o;
}

async function exportImage(format: 'png' | 'jpeg') {
  const c = render(exportOpts.trim, format === 'jpeg');
  const blob = await new Promise<Blob | null>((res) =>
    c.toBlob(res, format === 'png' ? 'image/png' : 'image/jpeg', 1)
  );
  if (!blob) return;
  const call = `toBase64({ format: '${format}', trim: ${exportOpts.trim} })`;
  setOutput({
    kind: 'image', title: call, url: URL.createObjectURL(blob), bytes: blob.size,
    w: c.width, h: c.height, ext: format === 'png' ? 'png' : 'jpg',
  });
}

function hex(color: string) {
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.fillStyle = color;
  return ctx.fillStyle.toUpperCase();
}

function exportSvg() {
  const bb = strokes.length ? bounds() : { l: 0, t: 0, r: size.w, b: size.h };
  const w = Math.max(1, bb.r - bb.l), h = Math.max(1, bb.b - bb.t);
  const f = (n: number) => n.toFixed(2);
  let body = '';
  for (const s of strokes) {
    if (s.points.length === 1) {
      const p = s.points[0];
      body += `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f((s.minWidth + s.maxWidth) / 4)}" fill="${hex(s.color)}"/>`;
      continue;
    }
    const d = s.points.map((p, i) => `${i ? ' L' : 'M'}${f(p.x)},${f(p.y)}`).join('');
    body += `<path d="${d}" stroke="${hex(s.color)}" stroke-width="${f((s.minWidth + s.maxWidth) / 2)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(bb.l)} ${f(bb.t)} ${f(w)} ${f(h)}" width="${Math.floor(w)}" height="${Math.floor(h)}">${body}</svg>`;
  setOutput({ kind: 'text', title: 'toSvg()', text: svg, url: URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })), ext: 'svg' });
}

function exportStrokeData() {
  const data = strokes.map((s) =>
    s.points.map((p) => ({ x: +p.x.toFixed(2), y: +p.y.toFixed(2), t: p.t }))
  );
  const json = JSON.stringify(data);
  setOutput({ kind: 'text', title: 'getStrokeData()', text: json, url: URL.createObjectURL(new Blob([json], { type: 'application/json' })), ext: 'json' });
}

async function copyToClipboard() {
  if (!strokes.length) {
    status.value = t.value.emptyCanvas;
    return;
  }
  try {
    const c = render(true, false);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
    if (!blob || !navigator.clipboard?.write) throw new Error('unsupported');
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    status.value = t.value.copied;
  } catch {
    status.value = t.value.copyFailed;
  }
}

function toolbarAction(id: 'undo' | 'redo' | 'clear' | 'copy') {
  if (id === 'undo') undo();
  else if (id === 'redo') redo();
  else if (id === 'clear') clear();
  else copyToClipboard();
  emit('onToolbarAction', { id });
}

// ---- layout ----

let observer: ResizeObserver | null = null;
function resize() {
  const c = canvasEl.value;
  if (!c) return;
  const r = c.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  size.w = r.width;
  size.h = r.height;
  c.width = Math.round(r.width * dpr);
  c.height = Math.round(r.height * dpr);
  repaint();
}
onMounted(() => {
  observer = new ResizeObserver(resize);
  observer.observe(canvasEl.value!);
  resize();
});
onBeforeUnmount(() => {
  observer?.disconnect();
  cancelAnimationFrame(raf);
  if (output.value) URL.revokeObjectURL(output.value.url);
});

function luminance(color: string) {
  if (color === 'transparent') return 1;
  const h = hex(color).slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
watch(() => props.backgroundColor, (bg) => {
  const dark = luminance(bg) < 0.4;
  if (dark && luminance(props.penColor) < 0.4) props.penColor = '#ffffff';
  if (!dark && luminance(props.penColor) > 0.9) props.penColor = '#111111';
});
watch(() => [props.penMinWidth, props.penMaxWidth], ([min, max], [oldMin]) => {
  if (min > max) {
    if (min !== oldMin) props.penMaxWidth = min;
    else props.penMinWidth = max;
  }
});

const baselineY = computed(() => {
  if (props.showToolbar) return props.toolbarPosition === 'top' ? 0.75 : size.h - 0.75;
  return size.h - BASELINE_OFFSET;
});
const baselineDash = computed(() =>
  props.baselineStyle === 'solid' ? undefined : props.baselineStyle === 'dotted' ? '0.01 4' : '4 4'
);
const iconColor = computed(
  () => props.toolbarTintColor || (luminance(props.backgroundColor) < 0.4 ? '#e5e5ea' : '#3c3c43')
);

const code = computed(() => {
  const lines = ['<SignatureInk', '  ref={ref}', '  style={{ height: 220 }}'];
  const str = (k: string, v: string) => lines.push(`  ${k}="${v}"`);
  const num = (k: string, v: number, d: number) => v !== d && lines.push(`  ${k}={${v}}`);
  str('penColor', props.penColor);
  num('penMinWidth', props.penMinWidth, 1);
  num('penMaxWidth', props.penMaxWidth, 3);
  num('velocityFilterWeight', props.velocityFilterWeight, 0.7);
  if (props.backgroundColor !== 'transparent') str('backgroundColor', props.backgroundColor);
  if (props.showBaseline) {
    lines.push('  showBaseline');
    if (props.baselineStyle !== 'dashed') str('baselineStyle', props.baselineStyle);
  }
  if (props.showToolbar) {
    lines.push('  showToolbar');
    if (props.toolbarPosition !== 'bottom') str('toolbarPosition', props.toolbarPosition);
    if (props.toolbarTintColor) str('toolbarTintColor', props.toolbarTintColor);
  }
  lines.push('  onChange={(e) => setSigned(!e.isEmpty)}', '/>');
  return lines.join('\n');
});
</script>

<template>
  <div class="rnsi-pad">
    <div class="rnsi-pad__head">
      <span class="rnsi-pad__badge">{{ t.badge }}</span>
      <span class="rnsi-pad__note">{{ t.note }}</span>
    </div>

    <div
      class="rnsi-pad__surface"
      :class="{
        'is-transparent': props.backgroundColor === 'transparent',
        'is-top': props.toolbarPosition === 'top',
      }"
      :style="props.backgroundColor !== 'transparent' ? { background: props.backgroundColor } : undefined"
    >
      <div class="rnsi-pad__canvas-wrap">
        <canvas
          ref="canvasEl"
          class="rnsi-pad__canvas"
          role="img"
          :aria-label="t.canvasLabel"
          @pointerdown="onDown"
          @pointermove="onMove"
          @pointerup="onUp"
          @pointercancel="onUp"
        />
        <svg v-if="props.showBaseline && size.w" class="rnsi-pad__baseline" aria-hidden="true">
          <line
            x1="16"
            :x2="size.w - 16"
            :y1="baselineY"
            :y2="baselineY"
            stroke="rgba(128,128,128,0.5)"
            :stroke-width="props.baselineStyle === 'dotted' ? 1.5 : 1"
            :stroke-dasharray="baselineDash"
            :stroke-linecap="props.baselineStyle === 'dotted' ? 'round' : 'butt'"
          />
        </svg>
        <div v-if="replayProgress !== null" class="rnsi-pad__progress" :style="{ width: `${replayProgress * 100}%` }" />
      </div>

      <div v-if="props.showToolbar" class="rnsi-pad__toolbar" :style="{ height: `${TOOLBAR_HEIGHT}px`, color: iconColor }">
        <button type="button" aria-label="Undo" :disabled="strokeCount === 0" @click="toolbarAction('undo')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5 4 10l5 5M4 10h10a5 5 0 0 1 0 10h-3" /></svg>
        </button>
        <button type="button" aria-label="Redo" :disabled="redoCount === 0" @click="toolbarAction('redo')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5 5 5-5 5m5-5H10a5 5 0 0 0 0 10h3" /></svg>
        </button>
        <button type="button" aria-label="Clear" @click="toolbarAction('clear')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" /></svg>
        </button>
        <button type="button" aria-label="Copy" @click="toolbarAction('copy')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h2" /></svg>
        </button>
      </div>
    </div>

    <div class="rnsi-pad__controls">
      <fieldset>
        <legend>{{ t.pen }}</legend>
        <div class="rnsi-pad__row">
          <span class="rnsi-pad__label">penColor</span>
          <button
            v-for="c in PEN_COLORS"
            :key="c"
            type="button"
            class="rnsi-pad__swatch"
            :class="{ 'is-active': props.penColor === c }"
            :style="{ background: c }"
            :aria-label="`penColor ${c}`"
            :aria-pressed="props.penColor === c"
            @click="props.penColor = c"
          />
          <input v-model="props.penColor" type="color" aria-label="penColor" />
        </div>
        <label class="rnsi-pad__row">
          <span class="rnsi-pad__label">penMinWidth</span>
          <input v-model.number="props.penMinWidth" type="range" min="0.5" max="8" step="0.5" />
          <output>{{ props.penMinWidth }}</output>
        </label>
        <label class="rnsi-pad__row">
          <span class="rnsi-pad__label">penMaxWidth</span>
          <input v-model.number="props.penMaxWidth" type="range" min="1" max="12" step="0.5" />
          <output>{{ props.penMaxWidth }}</output>
        </label>
        <label class="rnsi-pad__row">
          <span class="rnsi-pad__label">velocityFilterWeight</span>
          <input v-model.number="props.velocityFilterWeight" type="range" min="0" max="1" step="0.05" />
          <output>{{ props.velocityFilterWeight }}</output>
        </label>
      </fieldset>

      <fieldset>
        <legend>{{ t.canvas }}</legend>
        <label class="rnsi-pad__row">
          <span class="rnsi-pad__label">backgroundColor</span>
          <select v-model="props.backgroundColor">
            <option v-for="b in BACKGROUNDS" :key="b" :value="b">{{ b === 'transparent' ? t.transparent : b }}</option>
          </select>
        </label>
        <label class="rnsi-pad__row">
          <input v-model="props.showBaseline" type="checkbox" />
          <span class="rnsi-pad__label">showBaseline</span>
        </label>
        <label class="rnsi-pad__row">
          <span class="rnsi-pad__label">baselineStyle</span>
          <select v-model="props.baselineStyle" :disabled="!props.showBaseline">
            <option value="solid">solid</option>
            <option value="dashed">dashed</option>
            <option value="dotted">dotted</option>
          </select>
        </label>
        <label class="rnsi-pad__row">
          <input v-model="props.showToolbar" type="checkbox" />
          <span class="rnsi-pad__label">showToolbar</span>
        </label>
        <label class="rnsi-pad__row">
          <span class="rnsi-pad__label">toolbarPosition</span>
          <select v-model="props.toolbarPosition" :disabled="!props.showToolbar">
            <option value="bottom">bottom</option>
            <option value="top">top</option>
          </select>
        </label>
        <label class="rnsi-pad__row">
          <span class="rnsi-pad__label">toolbarTintColor</span>
          <select v-model="props.toolbarTintColor" :disabled="!props.showToolbar">
            <option v-for="c in TINTS" :key="c" :value="c">{{ c || t.platformDefault }}</option>
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend>{{ t.methods }}</legend>
        <div class="rnsi-pad__buttons">
          <button type="button" :disabled="strokeCount === 0" @click="undo">undo()</button>
          <button type="button" :disabled="redoCount === 0" @click="redo">redo()</button>
          <button type="button" @click="clear">clear()</button>
          <button type="button" :disabled="strokeCount === 0" @click="replay">replay()</button>
          <button type="button" @click="exportImage('png')">toBase64 png</button>
          <button type="button" @click="exportImage('jpeg')">toBase64 jpeg</button>
          <button type="button" @click="exportSvg">toSvg()</button>
          <button type="button" @click="exportStrokeData">getStrokeData()</button>
        </div>
        <label class="rnsi-pad__row">
          <input v-model="exportOpts.trim" type="checkbox" />
          <span class="rnsi-pad__label">{{ t.trim }}</span>
        </label>
        <label class="rnsi-pad__row">
          <span class="rnsi-pad__label">{{ t.speed }}</span>
          <select v-model.number="exportOpts.speed">
            <option :value="0.5">0.5</option>
            <option :value="1">1</option>
            <option :value="2">2</option>
          </select>
        </label>
      </fieldset>
    </div>

    <p class="rnsi-pad__status" role="status">{{ status }}</p>

    <div class="rnsi-pad__panels">
      <section>
        <h4>{{ t.events }}</h4>
        <ol v-if="events.length" class="rnsi-pad__events">
          <li v-for="e in events" :key="e.id"><code>{{ e.name }}</code> <span>{{ e.payload }}</span></li>
        </ol>
        <p v-else class="rnsi-pad__muted">{{ t.noEvents }}</p>
      </section>
      <section v-if="output">
        <h4>{{ t.output }}: <code>{{ output.title }}</code></h4>
        <template v-if="output.kind === 'image'">
          <img class="rnsi-pad__preview" :src="output.url" :alt="output.title" />
          <p class="rnsi-pad__muted">{{ output.w }} × {{ output.h }} px, {{ output.bytes.toLocaleString() }} {{ t.bytes }}</p>
        </template>
        <pre v-else class="rnsi-pad__text">{{ output.text.length > 600 ? `${output.text.slice(0, 600)}…` : output.text }}</pre>
        <a :href="output.url" :download="`signature.${output.ext}`">{{ t.download }}</a>
      </section>
    </div>

    <details class="rnsi-pad__code">
      <summary>{{ t.code }}</summary>
      <pre><code>{{ code }}</code></pre>
    </details>
  </div>
</template>

<style scoped>
.rnsi-pad {
  margin: 24px 0;
  padding: 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}

.rnsi-pad__head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: baseline;
  margin-bottom: 12px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.rnsi-pad__badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.rnsi-pad__surface {
  display: flex;
  flex-direction: column;
  height: 260px;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: #ffffff;
}

.rnsi-pad__surface.is-transparent {
  background-color: #ffffff;
  background-image: linear-gradient(45deg, #eeeef0 25%, transparent 25%),
    linear-gradient(-45deg, #eeeef0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #eeeef0 75%),
    linear-gradient(-45deg, transparent 75%, #eeeef0 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
}

.rnsi-pad__surface.is-top {
  flex-direction: column-reverse;
}

.rnsi-pad__canvas-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
}

.rnsi-pad__canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: crosshair;
}

.rnsi-pad__baseline {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.rnsi-pad__progress {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 3px;
  background: var(--vp-c-brand-1);
}

.rnsi-pad__toolbar {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 12px;
}

.rnsi-pad__toolbar button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  color: inherit;
}

.rnsi-pad__toolbar button:hover:not(:disabled) {
  background: rgba(128, 128, 128, 0.14);
}

.rnsi-pad__toolbar button:disabled {
  opacity: 0.4;
}

.rnsi-pad__toolbar button:focus-visible,
.rnsi-pad__buttons button:focus-visible,
.rnsi-pad__swatch:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.rnsi-pad__toolbar svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.rnsi-pad__controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.rnsi-pad__controls fieldset {
  min-width: 0;
  margin: 0;
  padding: 8px 12px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

.rnsi-pad__controls legend {
  padding: 0 4px;
  font-size: 13px;
  font-weight: 600;
}

.rnsi-pad__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 13px;
}

.rnsi-pad__label {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.rnsi-pad__row input[type='range'] {
  flex: 1;
  min-width: 80px;
  accent-color: var(--vp-c-brand-1);
}

.rnsi-pad__row input[type='checkbox'] {
  accent-color: var(--vp-c-brand-1);
}

.rnsi-pad__row output {
  min-width: 2.5em;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}

.rnsi-pad__row select {
  padding: 2px 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
}

.rnsi-pad__row input[type='color'] {
  width: 28px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: none;
}

.rnsi-pad__swatch {
  width: 22px;
  height: 22px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 50%;
}

.rnsi-pad__swatch.is-active {
  box-shadow: 0 0 0 2px var(--vp-c-bg), 0 0 0 4px var(--vp-c-brand-1);
}

.rnsi-pad__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.rnsi-pad__buttons button {
  padding: 4px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}

.rnsi-pad__buttons button:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.rnsi-pad__buttons button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.rnsi-pad__status {
  min-height: 1.5em;
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.rnsi-pad__panels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.rnsi-pad__panels h4 {
  margin: 8px 0;
  font-size: 14px;
}

.rnsi-pad__events {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
}

.rnsi-pad__events li {
  padding: 2px 0;
  overflow-wrap: anywhere;
}

.rnsi-pad__events span,
.rnsi-pad__muted {
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.rnsi-pad__preview {
  max-width: 100%;
  max-height: 160px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background-color: #ffffff;
  background-image: linear-gradient(45deg, #eeeef0 25%, transparent 25%),
    linear-gradient(-45deg, #eeeef0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #eeeef0 75%),
    linear-gradient(-45deg, transparent 75%, #eeeef0 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0;
}

.rnsi-pad__text {
  max-height: 160px;
  margin: 0 0 8px;
  padding: 8px;
  overflow: auto;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-all;
}

.rnsi-pad__code {
  margin-top: 12px;
  font-size: 13px;
}

.rnsi-pad__code summary {
  cursor: pointer;
  font-weight: 600;
}

.rnsi-pad__code pre {
  margin: 8px 0 0;
  padding: 12px;
  overflow-x: auto;
  border-radius: 8px;
  background: var(--vp-code-block-bg);
  font-size: 12px;
  line-height: 1.6;
}
</style>
