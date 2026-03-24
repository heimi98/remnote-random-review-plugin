import React, { useEffect, useRef, useState } from 'react';
import { usePlugin, renderWidget } from '@remnote/plugin-sdk';
import {
  NO_REVIEWABLE_DOCUMENTS_MESSAGE,
  openPreparedRandomDocument,
  prepareWeightedRandomDocument,
  primeRandomReviewCache,
} from '../random_review_service';
import { RANDOM_REVIEW_BUTTON_STYLES } from './random_review_button_styles';

type ButtonPhase = 'idle' | 'pressing' | 'rolling' | 'loading';
type ThemeMode = 'light' | 'dark';

const ROLL_DURATION_MS = 320;
const BURST_DURATION_MS = 560;
const ROLL_TICK_MS = 72;
const DARK_THEME_REGEX = /(^|[\s:_-])(dark(?:mode|theme)?|night|dim)(?=$|[\s:_-])/i;
const LIGHT_THEME_REGEX = /(^|[\s:_-])(light(?:mode|theme)?|day)(?=$|[\s:_-])/i;
const THEME_ATTRIBUTE_NAMES = ['data-theme', 'data-color-mode', 'data-theme-mode', 'theme', 'color-scheme', 'data-mode'];

const DICE_PIPS: Record<number, { cx: number; cy: number }[]> = {
  1: [{ cx: 12, cy: 12 }],
  2: [
    { cx: 8, cy: 8 },
    { cx: 16, cy: 16 },
  ],
  3: [
    { cx: 8, cy: 8 },
    { cx: 12, cy: 12 },
    { cx: 16, cy: 16 },
  ],
  4: [
    { cx: 8, cy: 8 },
    { cx: 16, cy: 8 },
    { cx: 8, cy: 16 },
    { cx: 16, cy: 16 },
  ],
  5: [
    { cx: 8, cy: 8 },
    { cx: 16, cy: 8 },
    { cx: 12, cy: 12 },
    { cx: 8, cy: 16 },
    { cx: 16, cy: 16 },
  ],
  6: [
    { cx: 8, cy: 7.5 },
    { cx: 16, cy: 7.5 },
    { cx: 8, cy: 12 },
    { cx: 16, cy: 12 },
    { cx: 8, cy: 16.5 },
    { cx: 16, cy: 16.5 },
  ],
};

const BURST_PARTICLES = [
  { angle: -110, distance: 28, size: 8, delay: 0, duration: 540, lightColor: '#ff8db8', darkColor: '#ff69ac' },
  { angle: -82, distance: 34, size: 7, delay: 20, duration: 520, lightColor: '#ffb37d', darkColor: '#ff9d66' },
  { angle: -55, distance: 38, size: 6, delay: 40, duration: 560, lightColor: '#ffe18a', darkColor: '#ffd966' },
  { angle: -22, distance: 30, size: 8, delay: 0, duration: 500, lightColor: '#87e8b8', darkColor: '#5ef0be' },
  { angle: 8, distance: 36, size: 7, delay: 35, duration: 520, lightColor: '#82e9e1', darkColor: '#56ebea' },
  { angle: 36, distance: 32, size: 6, delay: 15, duration: 550, lightColor: '#92d6ff', darkColor: '#5cc5ff' },
  { angle: 64, distance: 40, size: 7, delay: 50, duration: 540, lightColor: '#9dacff', darkColor: '#7d95ff' },
  { angle: 94, distance: 34, size: 8, delay: 25, duration: 560, lightColor: '#c7abff', darkColor: '#af83ff' },
  { angle: 124, distance: 28, size: 6, delay: 10, duration: 500, lightColor: '#ff9bc9', darkColor: '#ff74b6' },
  { angle: 154, distance: 36, size: 7, delay: 45, duration: 560, lightColor: '#ffc3da', darkColor: '#ff99c8' },
  { angle: 178, distance: 30, size: 8, delay: 20, duration: 530, lightColor: '#ffaba8', darkColor: '#ff897f' },
  { angle: 208, distance: 26, size: 6, delay: 0, duration: 510, lightColor: '#ffd4ad', darkColor: '#ffb875' },
];

function randomDiceFace() {
  return Math.floor(Math.random() * 6) + 1;
}

function normalizeThemeValue(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  return value.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
}

function parseThemeModeFromValue(value: string | null | undefined): ThemeMode | undefined {
  const normalizedValue = normalizeThemeValue(value);

  if (!normalizedValue) {
    return undefined;
  }

  if (DARK_THEME_REGEX.test(normalizedValue)) {
    return 'dark';
  }

  if (LIGHT_THEME_REGEX.test(normalizedValue)) {
    return 'light';
  }

  return undefined;
}

