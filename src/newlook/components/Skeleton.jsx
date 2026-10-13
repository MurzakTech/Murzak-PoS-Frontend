import React, { useEffect, useState } from 'react';

/**
 * Skeletons: grey shapes where content will be (Part 1, Components). Shown only after 200ms of loading, so a
 * quick answer never flashes them; never a spinner over a blank page. While they wait, the space they will fill
 * is already reserved, so the page does not jump when the content arrives (layout shift under 0.1).
 * The shimmer stops when the device asks for reduced motion.
 */
export const SKELETON_DELAY_MS = 200;

/** true once `on` has been true for `delay` ms; false again as soon as it is not */
export const useDelayedFlag = (on, delay = SKELETON_DELAY_MS) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!on) {
      setReady(false);
      return undefined;
    }
    const timer = setTimeout(() => setReady(true), delay);
    return () => clearTimeout(timer);
  }, [on, delay]);
  return on && ready;
};

/** One grey shape. width and height are CSS lengths, normally design tokens such as var(--space-4). */
export const Skeleton = ({ width = '100%', height = 'var(--space-4)', radius = 'var(--radius-button-small)', className = '' }) => (
  <span className={`nl-skeleton ${className}`.trim()} style={{ width, height, borderRadius: radius }} aria-hidden="true" />
);

/** Lines of text, the last one shorter */
export const SkeletonText = ({ lines = 3 }) => (
  <div className="nl-skeleton-text" aria-hidden="true">
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton key={i} width={i === lines - 1 && lines > 1 ? '60%' : '100%'} />
    ))}
  </div>
);

/** Rows of cells that stand in for a table while it loads */
export const SkeletonRows = ({ rows = 8, columns = 5 }) => (
  <div className="nl-skeleton-rows" aria-hidden="true">
    {Array.from({ length: rows }, (_, r) => (
      <div className="nl-skeleton-row" key={r} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }, (_, c) => (
          <Skeleton key={c} width={c === 0 ? '70%' : '55%'} />
        ))}
      </div>
    ))}
  </div>
);

/**
 * Wraps content that is loading. While `loading` is true the region is marked busy and reserves `minHeight`;
 * after 200ms it shows `skeleton`. When loading ends it shows `children`.
 */
export const LoadingGate = ({ loading, skeleton, minHeight, children, label = 'Loading' }) => {
  const showSkeleton = useDelayedFlag(loading);
  if (!loading) return children;
  return (
    <div className="nl-loading" aria-busy="true" style={{ minHeight }}>
      <span className="nl-visually-hidden" role="status">
        {label}
      </span>
      {showSkeleton ? skeleton : null}
    </div>
  );
};
