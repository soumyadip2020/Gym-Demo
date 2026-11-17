import { Link } from "@tanstack/react-router";
import { Dumbbell } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-32 border-t border-white/5 bg-black py-20 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="max-w-xs">
            <div className="flex items-center gap-2 font-display font-black text-2xl tracking-tighter uppercase italic">
              <Dumbbell className="w-8 h-8 text-primary" />
              Fitness <span className="text-white/20">365</span>
            </div>
            <p className="mt-6 text-white/40 text-sm leading-relaxed uppercase tracking-wider font-bold">
              Elevate your limits. Redefine your physique. Join the elite community of high-performance athletes.
            </p>
            <div className="mt-8 flex gap-4">
              {['Facebook', 'LinkedIn', 'Slack', 'Twitter'].map(s => (
                <div key={s} className="w-10 h-10 border border-white/10 rounded-lg grid place-items-center hover:bg-white/5 cursor-pointer transition">
                  <span className="sr-only">{s}</span>
                  <div className="w-4 h-4 bg-white/20 rounded-sm" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-12 text-[11px] uppercase tracking-[0.2em] font-black">
            <div>
              <h4 className="text-white/20 mb-6">Quick Links</h4>
              <ul className="space-y-4">
                <li><Link to="/" className="hover:text-primary transition">Home</Link></li>
                <li><Link to="/pricing" className="hover:text-primary transition">Features</Link></li>
                <li><Link to="/trainers" className="hover:text-primary transition">About</Link></li>
                <li><Link to="/contact" className="hover:text-primary transition">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white/20 mb-6">Support</h4>
              <ul className="space-y-4">
                <li><a href="#" className="hover:text-primary transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary transition">Terms of Service</a></li>
                <li><a href="#" className="hover:text-primary transition">Cookie Policy</a></li>
              </ul>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <h4 className="text-white/20 mb-6">Newsletter</h4>
              <p className="text-white/40 mb-4 normal-case tracking-normal font-medium">Subscribe to get the latest fitness insights.</p>
              <div className="flex border border-white/10 rounded-lg overflow-hidden">
                <input type="text" placeholder="Email" className="bg-transparent px-4 py-2 w-full text-[13px] outline-none" />
                <button className="bg-white/10 px-4 hover:bg-white/20 transition">Go</button>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-20 pt-8 border-t border-white/5 text-[10px] uppercase tracking-[0.3em] font-black text-white/20 text-center">
          © {new Date().getFullYear()} Fitness 365. All rights reserved. Designed for elite performers.
        </div>
      </div>
    </footer>
  );
}
