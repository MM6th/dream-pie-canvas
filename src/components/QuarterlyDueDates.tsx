
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const QuarterlyDueDates = () => {
  const currentDate = new Date();
  
  const dueDates = [
    {
      quarter: "Q1 2025",
      period: "Jan 1 - Mar 31, 2025",
      dueDate: "April 15, 2025",
      date: new Date("2025-04-15"),
    },
    {
      quarter: "Q2 2025",
      period: "Apr 1 - Jun 30, 2025",
      dueDate: "June 17, 2025",
      date: new Date("2025-06-17"),
    },
    {
      quarter: "Q3 2025",
      period: "Jul 1 - Sep 30, 2025",
      dueDate: "September 16, 2025",
      date: new Date("2025-09-16"),
    },
    {
      quarter: "Q4 2025",
      period: "Oct 1 - Dec 31, 2025",
      dueDate: "January 15, 2026",
      date: new Date("2026-01-15"),
    },
  ];

  const getQuarterStatus = (dueDate: Date) => {
    const today = new Date();
    const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) {
      return { status: "past", color: "bg-red-600", text: "Past Due" };
    } else if (daysDiff <= 30) {
      return { status: "upcoming", color: "bg-yellow-600", text: "Due Soon" };
    } else {
      return { status: "future", color: "bg-green-600", text: "Upcoming" };
    }
  };

  const getNextDueDate = () => {
    const today = new Date();
    return dueDates.find(quarter => quarter.date > today);
  };

  const nextDue = getNextDueDate();

  return (
    <Card className="bg-gray-700/50 border-gray-600">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          2025 Quarterly Due Dates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Next Due Date Highlight */}
        {nextDue && (
          <div className="bg-blue-900/30 border border-blue-600 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 font-medium">Next Payment Due</span>
            </div>
            <div className="text-lg font-bold text-blue-300">{nextDue.dueDate}</div>
            <div className="text-blue-200 text-sm">{nextDue.quarter}</div>
          </div>
        )}

        {/* All Quarters */}
        <div className="space-y-3">
          <h4 className="text-gray-300 font-medium">All Quarterly Deadlines</h4>
          {dueDates.map((quarter) => {
            const status = getQuarterStatus(quarter.date);
            return (
              <div key={quarter.quarter} className="bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{quarter.quarter}</span>
                  <Badge className={`${status.color} text-white`}>
                    {status.text}
                  </Badge>
                </div>
                <div className="text-sm text-gray-400">
                  <div>Period: {quarter.period}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" />
                    Due: {quarter.dueDate}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Important Notes */}
        <div className="bg-yellow-900/30 border border-yellow-600 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 font-medium">Important Reminders</span>
          </div>
          <ul className="text-yellow-200 text-sm space-y-1">
            <li>• Payments must be postmarked by the due date</li>
            <li>• Electronic payments must be submitted by 11:59 PM ET</li>
            <li>• Consider making payments early to avoid last-minute issues</li>
            <li>• Keep records of all quarterly payments for tax filing</li>
          </ul>
        </div>

        {/* Payment Methods */}
        <div className="bg-gray-800/50 p-3 rounded-lg">
          <h4 className="text-gray-300 font-medium mb-2">Payment Methods</h4>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• IRS Direct Pay (bank transfer)</li>
            <li>• EFTPS (Electronic Federal Tax Payment System)</li>
            <li>• Form 1040ES with check</li>
            <li>• Third-party payment processors</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuarterlyDueDates;
