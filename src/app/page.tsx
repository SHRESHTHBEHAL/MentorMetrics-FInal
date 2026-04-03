import Link from "next/link";
import { ArrowRight, LayoutDashboard, Bolt, Security } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-white border-b-2 border-black flex justify-between items-center px-6 py-4">
        <div className="text-2xl font-black tracking-tighter uppercase">MENTORMETRICS</div>
        <div className="hidden md:flex gap-12 items-center">
          <Link href="/history" className="text-primary font-bold underline decoration-2 underline-offset-4 text-sm uppercase">History</Link>
          <Link href="/library" className="text-black font-medium text-sm uppercase hover:bg-black hover:text-white px-2 py-1 transition-colors">Library</Link>
        </div>
        <Link href="/upload">
          <button className="bg-primary text-white px-6 py-2 font-bold uppercase tracking-tight border-b-4 border-r-4 border-black hover:bg-black transition-all">
            Upload Session
          </button>
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="pt-24 min-h-screen flex flex-col">
        <section className="grid grid-cols-1 lg:grid-cols-12 w-full px-6 gap-0">
          {/* Massive Headline */}
          <div className="lg:col-span-8 pt-12 pb-20 border-b-2 border-black">
            <h1 className="text-[clamp(4rem,15vw,12rem)] font-black leading-[0.85] tracking-tighter uppercase">
              MENTOR<br />METRICS
            </h1>
            <p className="text-2xl md:text-4xl font-bold max-w-2xl leading-tight text-primary uppercase mt-8 font-headline">
              AI that doesn&apos;t just score you. It coaches you.
            </p>
          </div>
          {/* Secondary Content */}
          <div className="lg:col-span-4 border-l-2 border-b-2 border-black p-8 bg-surface-container flex flex-col justify-end">
            <div className="space-y-6">
              <div className="text-xs font-bold uppercase tracking-widest text-secondary">Status: Alpha 01</div>
              <p className="text-lg leading-relaxed font-medium">
                The first editorial-grade AI coaching platform. We analyze high-stakes dialogue to reveal the invisible architecture of mentorship.
              </p>
              <div className="flex gap-4 pt-4">
                <LayoutDashboard className="w-10 h-10" />
                <Bolt className="w-10 h-10" />
                <Security className="w-10 h-10" />
              </div>
            </div>
          </div>
        </section>

        {/* Image and Data Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 w-full flex-grow border-b-2 border-black">
          <div className="lg:col-span-7 relative h-[600px] bg-black overflow-hidden">
            <div className="w-full h-full flex items-center justify-center text-white opacity-50">
              <span className="text-4xl font-black uppercase">[Hero Image]</span>
            </div>
            <div className="absolute bottom-0 left-0 p-12 bg-primary text-white max-w-md">
              <span className="text-xs font-bold uppercase block mb-2">Visual Index 001</span>
              <h3 className="text-3xl font-bold uppercase font-headline">Precision Analysis of Classroom Flow</h3>
            </div>
          </div>
          <div className="lg:col-span-5 flex flex-col">
            <div className="grid grid-cols-2 flex-grow">
              <div className="border-l-2 border-b-2 border-black p-8 flex flex-col justify-between">
                <span className="text-xs font-bold uppercase">Confidence Score</span>
                <div className="text-6xl font-black">98.2</div>
                <div className="h-2 w-full bg-surface-container mt-4">
                  <div className="h-full bg-primary w-[98.2%]"></div>
                </div>
              </div>
              <div className="border-l-2 border-b-2 border-black p-8 flex flex-col justify-between bg-black text-white">
                <span className="text-xs font-bold uppercase">Real-time Latency</span>
                <div className="text-6xl font-black">12MS</div>
              </div>
            </div>
            <div className="flex-grow p-12 border-l-2 border-black flex items-center bg-white">
              <div className="space-y-8">
                <h2 className="text-5xl font-black uppercase leading-none tracking-tighter font-headline">
                  Designed for<br />High-Stakes<br />Environments.
                </h2>
                <Link href="/upload" className="flex items-center gap-4 group">
                  <span className="text-xl font-bold uppercase border-b-4 border-black group-hover:text-primary transition-colors">Upload Session</span>
                  <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Bento Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 w-full bg-surface">
          {[
            { icon: "🧠", title: "Neural Auditing", desc: "Advanced linguistic analysis that identifies emotional resonance and cognitive load." },
            { icon: "⚡", title: "Velocity Maps", desc: "Visualize the pace of mentorship. Identify where dialogue stalls." },
            { icon: "🔒", title: "Semantic Shells", desc: "Proprietary structural containment logic ensures data privacy." },
          ].map((feature, i) => (
            <div key={i} className={`border-r-2 border-black p-12 space-y-4 ${i === 1 ? "bg-surface-container" : ""}`}>
              <div className="w-12 h-12 bg-primary flex items-center justify-center text-white text-2xl">
                {feature.icon}
              </div>
              <h4 className="text-2xl font-black uppercase font-headline">{feature.title}</h4>
              <p className="text-sm leading-relaxed text-secondary">{feature.desc}</p>
            </div>
          ))}
        </section>

        {/* CTA Section */}
        <section className="w-full border-y-2 border-black bg-black py-24 px-6 flex flex-col items-center text-center">
          <h2 className="text-white text-5xl md:text-8xl font-black uppercase mb-12 leading-[0.9] tracking-tighter font-headline">
            READY TO UPGRADE YOUR INTELLECTUAL CAPITAL?
          </h2>
          <div className="flex flex-col md:flex-row gap-6 justify-center">
            <Link href="/upload">
              <button className="bg-primary text-white text-2xl font-black uppercase px-12 py-6 border-r-8 border-b-8 border-white/20 hover:border-white transition-all">
                Upload Session
              </button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t-2 border-black flex justify-between items-center px-8 py-6 w-full font-mono text-xs uppercase">
        <div className="text-neutral-500">© 2024 MENTORMETRICS</div>
        <div className="flex gap-8">
          <a href="#" className="text-neutral-500 hover:text-black transition-colors">Documentation</a>
          <a href="#" className="text-neutral-500 hover:text-black transition-colors">Contact</a>
          <a href="#" className="text-neutral-500 hover:text-black transition-colors">Privacy</a>
        </div>
      </footer>
    </div>
  );
}
