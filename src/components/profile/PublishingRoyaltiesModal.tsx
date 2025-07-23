import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DollarSign, Link as LinkIcon } from "lucide-react";

const PublishingRoyaltiesModal = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white">
          <DollarSign className="w-4 h-4 mr-2" />
          Publishing Royalties
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center text-white font-bold tracking-tight">
            PIE Platform Publishing Royalties & Partnership Revenue
          </DialogTitle>
        </DialogHeader>
        <div className="py-6 space-y-6 text-gray-300">
          
          {/* PIE Platform Exclusive Distribution */}
          <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 p-6 rounded-lg border border-purple-500/30">
            <h3 className="text-xl font-semibold text-purple-300 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              PIE Platform Exclusive Distribution
            </h3>
            <p className="mb-4 text-purple-100">
              Audio products on PIE are exclusively available to supporters before widespread distribution. 
              Minimum pricing of <strong className="text-white">$2.00</strong> ensures premium quality and early access value.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-purple-900/20 p-4 rounded border border-purple-600">
                <h4 className="font-semibold text-purple-400 mb-2">PIE Platform</h4>
                <p className="text-2xl font-bold text-purple-300">10%</p>
                <p className="text-sm text-gray-300">After PayPal processing fees</p>
              </div>
              
              <div className="bg-blue-900/20 p-4 rounded border border-blue-600">
                <h4 className="font-semibold text-blue-400 mb-2">Main Artist</h4>
                <p className="text-2xl font-bold text-blue-300">60%</p>
                <p className="text-sm text-gray-300">After PIE and PayPal fees</p>
              </div>
              
              <div className="bg-green-900/20 p-4 rounded border border-green-600">
                <h4 className="font-semibold text-green-400 mb-2">Cover Model</h4>
                <p className="text-2xl font-bold text-green-300">30%</p>
                <p className="text-sm text-gray-300">After PIE and PayPal fees</p>
              </div>
            </div>

            <div className="bg-gray-800/50 p-4 rounded">
              <h4 className="font-medium text-white mb-2">PIE Platform Example ($2.00 purchase):</h4>
              <ul className="space-y-1 text-sm">
                <li>• PayPal Processing Fee: <span className="text-gray-400 font-medium">~$0.09 (2.9% + $0.30)</span></li>
                <li>• After PayPal: <span className="text-white font-medium">$1.91</span></li>
                <li>• PIE Platform: <span className="text-purple-300 font-medium">$0.19 (10%)</span></li>
                <li>• Main Artist: <span className="text-blue-300 font-medium">$1.15 (60%)</span></li>
                <li>• Cover Model: <span className="text-green-300 font-medium">$0.57 (30%)</span></li>
              </ul>
              <p className="text-xs text-gray-400 mt-2">
                * Revenue splits calculated after PayPal processing fees are deducted from the total purchase amount.
              </p>
            </div>
          </div>

          {/* TuneCore Distribution */}
          <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 p-6 rounded-lg border border-orange-500/30">
            <h3 className="text-xl font-semibold text-orange-300 mb-4">TuneCore Widespread Distribution</h3>
            <p className="mb-4 text-orange-100">
              After exclusive PIE platform release, tracks are distributed through TuneCore to 150+ digital stores 
              and streaming platforms including Spotify, Apple Music, Amazon Music, and YouTube Music.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-red-900/20 p-4 rounded border border-red-600">
                <h4 className="font-semibold text-red-400 mb-2">TuneCore Fee</h4>
                <p className="text-2xl font-bold text-red-300">15%</p>
                <p className="text-sm text-gray-300">Platform processing & distribution</p>
              </div>
              
              <div className="bg-blue-900/20 p-4 rounded border border-blue-600">
                <h4 className="font-semibold text-blue-400 mb-2">Main Artist</h4>
                <p className="text-2xl font-bold text-blue-300">70.5%</p>
                <p className="text-sm text-gray-300">85% of remaining revenue</p>
              </div>
              
              <div className="bg-green-900/20 p-4 rounded border border-green-600">
                <h4 className="font-semibold text-green-400 mb-2">Cover Model</h4>
                <p className="text-2xl font-bold text-green-300">14.5%</p>
                <p className="text-sm text-gray-300">20% of artist's share</p>
              </div>
            </div>

            <div className="bg-gray-800/50 p-4 rounded">
              <h4 className="font-medium text-white mb-2">TuneCore Example ($1.29 stream/purchase):</h4>
              <ul className="space-y-1 text-sm">
                <li>• TuneCore Fee: <span className="text-red-300 font-medium">$0.19 (15%)</span></li>
                <li>• Main Artist: <span className="text-blue-300 font-medium">$0.91 (70.5% of total)</span></li>
                <li>• Cover Model: <span className="text-green-300 font-medium">$0.19 (14.5% of total)</span></li>
              </ul>
              <p className="text-xs text-gray-400 mt-2">
                * Cover Model receives 20% of the Main Artist's 85% share after TuneCore fees
              </p>
            </div>
          </div>

          {/* Contract Process */}
          <div className="bg-gray-900/50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-400 mb-4">Revenue Sharing Process</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Cover submission approved by admin</li>
              <li>Contract generated with revenue sharing terms</li>
              <li>Merchant signs contract digitally</li>
              <li>Admin approves signed contract</li>
              <li>Track released exclusively on PIE platform ($2.00 minimum)</li>
              <li>After exclusivity period, submitted to TuneCore for widespread distribution</li>
              <li>Revenue sharing begins immediately upon platform sales</li>
            </ol>
          </div>

          {/* Key Differences */}
          <div className="bg-gray-900/50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Platform Comparison</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-purple-500/30 p-4 rounded">
                <h4 className="font-semibold text-purple-300 mb-2">PIE Platform</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Exclusive early access for supporters</li>
                  <li>Premium pricing ($2.00 minimum)</li>
                  <li>Higher revenue share for cover models (30%)</li>
                  <li>Direct relationship with supporters</li>
                </ul>
              </div>
              <div className="border border-orange-500/30 p-4 rounded">
                <h4 className="font-semibold text-orange-300 mb-2">TuneCore Distribution</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Widespread reach (150+ platforms)</li>
                  <li>Standard streaming/purchase prices</li>
                  <li>Lower revenue share for cover models (14.5%)</li>
                  <li>Global distribution network</li>
                </ul>
              </div>
            </div>
          </div>

          {/* YouTube/PIE Podcast Opportunities */}
          <div className="bg-gradient-to-r from-red-900/30 to-yellow-900/30 p-6 rounded-lg border border-red-500/30">
            <h3 className="text-xl font-semibold text-red-300 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              YouTube/PIE Podcast Opportunities
            </h3>
            <p className="mb-4 text-red-100">
              Merchants can access exclusive podcast opportunities that offer revenue sharing through both YouTube and PIE platform channels.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-red-900/20 p-4 rounded border border-red-600">
                <h4 className="font-semibold text-red-400 mb-2">YouTube Revenue Share</h4>
                <p className="text-2xl font-bold text-red-300">50%</p>
                <p className="text-sm text-gray-300">Of PIE's 70% share (after YouTube's 30% platform fee)</p>
              </div>
              
              <div className="bg-yellow-900/20 p-4 rounded border border-yellow-600">
                <h4 className="font-semibold text-yellow-400 mb-2">PIE Exclusive Revenue</h4>
                <p className="text-2xl font-bold text-yellow-300">50%</p>
                <p className="text-sm text-gray-300">Of individual video price per episode</p>
              </div>
            </div>

            <div className="bg-gray-800/50 p-4 rounded">
              <h4 className="font-medium text-white mb-2">Podcast Opportunity Structure:</h4>
              <ul className="space-y-1 text-sm">
                <li>• Monthly YouTube Membership: <span className="text-yellow-300 font-medium">Reference fee for royalty calculations</span></li>
                <li>• YouTube Royalty Distribution: <span className="text-red-300 font-medium">Activates at $100 threshold</span></li>
                <li>• PIE Exclusive Revenue: <span className="text-purple-300 font-medium">Paid monthly regardless of threshold</span></li>
                <li>• Revenue Share: <span className="text-blue-300 font-medium">50% of PIE's 70% YouTube share</span></li>
              </ul>
              <p className="text-xs text-gray-400 mt-2">
                * Podcast opportunities are available to approved merchants who download podcast content for video creation
              </p>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-gray-900/50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Important Notes</h3>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Revenue sharing applies to approved cover submissions and podcast opportunities</li>
              <li>Original licensing requirements must be met for all distributions</li>
              <li>Accurate metadata required for both PIE platform and TuneCore distribution</li>
              <li>Monthly royalty statements provided for all platforms</li>
              <li>Minimum payout thresholds may apply (YouTube: $100, PIE: no minimum)</li>
              <li>Cover models must provide first and last name for TuneCore registration</li>
              <li>Podcast opportunities require professional quality video content delivery</li>
              <li>All partnership revenue structures are subject to contract terms</li>
            </ul>
          </div>
        </div>
        
        <div className="flex justify-center pt-4">
          <Button asChild variant="outline" className="border-gray-600 text-white hover:bg-white hover:text-black">
            <a href="https://www.tunecore.com/music-publishing-administration" target="_blank" rel="noopener noreferrer">
              Learn more at TuneCore.com
              <LinkIcon className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PublishingRoyaltiesModal;