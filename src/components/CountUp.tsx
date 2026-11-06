import { useEffect, useState } from 'react';
import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from 'framer-motion';

/** Counts up to `value` on mount and glides to new values when it changes. */
export function CountUp({ value, format }: { value: number; format: (value: number) => string }) {
  const reduceMotion = useReducedMotion();
  const target = Number(value) || 0;
  const current = useMotionValue(reduceMotion ? target : 0);
  const [text, setText] = useState(() => format(reduceMotion ? target : 0));
  useMotionValueEvent(current, 'change', latest => setText(format(latest)));
  useEffect(() => {
    const controls = animate(current, target, { duration: reduceMotion ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [target, reduceMotion]);
  return <>{text}</>;
}
