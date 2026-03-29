export const RANDOM_REVIEW_BUTTON_STYLES = String.raw`
.random-review-widget {
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  --rr-button-border: rgba(255, 222, 250, 0.72);
  --rr-button-fill:
    radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.52) 0%, rgba(255, 255, 255, 0.2) 24%, rgba(255, 255, 255, 0) 52%),
    linear-gradient(145deg, #a46fd0 0%, #cc78b7 42%, #76a0f0 100%);
  --rr-button-sheen: linear-gradient(180deg, rgba(255, 238, 252, 0.64), rgba(255, 255, 255, 0.14));
  --rr-button-gloss: linear-gradient(180deg, rgba(255, 243, 253, 0.7), rgba(255, 255, 255, 0.12));
  --rr-icon-color: var(--rr-rating-button-border-solid);
  --rr-dice-pip-color: var(--rr-rating-button-border-solid);
  --rr-icon-shadow: none;
  --rr-shadow-idle: none;
  --rr-shadow-hover: none;
  --rr-shadow-pressing: none;
  --rr-shadow-loading: none;
  --rr-glow-background: radial-gradient(circle, rgba(185, 149, 255, 0.36), rgba(255, 129, 192, 0.2) 44%, transparent 74%);
  --rr-loader-track: rgba(255, 255, 255, 0.12);
  --rr-loader-accent: rgba(154, 224, 255, 0.96);
  --rr-loader-secondary: rgba(255, 155, 214, 0.48);
  --rr-loader-glow: rgba(118, 194, 255, 0.3);
  --rr-particle-glow: rgba(174, 216, 255, 0.66);
  --rr-idle-filter: brightness(1.08);
  --rr-hover-filter: saturate(1.08) brightness(1.16);
  --rr-rating-panel-bg: rgba(166, 147, 238, 0.22);
  --rr-rating-panel-border: rgba(150, 133, 232, 0.52);
  --rr-rating-title-color: #4f46a5;
  --rr-rating-button-bg: rgba(186, 170, 248, 0.3);
  --rr-rating-button-border: rgba(149, 131, 230, 0.62);
  --rr-rating-button-border-solid: #9583e6;
  --rr-rating-button-color: #3949ab;
  --rr-rating-skip-bg: rgba(243, 244, 246, 0.82);
  --rr-rating-skip-border: rgba(156, 163, 175, 0.46);
  --rr-rating-skip-color: #4b5563;
}

.random-review-widget[data-theme-mode='dark'] {
  --rr-button-border: rgba(214, 160, 236, 0.42);
  --rr-button-fill:
    radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0.08) 24%, rgba(255, 255, 255, 0) 52%),
    linear-gradient(145deg, #6d4393 0%, #8f4e86 42%, #496dc0 100%);
  --rr-button-sheen: linear-gradient(180deg, rgba(255, 225, 247, 0.36), rgba(255, 255, 255, 0.04));
  --rr-button-gloss: linear-gradient(180deg, rgba(255, 229, 249, 0.44), rgba(255, 255, 255, 0.02));
  --rr-glow-background: radial-gradient(circle, rgba(124, 94, 214, 0.32), rgba(226, 92, 151, 0.16) 44%, transparent 74%);
  --rr-idle-filter: none;
  --rr-hover-filter: saturate(1.05) brightness(1.03);
  --rr-icon-color: var(--rr-rating-button-border-solid);
  --rr-dice-pip-color: var(--rr-rating-button-border-solid);
  --rr-rating-panel-bg: rgba(66, 48, 112, 0.56);
  --rr-rating-panel-border: rgba(167, 147, 238, 0.5);
  --rr-rating-title-color: #dfd7ff;
  --rr-rating-button-bg: rgba(98, 73, 162, 0.66);
  --rr-rating-button-border: rgba(183, 162, 250, 0.58);
  --rr-rating-button-border-solid: #cfc0ff;
  --rr-rating-button-color: #efeafe;
  --rr-rating-skip-bg: rgba(58, 58, 72, 0.74);
  --rr-rating-skip-border: rgba(170, 170, 182, 0.34);
  --rr-rating-skip-color: #e6e7ee;
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
  filter: var(--rr-idle-filter);
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
  margin: 0 auto;
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
  cursor: not-allowed;
  opacity: 0.9;
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
  box-shadow: none;
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
  box-shadow: none;
}

.random-review-widget__rating {
  margin-top: 10px;
  padding: 6px;
  border-radius: 12px;
  border: 1px solid var(--rr-rating-panel-border);
  background: var(--rr-rating-panel-bg);
  display: grid;
  gap: 6px;
}

.random-review-widget__rating-actions {
  display: flex;
  justify-content: center;
  gap: 5px;
}

.random-review-widget__rating-button {
  border: 1px solid var(--rr-rating-button-border);
  border-radius: 8px;
  background: var(--rr-rating-button-bg);
  color: var(--rr-rating-button-color);
  width: 25px;
  height: 25px;
  font-size: 19px;
  line-height: 1;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 120ms ease, filter 120ms ease;
}

.random-review-widget__rating-button:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.06);
}

.random-review-widget__rating-button:disabled {
  opacity: 0.55;
  cursor: wait;
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
