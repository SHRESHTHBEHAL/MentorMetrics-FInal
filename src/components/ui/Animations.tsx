"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode, useState, useEffect } from "react";

// Container for staggered children
export function StaggerContainer({
  children,
  className = "",
  delay = 0,
  staggerDelay = 0.1
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  staggerDelay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            delay,
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// Animated child for stagger
export function StaggerItem({
  children,
  className = "",
  direction = "up"
}: {
  children: ReactNode;
  className?: string;
  direction?: "up" | "down" | "left" | "right";
}) {
  const directionOffset = {
    up: { y: 30, x: 0 },
    down: { y: -30, x: 0 },
    left: { x: 30, y: 0 },
    right: { x: -30, y: 0 },
  };

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, ...directionOffset[direction] },
        visible: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: {
            type: "spring",
            stiffness: 300,
            damping: 30,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// Score counter animation
export function AnimatedScore({
  value,
  suffix = "",
  className = ""
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 20,
        delay: 0.2,
      }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {value.toFixed(1)}
      </motion.span>
      {suffix}
    </motion.span>
  );
}

// Progress bar with spring animation
export function AnimatedProgressBar({
  value,
  max = 100,
  className = "",
  barClassName = "",
  delay = 0
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  delay?: number;
}) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <motion.div
      className={`h-full bg-surface-container border-2 border-black overflow-hidden ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
    >
      <motion.div
        className={`h-full bg-primary border-r-2 border-black ${barClassName}`}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 20,
          delay: delay + 0.2,
        }}
      />
    </motion.div>
  );
}

// Slot machine style number counter
export function SlotMachineNumber({
  value,
  duration = 1.5,
  className = ""
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const startTime = Date.now();
    const startValue = 0;
    const endValue = value;
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / (duration * 1000), 1);
      
      // Ease out cubic for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeOut;
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {displayValue.toFixed(1)}
    </motion.span>
  );
}

// Animated number with counting up effect
export function CountUpNumber({
  value,
  suffix = "",
  duration = 1.2,
  className = ""
}: {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const start = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - start;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(value * easeOut);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span className={className}>
      {displayValue.toFixed(1)}{suffix}
    </span>
  );
}

// Card with hover lift effect
export function HoverLift({
  children,
  className = "",
  liftAmount = -4
}: {
  children: ReactNode;
  className?: string;
  liftAmount?: number;
}) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: liftAmount }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {children}
    </motion.div>
  );
}

// Fade in with scale
export function FadeInScale({
  children,
  className = "",
  delay = 0,
  duration = 0.4
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        opacity: { duration, delay },
        scale: { type: "spring", stiffness: 300, damping: 30, delay },
      }}
    >
      {children}
    </motion.div>
  );
}

// Slide in from direction
export function SlideIn({
  children,
  className = "",
  direction = "right",
  delay = 0
}: {
  children: ReactNode;
  className?: string;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
}) {
  const initialPosition = {
    up: { y: 50, x: 0 },
    down: { y: -50, x: 0 },
    left: { x: 50, y: 0 },
    right: { x: -50, y: 0 },
  };

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...initialPosition[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}

// Pulse glow effect
export function PulseGlow({
  children,
  className = "",
  color = "#0038FF"
}: {
  children: ReactNode;
  className?: string;
  color?: string;
}) {
  return (
    <motion.div
      className={className}
      animate={{
        boxShadow: [
          `0 0 0 0 ${color}00`,
          `0 0 20px 5px ${color}40`,
          `0 0 0 0 ${color}00`,
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        repeatDelay: 1,
      }}
    >
      {children}
    </motion.div>
  );
}

// Stage indicator with sequential reveal
export function AnimatedStage({
  children,
  isComplete,
  isActive,
  isFailed,
  delay = 0
}: {
  children: ReactNode;
  isComplete: boolean;
  isActive: boolean;
  isFailed?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        delay,
      }}
    >
      <motion.div
        animate={{
          scale: isActive ? [1, 1.02, 1] : 1,
          backgroundColor: isComplete
            ? "rgb(238, 238, 238)"
            : isFailed
            ? "rgb(254, 226, 226)"
            : isActive
            ? "rgb(255, 255, 255)"
            : "rgb(243, 243, 243)",
        }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isComplete ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          style={{ originX: 0 }}
        />
        {children}
      </motion.div>
    </motion.div>
  );
}

// List item with stagger
export function ListItem({
  children,
  className = "",
  index = 0
}: {
  children: ReactNode;
  className?: string;
  index?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        delay: index * 0.05,
      }}
    >
      {children}
    </motion.div>
  );
}

// Skeleton loader
export function Skeleton({
  className = "",
  delay = 0
}: {
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={`bg-neutral-200 animate-pulse ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
    />
  );
}

// Button with press feedback
export function PressButton({
  children,
  className = "",
  onClick,
  disabled = false
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      className={className}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {children}
    </motion.button>
  );
}

// Modal with backdrop
export function AnimatedModal({
  isOpen,
  onClose,
  children,
  className = ""
}: {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className={`relative bg-white border-4 border-black p-6 md:p-8 ${className}`}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Reveal on scroll
export function RevealOnScroll({
  children,
  className = "",
  direction = "up"
}: {
  children: ReactNode;
  className?: string;
  direction?: "up" | "down" | "left" | "right";
}) {
  const offset = {
    up: { y: 50 },
    down: { y: -50 },
    left: { x: 50 },
    right: { x: -50 },
  };

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offset[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ type: "spring", stiffness: 200, damping: 30 }}
    >
      {children}
    </motion.div>
  );
}

// Typing effect
export function TypingEffect({
  text,
  className = "",
  speed = 0.05
}: {
  text: string;
  className?: string;
  speed?: number;
}) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * speed }}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
}
