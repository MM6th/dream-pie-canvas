
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link as LinkIcon } from "lucide-react";

const TunecoreRoyaltyModal = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="text-blue-400 hover:text-blue-300 p-0 h-auto justify-start">
          Publishing Royalties (via Tunecore)
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center text-white font-bold tracking-tight">
            Music Publishing Royalties
          </DialogTitle>
        </DialogHeader>
        <div className="py-6 space-y-4 text-gray-300">
          <p>
            We partner with Tunecore for publishing administration to help you collect all the royalties you've earned from your music.
          </p>
          <h3 className="font-semibold text-white text-lg">Royalty Rate</h3>
          <p>
            Tunecore allows you to keep <strong className="text-white">100% of your royalties</strong> from digital stores and streaming services. They operate on a subscription model where you pay an annual fee to keep your music available on platforms.
          </p>
          <h3 className="font-semibold text-white text-lg">How it works</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>You upload your music through Tunecore.</li>
            <li>They distribute it to over 150 digital stores and streaming services worldwide.</li>
            <li>You receive 100% of the revenue and rights from your music.</li>
          </ul>
          <p>
            This ensures you get paid for every stream, download, and use of your music across all major platforms.
          </p>
        </div>
        <div className="flex justify-center">
            <Button asChild variant="outline" className="border-gray-600 text-white hover:bg-white hover:text-black">
                <a href="https://www.tunecore.com/music-publishing-administration" target="_blank" rel="noopener noreferrer">
                    Learn more at Tunecore.com
                    <LinkIcon className="ml-2 h-4 w-4" />
                </a>
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TunecoreRoyaltyModal;
