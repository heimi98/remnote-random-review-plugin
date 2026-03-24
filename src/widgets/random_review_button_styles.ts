export const RANDOM_REVIEW_BUTTON_STYLES = String.raw`
.random-review-widget {
  padding: 10px 8px;
  --rr-button-border: rgba(255, 255, 255, 0.82);
  --rr-button-fill:
    radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.25) 28%, rgba(255, 255, 255, 0) 52%),
    linear-gradient(145deg, #ffb7d1 0%, #ffd1ac 48%, #bfe6ff 100%);
  --rr-button-sheen: linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.14));
  --rr-button-gloss: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.12));
  --rr-icon-color: #5b6778;
  --rr-dice-pip-color: #83556d;
  --rr-icon-shadow: drop-shadow(0 2px 3px rgba(41, 68, 112, 0.14));
  --rr-shadow-idle:
    0 10px 24px rgba(232, 143, 178, 0.24),
    0 12px 28px rgba(104, 155, 216, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.98),
    inset 0 -10px 18px rgba(166, 190, 255, 0.14);
  --rr-shadow-hover:
    0 16px 30px rgba(238, 143, 178, 0.28),
    0 18px 34px rgba(104, 155, 216, 0.22),
    0 0 0 1px rgba(255, 255, 255, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.98),
    inset 0 -10px 18px rgba(166, 190, 255, 0.2);
  --rr-shadow-pressing:
    0 6px 14px rgba(232, 143, 178, 0.22),
    0 8px 16px rgba(104, 155, 216, 0.16),
    inset 0 2px 8px rgba(255, 255, 255, 0.22),
    inset 0 -10px 18px rgba(126, 162, 255, 0.18);
  --rr-shadow-loading:
    0 12px 26px rgba(232, 143, 178, 0.26),
    0 14px 28px rgba(104, 155, 216, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.98),
    inset 0 -10px 18px rgba(166, 190, 255, 0.18);
  --rr-glow-background: radial-gradient(circle, rgba(255, 153, 191, 0.28), rgba(128, 181, 255, 0.18) 46%, transparent 74%);
  --rr-loader-track: rgba(63, 102, 165, 0.14);
  --rr-loader-accent: rgba(63, 102, 165, 0.78);
  --rr-loader-secondary: rgba(255, 255, 255, 0.72);
  --rr-loader-glow: rgba(255, 192, 208, 0.28);
  --rr-particle-glow: rgba(255, 255, 255, 0.78);
  --rr-hover-filter: saturate(1.06) brightness(1.01);
}

.random-review-widget[data-theme-mode='dark'] {
  --rr-button-border: rgba(255, 196, 244, 0.26);
  --rr-button-fill:
    radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0.08) 24%, rgba(255, 255, 255, 0) 52%),
    linear-gradient(145deg, #5a2e73 0%, #8a356f 42%, #365bb3 100%);
  --rr-button-sheen: linear-gradient(180deg, rgba(255, 219, 246, 0.3), rgba(255, 255, 255, 0.02));
  --rr-button-gloss: linear-gradient(180deg, rgba(255, 224, 247, 0.4), rgba(255, 255, 255, 0));
  --rr-icon-color: #fff4ec;
  --rr-dice-pip-color: #ffd7e6;
  --rr-icon-shadow: drop-shadow(0 2px 5px rgba(255, 214, 248, 0.12));
  --rr-shadow-idle:
    0 14px 32px rgba(14, 8, 37, 0.46),
    0 0 0 1px rgba(255, 174, 230, 0.16),
    inset 0 1px 0 rgba(255, 225, 245, 0.18),
    inset 0 -12px 22px rgba(33, 55, 120, 0.28);
  --rr-shadow-hover:
    0 18px 36px rgba(12, 7, 32, 0.54),
    0 0 0 1px rgba(255, 174, 230, 0.26),
    0 0 18px rgba(123, 112, 255, 0.28),
    0 0 26px rgba(255, 109, 172, 0.18),
    inset 0 1px 0 rgba(255, 225, 245, 0.24),
    inset 0 -12px 24px rgba(33, 55, 120, 0.32);
  --rr-shadow-pressing:
    0 8px 18px rgba(12, 7, 32, 0.5),
    0 0 0 1px rgba(255, 174, 230, 0.2),
    inset 0 2px 8px rgba(255, 225, 245, 0.14),
    inset 0 -10px 18px rgba(33, 55, 120, 0.24);
  --rr-shadow-loading:
    0 16px 34px rgba(12, 7, 32, 0.56),
    0 0 0 1px rgba(255, 174, 230, 0.24),
    0 0 22px rgba(123, 112, 255, 0.24),
    inset 0 1px 0 rgba(255, 225, 245, 0.24),
    inset 0 -12px 24px rgba(33, 55, 120, 0.32);
  --rr-glow-background: radial-gradient(circle, rgba(152, 115, 255, 0.42), rgba(255, 101, 177, 0.22) 44%, transparent 74%);
  --rr-loader-track: rgba(255, 255, 255, 0.12);
  --rr-loader-accent: rgba(154, 224, 255, 0.96);
  --rr-loader-secondary: rgba(255, 155, 214, 0.48);
  --rr-loader-glow: rgba(118, 194, 255, 0.3);
  --rr-particle-glow: rgba(174, 216, 255, 0.66);
  --rr-hover-filter: saturate(1.08) brightness(1.08);
}

.random-review-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border: 1px solid var(--rr-button-border);
  border-radius: 999px;
  background: var(--rr-button-fill);
  color: var(--rr-icon-color);
  box-shadow: var(--rr-shadow-idle);
  cursor: pointer;
  transition:
    transform 160ms ease,
    box-shadow 220ms ease,
    color 220ms ease,
    background 220ms ease,
    filter 220ms ease,
    border-color 220ms ease;
  isolation: isolate;
  overflow: hidden;
}

.random-review-button::before,
.random-review-button::after {
  content: '';
  position: absolute;
  pointer-events: none;
  border-radius: inherit;
}

.random-review-button::before {
  inset: 1px;
  z-index: 0;
  background: var(--rr-button-sheen);
}

.random-review-button::after {
  top: 6px;
  left: 10px;
  right: 10px;
  height: 18px;
  z-index: 1;
  border-radius: 999px;
  background: var(--rr-button-gloss);
  opacity: 0.96;
}

.random-review-button:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.02);
  box-shadow: var(--rr-shadow-hover);
  filter: var(--rr-hover-filter);
}

.random-review-button:disabled {
  cursor: wait;
}

.random-review-button.phase-pressing {
  transform: translateY(1px) scale(0.96);
  box-shadow: var(--rr-shadow-pressing);
  filter: none;
}

.random-review-button.phase-rolling {
  animation: random-review-roll 320ms cubic-bezier(0.24, 0.84, 0.32, 1);
}

.random-review-button.phase-loading {
  transform: translateY(-1px);
  box-shadow: var(--rr-shadow-loading);
}

.random-review-button__glow {
  position: absolute;
  inset: 4px;
  border-radius: inherit;
  z-index: 1;
  background: var(--rr-glow-background);
  opacity: 0;
  transition: opacity 180ms ease;
}

.random-review-button:hover .random-review-button__glow,
.random-review-button.phase-rolling .random-review-button__glow,
.random-review-button.phase-loading .random-review-button__glow {
  opacity: 1;
}

.random-review-button__face {
  position: relative;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.random-review-button__icon {
  filter: var(--rr-icon-shadow);
}

.random-review-button__icon circle {
  fill: var(--rr-dice-pip-color);
}

.random-review-button__loader {
  position: absolute;
  inset: 7px;
  z-index: 2;
  border-radius: 999px;
  border: 2px solid var(--rr-loader-track);
  border-top-color: var(--rr-loader-accent);
  box-shadow:
    0 0 0 1px var(--rr-loader-secondary),
    0 0 12px var(--rr-loader-glow);
  animation: random-review-spin 800ms linear infinite;
}

.random-review-burst {
  position: absolute;
  inset: -8px;
  z-index: 0;
  pointer-events: none;
}

.random-review-burst__particle {
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--rr-size);
  height: var(--rr-size);
  margin-left: calc(var(--rr-size) / -2);
  margin-top: calc(var(--rr-size) / -2);
  border-radius: 999px;
  background: var(--rr-color);
  opacity: 0;
  transform: rotate(var(--rr-angle)) translateY(0) scale(0.4);
  animation: random-review-burst var(--rr-duration) cubic-bezier(0.12, 0.82, 0.24, 1) forwards;
  animation-delay: var(--rr-delay);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.16),
    0 0 10px var(--rr-particle-glow);
}

@keyframes random-review-roll {
  0% {
    transform: scale(1) rotate(0deg);
  }

  24% {
    transform: translateY(-3px) scale(1.04) rotate(-13deg);
  }

  52% {
    transform: translateY(-1px) scale(0.98) rotate(10deg);
  }

  78% {
    transform: translateY(-2px) scale(1.02) rotate(-5deg);
  }

  100% {
    transform: scale(1) rotate(0deg);
  }
}

@keyframes random-review-burst {
  0% {
    opacity: 0;
    transform: rotate(var(--rr-angle)) translateY(0) scale(0.4);
  }

  12% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: rotate(var(--rr-angle)) translateY(calc(var(--rr-distance) * -1)) scale(1);
  }
}

@keyframes random-review-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
`;
