<script setup lang="ts">
// A mock SignatureInk view: a signature being written above a dashed
// baseline, with the default undo / redo / clear / copy toolbar.
const signature =
  'M58 168c14-2 26-24 32-48s4-40-8-34-12 46 0 74 26 8 32-12 6-30 14-18-2 38 8 36 16-28 26-26-2 26 8 24 18-14 26-16 4 22 14 22 18-30 30-30-4 30 6 30 22-18 34-22 8 14 18 12 30-8 46-12';
const flourish = 'M96 196c40 6 120 2 214-14';
</script>

<template>
  <svg
    class="hero-art"
    viewBox="0 0 400 300"
    role="img"
    aria-label="A signature being written in emerald ink above a dashed baseline, with undo, redo, clear and copy buttons"
  >
    <defs>
      <linearGradient id="rnsi-ink" x1="40" y1="60" x2="360" y2="220" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#34d399" />
        <stop offset="0.55" stop-color="#10b981" />
        <stop offset="1" stop-color="#0f766e" />
      </linearGradient>
    </defs>

    <!-- canvas card -->
    <rect class="card" x="16" y="26" width="368" height="248" rx="18" />

    <!-- ink -->
    <path class="ink" :d="signature" pathLength="1" />
    <path class="ink flourish" :d="flourish" pathLength="1" />

    <!-- baseline (anchored to the toolbar's top edge, as on device) -->
    <path class="baseline" d="M32 222h336" />

    <!-- toolbar: right-aligned icons -->
    <g class="toolbar" transform="translate(236 236)">
      <!-- undo -->
      <path d="M14 8 8 14l6 6M8 14h12a6 6 0 0 1 0 12h-4" />
      <!-- redo -->
      <path d="m48 8 6 6-6 6M54 14H42a6 6 0 0 0 0 12h4" />
      <!-- clear (trash) -->
      <path d="M72 11h20M78 11V8h8v3M75 11l1.5 17h11L89 11M80 15v9M84 15v9" />
      <!-- copy -->
      <rect x="106" y="8" width="13" height="15" rx="2.5" />
      <path d="M111 26h10a2.5 2.5 0 0 0 2.5-2.5V12" />
    </g>
  </svg>
</template>

<style scoped>
.hero-art {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 300px;
  transform: translate(-50%, -50%);
}

@media (min-width: 640px) {
  .hero-art {
    width: 360px;
  }
}

@media (min-width: 960px) {
  .hero-art {
    width: 400px;
  }
}

.card {
  fill: var(--vp-c-bg);
  stroke: var(--vp-c-divider);
  stroke-width: 1.5;
}

.ink {
  fill: none;
  stroke: url(#rnsi-ink);
  stroke-width: 5;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: rnsi-write 3.2s cubic-bezier(0.45, 0.05, 0.4, 1) 0.3s forwards;
}

.flourish {
  stroke-width: 3;
  animation-duration: 0.9s;
  animation-delay: 3.4s;
}

.baseline {
  stroke: var(--vp-c-text-3);
  stroke-width: 1.5;
  stroke-dasharray: 6 6;
  opacity: 0.7;
}

.toolbar path,
.toolbar rect {
  fill: none;
  stroke: var(--vp-c-brand-1);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@keyframes rnsi-write {
  to {
    stroke-dashoffset: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ink {
    animation: none;
    stroke-dashoffset: 0;
  }
}
</style>