function parseThemeModeFromElement(element: Element | null): ThemeMode | undefined {
  if (!element) {
    return undefined;
  }

  for (const attributeName of THEME_ATTRIBUTE_NAMES) {
    const mode = parseThemeModeFromValue(element.getAttribute(attributeName));

    if (mode) {
      return mode;
    }
  }

  const className = element instanceof HTMLElement ? element.className : element.getAttribute('class');
  const classMode = parseThemeModeFromValue(typeof className === 'string' ? className : undefined);

  if (classMode) {
    return classMode;
  }

  for (const attributeName of element.getAttributeNames()) {
    if (THEME_ATTRIBUTE_NAMES.includes(attributeName) || attributeName === 'class') {
      continue;
    }

    if (!/(theme|mode|scheme|appearance)/i.test(attributeName)) {
      continue;
    }

    const mode = parseThemeModeFromValue(element.getAttribute(attributeName));

    if (mode) {
      return mode;
    }
  }

  return undefined;
}

function parseBackgroundColor(color: string) {
  const match = color.match(/rgba?\(([^)]+)\)/i);

  if (!match) {
    return undefined;
  }

  const channels = match[1]
    .split(/[,\s/]+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((part) => Number(part));

  if (channels.length < 3 || channels.slice(0, 3).some((channel) => Number.isNaN(channel))) {
    return undefined;
  }

  return {
    red: channels[0],
    green: channels[1],
    blue: channels[2],
    alpha: channels[3] ?? 1,
  };
}

function getRelativeLuminance(red: number, green: number, blue: number) {
  const normalize = (channel: number) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * normalize(red) + 0.7152 * normalize(green) + 0.0722 * normalize(blue);
}

function getThemeModeFromBackgroundColor(color: string): ThemeMode | undefined {
  const parsedColor = parseBackgroundColor(color);

  if (!parsedColor || parsedColor.alpha <= 0.05) {
    return undefined;
  }

  const luminance = getRelativeLuminance(parsedColor.red, parsedColor.green, parsedColor.blue);
  return luminance < 0.42 ? 'dark' : 'light';
}

function getParentElement(element: Element) {
  if (element.parentElement) {
    return element.parentElement;
  }

  const rootNode = element.getRootNode();
  return rootNode instanceof ShadowRoot ? rootNode.host : null;
}

function detectThemeMode(widgetElement: HTMLElement | null): ThemeMode {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 'light';
  }

  const rootThemeMode =
    parseThemeModeFromElement(document.documentElement) ??
    parseThemeModeFromElement(document.body);

  if (rootThemeMode) {
    return rootThemeMode;
  }

  let currentElement: Element | null = widgetElement;

  while (currentElement) {
    const backgroundThemeMode = getThemeModeFromBackgroundColor(
      window.getComputedStyle(currentElement).backgroundColor
    );

    if (backgroundThemeMode) {
      return backgroundThemeMode;
    }

    currentElement = getParentElement(currentElement);
  }

  const documentBackgroundThemeMode =
    getThemeModeFromBackgroundColor(window.getComputedStyle(document.body).backgroundColor) ??
    getThemeModeFromBackgroundColor(window.getComputedStyle(document.documentElement).backgroundColor);

  if (documentBackgroundThemeMode) {
    return documentBackgroundThemeMode;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function useThemeMode(widgetElementRef: React.RefObject<HTMLElement>) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => detectThemeMode(null));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return undefined;
    }

    const refreshThemeMode = () => {
      const nextThemeMode = detectThemeMode(widgetElementRef.current);
      setThemeMode((currentThemeMode) => (currentThemeMode === nextThemeMode ? currentThemeMode : nextThemeMode));
    };

    refreshThemeMode();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const mutationObserver = new MutationObserver(() => {
      refreshThemeMode();
    });

    mutationObserver.observe(document.documentElement, { attributes: true, attributeOldValue: false });

    if (document.body) {
      mutationObserver.observe(document.body, { attributes: true, attributeOldValue: false });
    }

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', refreshThemeMode);
    } else {
      mediaQuery.addListener(refreshThemeMode);
    }

    return () => {
      mutationObserver.disconnect();

      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', refreshThemeMode);
      } else {
        mediaQuery.removeListener(refreshThemeMode);
      }
    };
  }, [widgetElementRef]);

  return themeMode;
}

