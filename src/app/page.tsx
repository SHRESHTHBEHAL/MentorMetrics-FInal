"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { ArrowRight, LayoutDashboard, Bolt, Shield, Play, Star, Zap, Brain, Eye, Mic } from "lucide-react";

function AnimatedSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
    >
      {children}
    </motion.div>
  );
}

function Counter({ end, suffix = "", duration = 2 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

const features = [
  { icon: Brain, title: "Neural Auditing", desc: "Advanced linguistic analysis that identifies emotional resonance and cognitive load in every sentence.", color: "bg-primary" },
  { icon: Zap, title: "Velocity Maps", desc: "Visualize the pace of mentorship. Identify where dialogue stalls and where it accelerates.", color: "bg-black" },
  { icon: Eye, title: "Visual Intelligence", desc: "Micro-expression detection and body language analysis for complete non-verbal understanding.", color: "bg-primary" },
  { icon: Mic, title: "Voice Analytics", desc: "WPM, tone variance, and clarity scoring to optimize your delivery.", color: "bg-black" },
  { icon: Star, title: "Scoring Framework", desc: "Proprietary 10-point scale across 5 dimensions for comprehensive feedback.", color: "bg-primary" },
  { icon: Shield, title: "Privacy First", desc: "Enterprise-grade encryption ensures your session data stays secure.", color: "bg-black" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur-md border-b-2 border-black flex justify-between items-center px-6 py-4">
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-2xl font-black tracking-tighter uppercase"
        >
          MENTORMETRICS
        </motion.div>
        <div className="hidden md:flex gap-12 items-center">
          <Link href="/history" className="text-primary font-bold underline decoration-2 underline-offset-4 text-sm uppercase">History</Link>
          <Link href="/library" className="text-black font-medium text-sm uppercase hover:bg-black hover:text-white px-2 py-1 transition-colors">Library</Link>
        </div>
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/upload">
            <button className="bg-primary text-white px-6 py-2 font-bold uppercase tracking-tight border-b-4 border-r-4 border-black hover:bg-black transition-all hover:translate-y-1">
              Upload Session
            </button>
          </Link>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <main className="pt-24 min-h-screen flex flex-col">
        <section className="grid grid-cols-1 lg:grid-cols-12 w-full px-6 gap-0">
          {/* Massive Headline */}
          <div className="lg:col-span-8 pt-12 pb-20 border-b-2 border-black">
            <motion.h1
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-[clamp(4rem,15vw,12rem)] font-black leading-[0.85] tracking-tighter uppercase"
            >
              MENTOR<br />METRICS
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-2xl md:text-4xl font-bold max-w-2xl leading-tight text-primary uppercase mt-8 font-headline"
            >
              AI that doesn&apos;t just score you. It coaches you.
            </motion.p>
          </div>
          
          {/* Secondary Content */}
          <div className="lg:col-span-4 border-l-2 border-b-2 border-black p-8 bg-surface-container flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="space-y-6"
            >
              <div className="text-xs font-bold uppercase tracking-widest text-secondary">Status: Alpha 01</div>
              <p className="text-lg leading-relaxed font-medium">
                The first editorial-grade AI coaching platform. We analyze high-stakes dialogue to reveal the invisible architecture of mentorship.
              </p>
              <div className="flex gap-4 pt-4">
                <motion.div whileHover={{ scale: 1.2, rotate: 5 }} transition={{ type: "spring", stiffness: 300 }}>
                  <LayoutDashboard className="w-10 h-10" />
                </motion.div>
                <motion.div whileHover={{ scale: 1.2, rotate: -5 }} transition={{ type: "spring", stiffness: 300 }}>
                  <Bolt className="w-10 h-10" />
                </motion.div>
                <motion.div whileHover={{ scale: 1.2, rotate: 5 }} transition={{ type: "spring", stiffness: 300 }}>
                  <Shield className="w-10 h-10" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Image and Data Grid with Animated Counters */}
        <section className="grid grid-cols-1 lg:grid-cols-12 w-full flex-grow border-b-2 border-black">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-7 relative h-[600px] bg-black overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-black to-black" />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="text-center"
              >
                <div className="text-6xl md:text-9xl font-black text-white/10 uppercase tracking-tighter">AI COACHING</div>
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                  <Play className="w-20 h-20 text-white/30" />
                </motion.div>
              </motion.div>
            </div>
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="absolute bottom-0 left-0 p-12 bg-primary text-white max-w-md"
            >
              <span className="text-xs font-bold uppercase block mb-2">Visual Index 001</span>
              <h3 className="text-3xl font-bold uppercase font-headline">Precision Analysis of Classroom Flow</h3>
            </motion.div>
          </motion.div>
          
          <div className="lg:col-span-5 flex flex-col">
            <div className="grid grid-cols-2 flex-grow">
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="border-l-2 border-b-2 border-black p-8 flex flex-col justify-between"
              >
                <span className="text-xs font-bold uppercase">Confidence Score</span>
                <div className="text-6xl font-black">
                  <Counter end={98} suffix="%" />
                </div>
                <div className="h-2 w-full bg-surface-container mt-4 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "98.2%" }}
                    transition={{ duration: 1.5, delay: 0.3 }}
                    className="h-full bg-primary"
                  />
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="border-l-2 border-b-2 border-black p-8 flex flex-col justify-between bg-black text-white"
              >
                <span className="text-xs font-bold uppercase">Real-time Latency</span>
                <div className="text-6xl font-black">
                  <Counter end={12} suffix="MS" />
                </div>
              </motion.div>
            </div>
            <div className="flex-grow p-12 border-l-2 border-black flex items-center bg-white">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-8"
              >
                <h2 className="text-5xl font-black uppercase leading-none tracking-tighter font-headline">
                  Designed for<br />High-Stakes<br />Environments.
                </h2>
                <Link href="/upload" className="flex items-center gap-4 group">
                  <span className="text-xl font-bold uppercase border-b-4 border-black group-hover:text-primary transition-colors">Upload Session</span>
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
                  </motion.span>
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Feature Bento Grid with Hover Effects */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full bg-surface">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className={`border-r-2 border-b-2 border-black p-8 md:p-12 space-y-4 cursor-pointer ${
                i === 1 ? "md:bg-surface-container" : ""
              } ${i === 4 ? "md:border-r-0 lg:border-r-2" : ""}`}
            >
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className={`w-14 h-14 ${feature.color} flex items-center justify-center text-white`}
              >
                <feature.icon className="w-7 h-7" />
              </motion.div>
              <h4 className="text-xl md:text-2xl font-black uppercase font-headline">{feature.title}</h4>
              <p className="text-sm leading-relaxed text-secondary">{feature.desc}</p>
            </motion.div>
          ))}
        </section>

        {/* Stats Section */}
        <section className="grid grid-cols-2 md:grid-cols-4 w-full border-b-2 border-black bg-black text-white">
          {[
            { label: "Sessions Analyzed", value: 12500, suffix: "+" },
            { label: "Mentors Trained", value: 3400, suffix: "+" },
            { label: "Hours of Coaching", value: 28000, suffix: "+" },
            { label: "Avg Score Improvement", value: 23, suffix: "%" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-8 md:p-12 border-b-2 md:border-b-0 md:border-r-2 border-white/20 text-center"
            >
              <div className="text-3xl md:text-5xl font-black">
                <Counter end={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-xs md:text-sm font-bold uppercase mt-2 text-white/60">{stat.label}</div>
            </motion.div>
          ))}
        </section>

        {/* CTA Section */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="w-full border-y-2 border-black bg-black py-24 px-6 flex flex-col items-center text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-black to-primary/20" />
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="relative z-10"
          >
            <h2 className="text-white text-4xl md:text-7xl lg:text-8xl font-black uppercase mb-8 leading-[0.9] tracking-tighter font-headline">
              READY TO UPGRADE YOUR INTELLECTUAL CAPITAL?
            </h2>
            <div className="flex flex-col md:flex-row gap-6 justify-center">
              <Link href="/upload">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-primary text-white text-xl md:text-2xl font-black uppercase px-12 py-6 border-r-8 border-b-8 border-white/20 hover:border-white transition-all"
                >
                  Upload Session
                </motion.button>
              </Link>
              <Link href="/login">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white text-black text-xl md:text-2xl font-black uppercase px-12 py-6 border-r-8 border-b-8 border-gray-300 hover:bg-gray-100 transition-all"
                >
                  Sign In
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </motion.section>
      </main>

      {/* Minimal Footer */}
      <footer className="bg-white border-t-2 border-black flex justify-center items-center px-8 py-6 w-full font-mono text-xs uppercase">
        <div className="text-neutral-500">© 2026 MENTORMETRICS</div>
      </footer>
    </div>
  );
}
