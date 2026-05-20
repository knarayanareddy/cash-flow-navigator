import { motion } from "framer-motion";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -40, opacity: 0 }}
      className="fixed left-1/2 top-20 z-40 -translate-x-1/2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100 shadow-xl backdrop-blur-xl"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4" />
        📡 You're offline — working with cached data
      </div>
    </motion.div>
  );
}
