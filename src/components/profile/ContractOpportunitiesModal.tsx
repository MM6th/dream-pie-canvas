import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Briefcase, Star, Users, TrendingUp } from "lucide-react";

const ContractOpportunitiesModal = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white">
          <Briefcase className="w-4 h-4 mr-2" />
          Contract Opportunities
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center text-white font-bold tracking-tight">
            PIE Platform Contract Opportunities
          </DialogTitle>
        </DialogHeader>
        <div className="py-6 space-y-6 text-gray-300">
          
          {/* Overview */}
          <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 p-6 rounded-lg border border-purple-500/30">
            <h3 className="text-xl font-semibold text-purple-300 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5" />
              Exclusive Contractor Opportunities
            </h3>
            <p className="mb-4 text-purple-100">
              PIE Platform announces exclusive contractor positions through announcement posts. Only approved merchants 
              can apply for these specialized opportunities with competitive revenue sharing and professional contracts.
            </p>
          </div>

          {/* Contract Types */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-600">
              <h4 className="font-semibold text-blue-400 mb-2">Audio Production</h4>
              <p className="text-sm text-gray-300 mb-2">Music production, sound design, and audio editing</p>
              <div className="text-xs text-blue-300">
                <p>• TuneCore distribution partnerships</p>
                <p>• Revenue sharing up to 70%</p>
                <p>• Professional mixing & mastering</p>
              </div>
            </div>

            <div className="bg-green-900/20 p-4 rounded-lg border border-green-600">
              <h4 className="font-semibold text-green-400 mb-2">ASMR Content</h4>
              <p className="text-sm text-gray-300 mb-2">Specialized ASMR recording and production</p>
              <div className="text-xs text-green-300">
                <p>• Premium audio quality standards</p>
                <p>• YouTube monetization support</p>
                <p>• Exclusive platform distribution</p>
              </div>
            </div>

            <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-600">
              <h4 className="font-semibold text-purple-400 mb-2">Modeling</h4>
              <p className="text-sm text-gray-300 mb-2">Fashion photography and brand representation</p>
              <div className="text-xs text-purple-300">
                <p>• Professional photo shoots</p>
                <p>• Brand partnership opportunities</p>
                <p>• Portfolio development support</p>
              </div>
            </div>

            <div className="bg-orange-900/20 p-4 rounded-lg border border-orange-600">
              <h4 className="font-semibold text-orange-400 mb-2">Podcast Production</h4>
              <p className="text-sm text-gray-300 mb-2">Podcast hosting, editing, and distribution</p>
              <div className="text-xs text-orange-300">
                <p>• Multi-platform distribution</p>
                <p>• Professional editing services</p>
                <p>• Monetization strategies</p>
              </div>
            </div>

            <div className="bg-red-900/20 p-4 rounded-lg border border-red-600">
              <h4 className="font-semibold text-red-400 mb-2">Film Production</h4>
              <p className="text-sm text-gray-300 mb-2">Video production and cinematography</p>
              <div className="text-xs text-red-300">
                <p>• Professional video equipment</p>
                <p>• Post-production services</p>
                <p>• Distribution partnerships</p>
              </div>
            </div>

            <div className="bg-teal-900/20 p-4 rounded-lg border border-teal-600">
              <h4 className="font-semibold text-teal-400 mb-2">Video Content</h4>
              <p className="text-sm text-gray-300 mb-2">Short-form and long-form video creation</p>
              <div className="text-xs text-teal-300">
                <p>• Social media optimization</p>
                <p>• Platform-specific formatting</p>
                <p>• Analytics and insights</p>
              </div>
            </div>
          </div>

          {/* Revenue Sharing */}
          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 p-6 rounded-lg border border-green-500/30">
            <h3 className="text-xl font-semibold text-green-300 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Revenue Sharing Structure
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-800/50 p-4 rounded">
                <h4 className="font-semibold text-yellow-400 mb-2">YouTube Revenue</h4>
                <p className="text-sm text-gray-300 mb-2">From membership subscriptions and monetization</p>
                <p className="text-lg font-bold text-yellow-300">Up to 70% contractor share</p>
                <p className="text-xs text-gray-400">Varies by project and negotiation</p>
              </div>
              
              <div className="bg-gray-800/50 p-4 rounded">
                <h4 className="font-semibold text-purple-400 mb-2">PIE Platform</h4>
                <p className="text-sm text-gray-300 mb-2">Per-episode or project-based compensation</p>
                <p className="text-lg font-bold text-purple-300">Competitive rates + % share</p>
                <p className="text-xs text-gray-400">Based on project scope and deliverables</p>
              </div>
            </div>

            <div className="bg-gray-800/50 p-4 rounded">
              <h4 className="font-medium text-white mb-2">Contract Examples:</h4>
              <ul className="space-y-1 text-sm">
                <li>• Audio Production: $150/episode + 65% revenue share</li>
                <li>• Video Content: $200/episode + 70% YouTube revenue</li>
                <li>• Modeling: $300/shoot + brand partnership percentages</li>
                <li>• Podcast: $100/episode + platform revenue sharing</li>
              </ul>
              <p className="text-xs text-gray-400 mt-2">
                * Rates and percentages are examples and vary by specific contract terms
              </p>
            </div>
          </div>

          {/* Application Process */}
          <div className="bg-gray-900/50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              How Contract Opportunities Work
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Admin posts announcement with contract details and requirements</li>
              <li>Only approved merchants can view and apply for opportunities</li>
              <li>Download and review the specific contract terms</li>
              <li>Digitally sign the contract if terms are acceptable</li>
              <li>Admin reviews and approves signed contracts</li>
              <li>Work begins upon contract approval with clear deliverables</li>
              <li>Revenue sharing and payments processed according to contract terms</li>
            </ol>
          </div>

          {/* Benefits & Requirements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900/50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-green-400 mb-4">Benefits</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Exclusive access to high-paying contracts</li>
                <li>Professional development opportunities</li>
                <li>Revenue sharing partnerships</li>
                <li>Platform promotion and exposure</li>
                <li>Direct collaboration with PIE Platform</li>
                <li>Portfolio and brand building support</li>
              </ul>
            </div>
            
            <div className="bg-gray-900/50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-400 mb-4">Requirements</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Approved merchant status on PIE Platform</li>
                <li>Professional quality standards</li>
                <li>Reliable communication and deadlines</li>
                <li>Compliance with platform content guidelines</li>
                <li>Digital contract signing capability</li>
                <li>Portfolio or work samples (when applicable)</li>
              </ul>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-gray-900/50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Important Notes</h3>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Contract opportunities are limited and competitive</li>
              <li>All terms are negotiable and project-specific</li>
              <li>Revenue sharing percentages vary by contract type and scope</li>
              <li>Professional standards and quality requirements must be met</li>
              <li>Contracts include specific deliverables, timelines, and payment terms</li>
              <li>Successful completion leads to priority consideration for future opportunities</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContractOpportunitiesModal;