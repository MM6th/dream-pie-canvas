import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, TrendingUp, Users, ShieldCheck, AlertTriangle, Rocket } from "lucide-react";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";

interface SixthTokenEducationModalProps {
  children?: React.ReactNode;
}

const SixthTokenEducationModal = ({ children }: SixthTokenEducationModalProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 gap-2">
            <BookOpen className="w-4 h-4" />
            Why SIXTH?
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-gray-900 border-gray-700 text-white max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <img src={sixthCoinLogo} alt="SIXTH" className="w-8 h-8 rounded-full" />
            Understanding SIXTH — Your Community Currency
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* The Why */}
          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-amber-400 font-semibold text-base">
              <Rocket className="w-5 h-5" />
              Why Does This Exist?
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              The global economy is unpredictable — inflation, bank instability, currency devaluation. These aren't hypotheticals anymore. SIXTH isn't just a token. It's <span className="text-amber-400 font-medium">preparation</span>. It's your community learning how money works by <em>owning</em> money that works for them.
            </p>
            <p className="text-sm text-gray-400 leading-relaxed">
              This is Phase 1 of PIE's journey into Web3 and crypto. We're building the habits, the financial literacy, and the infrastructure so that when PIE merges into the decentralized economy, our community isn't catching up — <span className="text-white font-medium">we're already there</span>.
            </p>
          </section>

          {/* The Bonding Curve */}
          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-blue-400 font-semibold text-base">
              <TrendingUp className="w-5 h-5" />
              What the Price Curve Means
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              Think of it like buying land in a new neighborhood. <span className="text-blue-400 font-medium">The earlier you arrive, the cheaper the price.</span> As more people join, the value of everyone's stake rises together.
            </p>
            <p className="text-sm text-gray-400 leading-relaxed">
              The chart on the Mint page shows this curve — it's not speculation or hype. The price is set by a transparent mathematical formula. You can always see exactly what your tokens are worth and where the community stands on the curve.
            </p>
          </section>

          {/* How It Benefits You */}
          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-emerald-400 font-semibold text-base">
              <Users className="w-5 h-5" />
              How Circulating SIXTH Benefits You
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span><strong className="text-white">Early participation = lower cost.</strong> The first buyers get the most tokens per dollar.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span><strong className="text-white">Your purchase strengthens everyone.</strong> Every dollar goes into the community reserve, backing the value of all tokens.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span><strong className="text-white">As adoption grows, your holdings appreciate.</strong> More community participation = higher token value for all holders.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span><strong className="text-white">Real financial education.</strong> You're learning crypto economics in a safe, transparent environment before the broader Web3 transition.</span>
              </li>
            </ul>
          </section>

          {/* Risks & Transparency */}
          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-red-400 font-semibold text-base">
              <AlertTriangle className="w-5 h-5" />
              Understanding the Risks
            </h3>
            <p className="text-xs text-gray-500 italic mb-1">Transparency builds trust. Here's what you should know:</p>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span><strong className="text-white">Selling early may return less.</strong> If few people have joined, the curve price is lower and your payout reflects that.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span><strong className="text-white">A 3% sell tax applies.</strong> This small fee goes back into the reserve to protect all holders — it's a community safeguard, not a penalty.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span><strong className="text-white">This is not a get-rich-quick scheme.</strong> SIXTH is a long-term community investment in group economics and financial self-determination.</span>
              </li>
            </ul>
          </section>

          {/* Group Economics */}
          <section className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 space-y-2">
            <h3 className="flex items-center gap-2 text-amber-400 font-semibold text-base">
              <ShieldCheck className="w-5 h-5" />
              Group Economics — The Bigger Picture
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              Group economics isn't a buzzword — it's how communities protect each other. When you invest in SIXTH, you're not just buying a token. You're voting with your dollar for a community-owned economy where <span className="text-amber-400 font-medium">the people who build it are the people who benefit from it</span>.
            </p>
            <p className="text-sm text-gray-400 leading-relaxed mt-2">
              Start with $5. Learn the curve. Watch your community grow. This is <em>your</em> currency.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SixthTokenEducationModal;
