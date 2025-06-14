
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
        <div className="py-6 space-y-6 text-gray-300">
          <p>
            We partner with Tunecore for publishing administration to help artists collect all the royalties they've earned from their music. Here's how it works for artists and how you, as a merchant, can benefit.
          </p>

          <h3 className="font-semibold text-white text-lg">Platform Royalty Sharing for Cover Models</h3>
          <p>
            On our platform, the 'main artist' (audio producer) receives 100% of their royalties directly from services like Tunecore. When a merchant models for a track's cover art, they are eligible to receive <strong className="text-white">20% of the main artist's publishing royalties</strong> for that specific track. This is part of a separate agreement facilitated through our site.
          </p>

          <h3 className="font-semibold text-white text-lg">How The Deal Is Solidified</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Once you agree to model for a cover, the deal is solidified within our platform.</li>
            <li>The audio producer will require your <strong className="text-white">first and last name</strong> to register the royalty split with their publisher.</li>
            <li>After registration, a screenshot of the official publishing royalty split will be sent to your contact email on file as confirmation.</li>
          </ul>
          
          <div className="border-t border-gray-700 pt-6">
            <h3 className="font-semibold text-white text-lg">General Info: How Tunecore Works for Artists</h3>
            <p className="mt-2">
              Tunecore allows artists to keep <strong className="text-white">100% of their royalties</strong> from digital stores and streaming services. They operate on a subscription model where the artist pays an annual fee.
            </p>
            <ul className="list-disc list-inside space-y-2 mt-4">
              <li>The artist uploads their music through Tunecore.</li>
              <li>Tunecore distributes it to over 150 digital stores and streaming services worldwide.</li>
              <li>The artist receives 100% of the revenue and rights from their music sales and streams.</li>
            </ul>
          </div>
          
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
