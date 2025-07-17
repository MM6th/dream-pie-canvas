import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { InfoIcon } from "lucide-react";

interface IndependentContractorDefinitionModalProps {
  children: React.ReactNode;
}

const IndependentContractorDefinitionModal = ({ children }: IndependentContractorDefinitionModalProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <InfoIcon className="h-5 w-5" />
            Independent Contractor Definition - New York State
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 text-sm">
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Official Definition</h3>
              <p className="text-blue-800 dark:text-blue-200">
                According to the New York State Department of Labor, an independent contractor is someone who is in business for themselves, 
                makes their services available to the public, and performs services free from supervision, direction, and control.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Three-Part Test for Independent Contractors</h3>
              <p className="mb-3">
                Under New York State law, to be classified as an independent contractor, ALL three of the following criteria must be met:
              </p>
              <div className="space-y-4">
                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-medium">1. Freedom from Control and Direction</h4>
                  <p className="text-muted-foreground">
                    The individual must be free from control and direction in performing the service, both under the contract 
                    for the performance of service and in fact.
                  </p>
                </div>
                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-medium">2. Service Outside Usual Business</h4>
                  <p className="text-muted-foreground">
                    The service must be performed outside the usual course of the hiring party's business, 
                    or performed outside of all the places of business of the hiring party.
                  </p>
                </div>
                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-medium">3. Independently Established Trade</h4>
                  <p className="text-muted-foreground">
                    The individual must be customarily engaged in an independently established trade, occupation, 
                    profession, or business of the same nature as that involved in the service performed.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Key Characteristics of Independent Contractors</h3>
              <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                <li>Have control over how, when, and where they perform their work</li>
                <li>Use their own tools and equipment</li>
                <li>Have the opportunity for profit or loss</li>
                <li>Provide services to multiple clients</li>
                <li>Are responsible for their own taxes and benefits</li>
                <li>Can hire their own assistants or subcontractors</li>
                <li>Have specialized skills or expertise</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">What This Means for PIE Platform Merchants</h3>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                <p className="mb-2">
                  As a merchant on PIE Platform, you would be operating as an independent contractor when:
                </p>
                <ul className="space-y-1 list-disc list-inside text-muted-foreground ml-4">
                  <li>Creating and managing your own content and products</li>
                  <li>Setting your own pricing and business terms</li>
                  <li>Maintaining control over your creative process and schedule</li>
                  <li>Operating your own business through the PIE Platform marketplace</li>
                </ul>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">Important Disclaimer</h3>
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                This information is provided for educational purposes based on New York State Department of Labor guidelines. 
                Classification as an independent contractor depends on the specific facts and circumstances of each situation. 
                For legal advice regarding your specific situation, please consult with a qualified attorney or tax professional.
              </p>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>
                <strong>Source:</strong> New York State Department of Labor - Division of Labor Standards
              </p>
              <p>
                For more information, visit: <span className="font-mono">labor.ny.gov</span>
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default IndependentContractorDefinitionModal;