function sleep(durationMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

// 随机回顾按钮组件
const RandomReviewButton = () => {
  const plugin = usePlugin();
  const [phase, setPhase] = useState<ButtonPhase>('idle');
  const [diceFace, setDiceFace] = useState(5);
  const [burstKey, setBurstKey] = useState(0);
  const [isBurstVisible, setIsBurstVisible] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const rollingIntervalRef = useRef<number | undefined>(undefined);
  const burstTimeoutRef = useRef<number | undefined>(undefined);
  const busyRef = useRef(false);
  const themeMode = useThemeMode(widgetRef);
  const isBusy = phase === 'rolling' || phase === 'loading';

  useEffect(() => {
    primeRandomReviewCache(plugin);
  }, [plugin]);

  useEffect(() => {
    return () => {
      if (rollingIntervalRef.current) {
        window.clearInterval(rollingIntervalRef.current);
      }

      if (burstTimeoutRef.current) {
        window.clearTimeout(burstTimeoutRef.current);
      }
    };
  }, []);

  const startBurst = () => {
    if (burstTimeoutRef.current) {
      window.clearTimeout(burstTimeoutRef.current);
    }

    setBurstKey((current) => current + 1);
    setIsBurstVisible(true);

    burstTimeoutRef.current = window.setTimeout(() => {
      setIsBurstVisible(false);
    }, BURST_DURATION_MS);
  };

  const startRollingFaces = (finalFace: number) => {
    if (rollingIntervalRef.current) {
      window.clearInterval(rollingIntervalRef.current);
    }

    rollingIntervalRef.current = window.setInterval(() => {
      setDiceFace(randomDiceFace());
    }, ROLL_TICK_MS);

    return () => {
      if (rollingIntervalRef.current) {
        window.clearInterval(rollingIntervalRef.current);
        rollingIntervalRef.current = undefined;
      }

      setDiceFace(finalFace);
    };
  };

  // 处理随机回顾操作
  const handleRandomReview = async () => {
    if (busyRef.current || isBusy) return;

    busyRef.current = true;

    const finalFace = randomDiceFace();
    let selectionResolved = false;
    const stopRollingFaces = startRollingFaces(finalFace);

    setPhase('rolling');
    startBurst();

    const documentPromise = prepareWeightedRandomDocument(plugin)
      .then((document) => {
        selectionResolved = true;
        return document;
      })
      .catch((error) => {
        selectionResolved = true;
        throw error;
      });

    try {
      await sleep(ROLL_DURATION_MS);
      stopRollingFaces();

      if (!selectionResolved) {
        setPhase('loading');
      }

      const document = await documentPromise;

      if (!document) {
        plugin.app.toast(NO_REVIEWABLE_DOCUMENTS_MESSAGE).catch(() => {});
        setPhase('idle');
        busyRef.current = false;
        return;
      }

      await openPreparedRandomDocument(plugin, document);
      setPhase('idle');
      busyRef.current = false;
    } catch (error) {
      console.error('Unexpected error:', error);
      plugin.app.toast('An unexpected error occurred.').catch(() => {});
      stopRollingFaces();
      setPhase('idle');
      busyRef.current = false;
    }
  };

  // 渲染按钮和图标
  return (
    <div ref={widgetRef} className="random-review-widget" data-theme-mode={themeMode}>
      <style>{RANDOM_REVIEW_BUTTON_STYLES}</style>
      <button
        type="button"
        onClick={handleRandomReview}
        onPointerDown={() => {
          if (!isBusy) {
            setPhase('pressing');
          }
        }}
        onPointerUp={() => {
          setPhase((current) => (current === 'pressing' ? 'idle' : current));
        }}
        onPointerLeave={() => {
          setPhase((current) => (current === 'pressing' ? 'idle' : current));
        }}
        onKeyDown={(event) => {
          if (!isBusy && (event.key === 'Enter' || event.key === ' ')) {
            setPhase('pressing');
          }
        }}
        onKeyUp={() => {
          setPhase((current) => (current === 'pressing' ? 'idle' : current));
        }}
        disabled={isBusy}
        className={`random-review-button phase-${phase}`}
        data-theme-mode={themeMode}
        title="Roll for a random document"
        aria-label="Roll for a random document"
      >
        <span className="random-review-button__glow" />
        {isBurstVisible && (
          <span className="random-review-burst" aria-hidden="true">
            {BURST_PARTICLES.map((particle, index) => (
              <span
                key={`${burstKey}-${index}`}
                className="random-review-burst__particle"
                style={
                  {
                    '--rr-angle': `${particle.angle}deg`,
                    '--rr-distance': `${particle.distance}px`,
                    '--rr-size': `${particle.size}px`,
                    '--rr-delay': `${particle.delay}ms`,
                    '--rr-duration': `${particle.duration}ms`,
                    '--rr-color': themeMode === 'dark' ? particle.darkColor : particle.lightColor,
                  } as React.CSSProperties
                }
              />
            ))}
          </span>
        )}
        <span className="random-review-button__face">
          <svg
            className="random-review-button__icon"
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            {DICE_PIPS[diceFace].map((pip, index) => (
              <circle key={`${diceFace}-${index}`} cx={pip.cx} cy={pip.cy} r="1.15" fill="currentColor" />
            ))}
          </svg>
        </span>
        {phase === 'loading' && <span className="random-review-button__loader" aria-hidden="true" />}
      </button>
    </div>
  );
};

renderWidget(RandomReviewButton);
