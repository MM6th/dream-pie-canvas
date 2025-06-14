
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DollarSign, Gem, Mic, Camera, Users } from "lucide-react";

const benefits = [
  {
    icon: Gem,
    title: "Brand Deals",
    description: "Opportunity for a brand deal with Conceal/Luxury Lines where models get a percentage of each sale a garment generates when you spearhead the campaign for that item."
  },
  {
    icon: DollarSign,
    title: "Cover Photo Royalties",
    description: "Opportunity to gain royalties for modeling on the cover photos for our artist's music."
  },
  {
    icon: Mic,
    title: "Influencer Shows",
    description: "Inquire about podcast, spoken, asmr, and other influencer shows that we can produce behind the scenes before launch on major platforms."
  },
  {
    icon: Camera,
    title: "Content Testing",
    description: "Benefit from testing your photos & videos with our audience before you publish them on your social media sites."
  },
  {
    icon: Users,
    title: "Community Engagement",
    description: "Get to know, and let your audience get to know you in our community bulletin board."
  }
];

const MerchantBenefitsModal = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="text-blue-400 hover:text-blue-300">
          What are the benefits?
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center text-white font-bold tracking-tight">
            <span className="block">WHAT OUR PLATFORM OFFERS</span>
            <span className="block text-blue-400">THAT OTHERS DON'T</span>
          </DialogTitle>
        </DialogHeader>
        <div className="py-6 px-2 space-y-8">
          <div className="text-center text-gray-300 max-w-2xl mx-auto">
            <p>
              We aren't trying to reinvent the wheel with going live because YouTube, OnlyFans, Twitch and Facebook already does it, and our understanding is you're probably on one of them already. It's simpler to attract your audiences from there, and bring them here, a unique 'boutique' like media platform where the entry level for independent contractors is narrower than those other sites, creating an <strong className="text-white font-semibold">"A list" vibe environment</strong>.
            </p>
          </div>
          
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-center text-white">Ways to Make Money & Grow Your Brand</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="bg-gray-900/50 p-4 rounded-lg flex items-start gap-4 transition-all hover:bg-gray-700/50">
                  <div className="bg-blue-600/20 text-blue-400 p-2 rounded-full flex-shrink-0">
                    <benefit.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{benefit.title}</h4>
                    <p className="text-sm text-gray-400">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="text-center text-sm text-gray-500 pt-4 border-t border-gray-700">
            <p>We approach the hiring process from a word of mouth or scouting perspective.</p>
            <p>That is why we have the approval process put into place.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MerchantBenefitsModal;
