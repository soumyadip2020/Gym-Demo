import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Activity, Dumbbell, Heart, Zap, Check, ArrowRight, Star,
  Smartphone, Trophy, Users, Shield, MapPin, Instagram, Twitter, Linkedin, Facebook
} from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-primary selection:text-black">
      <Navbar />
      <Hero />
      <BrandLogos />
      <InspiredSection />
      <FeaturesGrid />
      <WorkoutGrid />
      <ExperienceSection />
      <TrainersSection />
      <SuccessStories />
      <CTASection />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/images/gym-bg.jpg" 
          alt="Cybernetic Gym" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
      </div>
      
      <div className="mx-auto max-w-7xl px-6 relative z-10 w-full text-center">
        {/* Headline */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="font-display text-5xl md:text-9xl font-black tracking-tighter uppercase italic leading-[0.85] mb-12 drop-shadow-2xl"
        >
          <div className="flex flex-wrap justify-center items-center gap-x-6 drop-shadow-[0_5px_15px_rgba(0,0,0,1)]">
            <span className="text-white">Sculpt</span>
            <span className="text-stroke-thick opacity-50">Your</span>
            <span className="text-primary">Body,</span>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-x-6 drop-shadow-[0_5px_15px_rgba(0,0,0,1)]">
            <span className="text-white">Elevate</span>
            <span className="text-stroke-thick opacity-50">Your</span>
            <span className="text-white">Spirit</span>
          </div>
        </motion.div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="max-w-2xl mx-auto text-white/40 font-black uppercase tracking-[0.3em] text-[10px] md:text-xs mb-16 italic"
        >
          Elite AI-Driven Fitness Ecosystem for High-Performance Athletes
        </motion.p>
        
        {/* CTA Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row justify-center items-center gap-6"
        >
          <Link to="/signup" className="bg-primary text-black px-16 py-7 rounded-full font-black uppercase tracking-[0.4em] italic text-sm hover:scale-110 transition-all duration-500 shadow-[0_20px_80px_rgba(var(--primary),0.5)] flex items-center gap-4">
            START NOW <ArrowRight className="w-6 h-6" />
          </Link>
          <Link to="/pricing" className="bg-white/5 backdrop-blur-xl border border-white/10 text-white px-16 py-7 rounded-full font-black uppercase tracking-[0.4em] italic text-sm hover:bg-white/10 transition-all duration-500">
            VIEW PLANS
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function BrandLogos() {
  const brands = ["Nike", "Adidas", "Puma", "Under Armour", "The North Face", "Reebok"];
  return (
    <section className="py-32 border-y border-white/5 bg-zinc-950/50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap justify-center md:justify-between items-center gap-12 opacity-30">
          {brands.map(b => (
            <span key={b} className="text-3xl font-black uppercase tracking-tighter italic text-white hover:opacity-100 transition duration-500 cursor-default">
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function InspiredSection() {
  const points = [
    "Personalized Training Plans",
    "Expert Nutritional Advice",
    "Advanced Progress Tracking",
    "Motivation & Accountability",
    "Community Support",
    "High-End Fitness Equipment"
  ];
  return (
    <section className="py-32 bg-black relative">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid md:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="font-display text-5xl md:text-6xl font-black uppercase italic leading-none tracking-tighter">
              Inspired to<br />
              <span className="text-primary">Inspire Your</span> Best Self
            </h2>
            <p className="mt-8 text-white/40 leading-relaxed font-medium">
              We provide the tools, the community, and the expertise to help you break through your limits and achieve the physique you've always dreamed of.
            </p>
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {points.map(p => (
                <div key={p} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-wider text-white/70">{p}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 border-2 border-primary/20 rounded-3xl" />
            <img src="/images/inspired.png" alt="Inspiration" className="rounded-2xl grayscale hover:grayscale-0 transition-all duration-700 relative z-10" />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesGrid() {
  const features = [
    { title: "Cardio Training", icon: <Heart className="w-6 h-6" />, desc: "Improve your cardiovascular health with our high-intensity programs." },
    { title: "Strength Build", icon: <Dumbbell className="w-6 h-6" />, desc: "Build explosive power and lean muscle mass with expert guidance." },
    { title: "Fat Loss", icon: <Zap className="w-6 h-6" />, desc: "Burn calories efficiently with our science-backed metabolic workouts." },
    { title: "HIIT Workouts", icon: <Activity className="w-6 h-6" />, desc: "Maximize your results in minimum time with high intensity intervals." },
  ];
  return (
    <section className="py-32 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <h2 className="font-display text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
          Discover<br />
          <span className="text-primary">What Sets Us</span> Apart
        </h2>
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <div key={i} className="group bg-zinc-900 p-10 rounded-[2.5rem] border border-white/5 hover:border-primary/50 transition-all duration-500 text-left flex flex-col justify-between min-h-[350px]">
              <div>
                <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-colors duration-500">
                  {f.icon}
                </div>
                <h3 className="mt-8 text-2xl font-black uppercase italic tracking-tight">{f.title}</h3>
                <p className="mt-4 text-sm text-white/40 leading-relaxed font-medium">
                  {f.desc}
                </p>
              </div>
              <button className="mt-8 bg-zinc-800 text-primary py-3 rounded-xl font-black uppercase tracking-[0.2em] italic text-[10px] group-hover:bg-primary group-hover:text-black transition-colors duration-500">
                Explore
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkoutGrid() {
  const workouts = [
    { title: "Heavy Lifting", img: "/images/workout-1.png" },
    { title: "Kettlebell Flow", img: "/images/workout-2.png" },
    { title: "Endurance Run", img: "/images/workout-3.png" },
    { title: "Power Deadlift", img: "/images/workout-4.png" },
    { title: "Rope Climbs", img: "/images/workout-5.png" },
    { title: "Bodyweight Pro", img: "/images/workout-6.png" },
  ];
  return (
    <section className="py-32 bg-black">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <h2 className="font-display text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
          Train Smarter<br />
          <span className="text-primary">Unleash Your</span> Potential
        </h2>
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {workouts.map((w, i) => (
            <div key={i} className="group relative overflow-hidden rounded-[2rem]">
              <img src={w.img} alt={w.title} className="w-full aspect-[4/5] object-cover grayscale brightness-50 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-8 left-8 text-left">
                <h3 className="text-2xl font-black uppercase italic tracking-tight group-hover:text-primary transition-colors">{w.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExperienceSection() {
  return (
    <section className="py-32 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <h2 className="font-display text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
          Experience<br />
          <span className="text-primary">Fitness Like</span> Never Before
        </h2>
        <div className="mt-20 grid md:grid-cols-2 gap-8">
          <div className="relative group overflow-hidden rounded-[3rem] aspect-[16/10] bg-zinc-900 border border-white/5">
            <img src="/images/workout-1.png" className="absolute inset-0 w-full h-full object-cover grayscale opacity-30 group-hover:opacity-60 transition duration-700" />
            <div className="relative p-12 text-left h-full flex flex-col justify-between">
              <div>
                <h3 className="text-3xl font-black uppercase italic text-primary">Advanced Training</h3>
                <p className="mt-4 max-w-xs text-white/50 font-bold uppercase tracking-widest text-[11px] leading-relaxed">
                  Our facility is equipped with state-of-the-art machines and professional tracking systems.
                </p>
              </div>
              <button className="self-start bg-primary text-black px-10 py-4 rounded-full font-black uppercase tracking-widest italic text-[11px] hover:scale-105 transition-transform">
                Get Started
              </button>
            </div>
          </div>
          <div className="relative group overflow-hidden rounded-[3rem] aspect-[16/10] bg-zinc-900 border border-white/5">
            <img src="/images/workout-2.png" className="absolute inset-0 w-full h-full object-cover grayscale opacity-30 group-hover:opacity-60 transition duration-700" />
            <div className="relative p-12 text-left h-full flex flex-col justify-between">
              <div>
                <h3 className="text-3xl font-black uppercase italic text-primary">Elite Community</h3>
                <p className="mt-4 max-w-xs text-white/50 font-bold uppercase tracking-widest text-[11px] leading-relaxed">
                  Join a network of dedicated athletes and fitness enthusiasts pushing each other daily.
                </p>
              </div>
              <button className="self-start bg-primary text-black px-10 py-4 rounded-full font-black uppercase tracking-widest italic text-[11px] hover:scale-105 transition-transform">
                Join Us
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrainersSection() {
  const trainers = [
    { name: "John Doe", role: "Strength Coach", img: "/images/trainer-1.png" },
    { name: "Jane Smith", role: "Nutritionist", img: "/images/trainer-2.png" },
    { name: "Mike Johnson", role: "HIIT Specialist", img: "/images/trainer-3.png" },
  ];
  return (
    <section className="py-32 bg-black">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <h2 className="font-display text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
          Your Fitness<br />
          <span className="text-primary">Goals, Their</span> Expertise
        </h2>
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
          {trainers.map((t, i) => (
            <div key={i} className="group text-left">
              <div className="relative overflow-hidden rounded-[2.5rem] aspect-[4/5] bg-zinc-900">
                <img src={t.img} alt={t.name} className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-700" />
                <div className="absolute inset-0 border-[12px] border-black/50 pointer-events-none" />
              </div>
              <h3 className="mt-8 text-2xl font-black uppercase italic tracking-tight">{t.name}</h3>
              <p className="mt-1 text-primary font-black uppercase tracking-widest text-[10px]">{t.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SuccessStories() {
  return (
    <section className="py-32 bg-zinc-950 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="font-display text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-center">
          Your Success<br />
          <span className="text-primary">Stories, Our</span> Inspiration
        </h2>
        
        <div className="mt-20 relative">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 relative h-[600px] rounded-[3rem] overflow-hidden group">
              <img src="/images/success.png" className="w-full h-full object-cover grayscale brightness-50 group-hover:grayscale-0 transition-all duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
              <div className="absolute bottom-12 left-12 right-12">
                <div className="flex gap-1 text-primary mb-4">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-5 h-5 fill-current" />)}
                </div>
                <blockquote className="text-3xl font-black uppercase italic leading-tight tracking-tight">
                  "Fitness 365 didn't just change my body, it changed my life. The expertise and community here are unmatched."
                </blockquote>
                <p className="mt-6 font-bold uppercase tracking-widest text-primary">— Alex Thompson</p>
              </div>
            </div>
            <div className="lg:col-span-5 grid grid-cols-1 gap-6">
              {[1, 2].map(i => (
                <div key={i} className="bg-zinc-900 rounded-[2rem] p-8 border border-white/5 flex gap-6 items-center group hover:border-primary/30 transition">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0">
                    <img src={`/images/trainer-${i+1}.png`} className="w-full h-full object-cover grayscale" />
                  </div>
                  <div>
                    <div className="flex gap-1 text-primary mb-2">
                      {[1, 2, 3, 4, 5].map(j => <Star key={j} className="w-3 h-3 fill-current" />)}
                    </div>
                    <p className="text-sm font-bold text-white/60 italic uppercase leading-tight">
                      "Unbelievable results. The AI plans are perfectly tailored to my goals."
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-32 px-6">
      <div className="mx-auto max-w-7xl bg-primary rounded-[4rem] p-16 md:p-32 text-center relative overflow-hidden group shadow-[0_50px_100px_rgba(var(--primary),0.2)]">
        {/* Subtle pattern or texture could go here */}
        <div className="relative z-10">
          <h2 className="font-display text-5xl md:text-8xl font-black uppercase italic tracking-tighter text-black leading-none mb-12">
            Connect Engage<br />Transform
          </h2>
          <p className="mt-8 max-w-2xl mx-auto text-black/50 font-black uppercase tracking-[0.2em] text-xs mb-16">
            Join the community of 140+ elite athletes transforming their lives.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4 max-w-2xl mx-auto bg-black/5 p-3 rounded-full backdrop-blur-sm border border-black/5">
            <input 
              type="email" 
              placeholder="YOUR EMAIL ADDRESS" 
              className="bg-white px-10 py-6 rounded-full text-black placeholder:text-black/30 outline-none font-black uppercase tracking-[0.2em] text-[10px] flex-1"
            />
            <button className="bg-black text-white px-12 py-6 rounded-full font-black uppercase tracking-[0.3em] italic text-[10px] hover:scale-105 transition-transform shadow-2xl">
              JOIN NOW
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
