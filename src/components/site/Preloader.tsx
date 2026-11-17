import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dumbbell } from "lucide-react";

export function Preloader() {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 1050;
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // Ease out cubic for crisp acceleration -> precision settle
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.round(eased * 100));
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setTimeout(() => setVisible(false), 160);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="f365-preloader"
          initial={{ y: 0, opacity: 1 }}
          exit={{
            y: "-100%",
            transition: { duration: 0.65, ease: [0.76, 0, 0.24, 1] },
          }}
          className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden select-none"
        >
          {/* Ambient glow & grid */}
          <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.18, 0.32, 0.18] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-[420px] h-[420px] rounded-full bg-primary/20 blur-[120px] pointer-events-none"
          />

          <div className="relative z-10 flex flex-col items-center px-6 w-full max-w-sm">
            {/* Kinetic emblem */}
            <div className="relative mb-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-24 h-24 rounded-full border border-white/10 border-t-primary border-r-primary/40"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 rounded-full border border-white/5 border-b-primary/60"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_30px_rgba(168,225,11,0.3)]"
                >
                  <Dumbbell className="w-6 h-6" />
                </motion.div>
              </div>
            </div>

            {/* Brand mark */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="font-display text-3xl sm:text-4xl font-black uppercase italic tracking-tighter text-white mb-2"
            >
              Fitness <span className="text-primary">365</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.16 }}
              className="text-[10px] font-black uppercase tracking-[0.35em] text-white/40 italic mb-8"
            >
              Initializing Elite Ecosystem
            </motion.div>

            {/* Progress bar + percentage */}
            <div className="w-full space-y-2.5">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.25em] italic">
                <span className="text-white/30">System Sync</span>
                <span className="text-primary tabular-nums">{String(progress).padStart(2, "0")}%</span>
              </div>
              <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full shadow-[0_0_16px_rgba(168,225,11,0.8)] transition-[width] duration-75 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
