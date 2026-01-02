"use client";

import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { ClapIcon, type ClapIconHandle } from "@/components/ui/clap";
import { cn } from "@/lib/utils";

export function HeroIcon({ className }: { className?: string }) {
  const clapRef = useRef<ClapIconHandle>(null);

  useEffect(() => {
    // Trigger clap animation periodically
    const interval = setInterval(() => {
      clapRef.current?.startAnimation();
    }, 5000);

    // Initial clap
    const timer = setTimeout(() => {
      clapRef.current?.startAnimation();
    }, 800);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  return (
    <motion.div
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 15,
        delay: 0.2,
      }}
      className={cn(className)}
    >
      {/* <div className="p-6 bg-background border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)] hover:-translate-y-1 transition-all duration-300"> */}
      <ClapIcon ref={clapRef} size={90} className="text-foreground" />
      {/* </div> */}
    </motion.div>
  );
}
