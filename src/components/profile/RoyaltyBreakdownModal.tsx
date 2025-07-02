import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";

const RoyaltyBreakdownModal = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white">
          <DollarSign className="w-4 h-4 mr-2" />
          View Royalty Breakdown
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center text-white font-bold tracking-tight">
            TuneCore Partnership Revenue Breakdown
          </DialogTitle>
        </DialogHeader>
        <div className="py-6 space-y-6 text-gray-300">
          
          <div className="bg-gray-900/50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-400 mb-4">Revenue Distribution Structure</h3>
            <p className="mb-4">
              Through our partnership with TuneCore, cover submissions are distributed across major streaming platforms 
              including Spotify, Apple Music, Amazon Music, and YouTube Music.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-red-900/20 p-4 rounded border border-red-600">
                <h4 className="font-semibold text-red-400 mb-2">TuneCore Distribution Fee</h4>
                <p className="text-2xl font-bold text-red-300">15%</p>
                <p className="text-sm text-gray-400">Platform processing & distribution</p>
              </div>
              
              <div className="bg-blue-900/20 p-4 rounded border border-blue-600">
                <h4 className="font-semibold text-blue-400 mb-2">PIE (Original Artist)</h4>
                <p className="text-2xl font-bold text-blue-300">70.5%</p>
                <p className="text-sm text-gray-400">85% of remaining revenue</p>
              </div>
              
              <div className="bg-green-900/20 p-4 rounded border border-green-600">
                <h4 className="font-semibold text-green-400 mb-2">Cover Artist (You)</h4>
                <p className="text-2xl font-bold text-green-300">14.5%</p>
                <p className="text-sm text-gray-400">20% of PIE's share</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-400 mb-4">Example Calculation</h3>
            <div className="bg-gray-800 p-4 rounded">
              <p className="font-medium text-white mb-2">For a $1.29 song purchase/stream:</p>
              <ul className="space-y-1 text-sm">
                <li>• TuneCore receives: <span className="text-red-300 font-medium">$0.19 (15%)</span></li>
                <li>• PIE receives: <span className="text-blue-300 font-medium">$0.91 (70.5% of total)</span></li>
                <li>• Cover Artist receives: <span className="text-green-300 font-medium">$0.19 (14.5% of total)</span></li>
              </ul>
              <p className="text-xs text-gray-400 mt-2">
                * Cover Artist percentage equals 20% of PIE's 85% share after TuneCore fees
              </p>
            </div>
          </div>

          <div className="bg-gray-900/50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-400 mb-4">Contract Process</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Cover submission approved by admin</li>
              <li>Contract generated with revenue sharing terms</li>
              <li>Merchant signs contract digitally</li>
              <li>Admin approves signed contract</li>
              <li>Contract submitted to TuneCore for processing</li>
              <li>Email confirmation with publishing date provided</li>
              <li>Revenue sharing begins upon distribution</li>
            </ol>
          </div>

          <div className="bg-gray-900/50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Important Notes</h3>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Revenue sharing applies only to approved cover submissions</li>
              <li>Original licensing requirements must be met</li>
              <li>Accurate metadata required for distribution</li>
              <li>Monthly royalty statements provided via TuneCore</li>
              <li>Minimum payout thresholds may apply</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoyaltyBreakdownModal;