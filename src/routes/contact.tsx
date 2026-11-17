import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, MapPin, Phone, ArrowRight, Smartphone, Globe } from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { submitContactFn } from "@/lib/server-fns";
import { motion } from "framer-motion";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [
    { title: "Contact — Fitness 365" },
    { name: "description", content: "Get in touch with the elite performance team at Fitness 365." },
  ]}),
  component: ContactPage,
});

function ContactPage() {
  const submitContact = useServerFn(submitContactFn);
  const [busy, setBusy] = useState(false);
  return (
    <div className="min-h-screen bg-black selection:bg-primary selection:text-black">
      <Navbar />
      
      <section className="relative py-32 overflow-hidden">
        {/* Background Atmosphere */}
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="mx-auto max-w-7xl px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-24"
          >
            <div className="text-[10px] uppercase font-black tracking-[0.4em] text-primary italic mb-6">Support Hub</div>
            <h1 className="font-display text-5xl md:text-8xl font-black uppercase italic tracking-tighter leading-none mb-8">
              Connect <span className="text-stroke-thick opacity-30 italic">With Elite</span>
            </h1>
            <p className="max-w-2xl mx-auto text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-white/30 italic">
              Our high-performance team is ready to assist your transformation. Reach out via any channel.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4 space-y-6">
              {[
                { icon: Mail, label: "Digital Channel", value: "elite@fitness365.app" },
                { icon: Smartphone, label: "Direct Comms", value: "+91 98765 43210" },
                { icon: Globe, label: "Neural Node", value: "Bengaluru HQ, India" },
              ].map((c, i) => (
                <motion.div 
                  key={c.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-zinc-950 border border-white/5 rounded-[2rem] p-8 hover:border-primary/30 transition-all duration-500 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all duration-500 mb-6">
                    <c.icon className="w-5 h-5" />
                  </div>
                  <div className="text-[9px] uppercase font-black tracking-widest text-white/20 mb-1 italic">{c.label}</div>
                  <div className="text-sm font-black uppercase tracking-widest italic text-white group-hover:text-primary transition-colors">{c.value}</div>
                </motion.div>
              ))}
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-8 bg-zinc-950 border border-white/5 rounded-[3rem] p-8 md:p-12 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] pointer-events-none" />
              
              <div className="relative z-10 mb-10">
                <h3 className="font-display text-3xl font-black uppercase italic tracking-tighter mb-2">Initialize Contact</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">Submit your query to our optimization engine.</p>
              </div>

              <form 
                onSubmit={async (e) => { 
                  e.preventDefault(); 
                  const form = e.currentTarget;
                  const f = new FormData(form);
                  setBusy(true); 
                  try {
                    await submitContact({
                      data: {
                        name: String(f.get("name")),
                        email: String(f.get("email")),
                        subject: String(f.get("subject") || ""),
                        message: String(f.get("message")),
                      },
                    });
                    toast.success("Enquiry received. Our team will respond shortly.");
                    form.reset();
                  } catch (err: any) {
                    toast.error(err?.message || "Failed to send enquiry");
                  } finally {
                    setBusy(false);
                  }
                }}
                className="grid gap-6 relative z-10"
              >
                <div className="grid md:grid-cols-2 gap-6">
                  <Input name="name" placeholder="FULL NAME" required />
                  <Input name="email" type="email" placeholder="EMAIL ADDRESS" required />
                </div>
                <Input name="subject" placeholder="SUBJECT OF QUERY" />
                <label className="block group">
                  <div className="text-[9px] uppercase font-black tracking-widest text-white/30 mb-2 ml-1 italic">MESSAGE CONTENT</div>
                  <textarea 
                    required name="message" 
                    placeholder="ENTER YOUR MESSAGE HERE..." 
                    rows={6} 
                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-5 outline-none focus:border-primary/50 focus:bg-white/10 transition-all font-black text-xs text-white placeholder:text-white/10 uppercase tracking-widest" 
                  />
                </label>
                <button 
                  disabled={busy} 
                  className="w-full bg-primary text-black rounded-2xl py-6 font-black uppercase tracking-[0.3em] italic text-xs hover:scale-105 transition-transform disabled:opacity-50 flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(var(--primary),0.2)] mt-4"
                >
                  {busy ? "TRANSMITTING..." : "SEND QUERY"}
                  {!busy && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Input({ ...props }: any) {
  return (
    <label className="block group">
      <div className="text-[9px] uppercase font-black tracking-widest text-white/30 mb-2 ml-1 italic">{props.placeholder}</div>
      <input 
        {...props} 
        className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-5 outline-none focus:border-primary/50 focus:bg-white/10 transition-all font-black text-xs text-white placeholder:text-white/10 uppercase tracking-widest" 
      />
    </label>
  );
}
