import { useEffect, useState } from "react";
import { animate } from "framer-motion";

interface Props {
  value: number;
  format?: (v: number) => string;
  duration?: number;
  className?: string;
}

export function AnimatedNumber({ value, format = (v) => v.toFixed(0), duration = 0.8, className }: Props) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const controls = animate(display, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <span className={className}>{format(display)}</span>;
}
