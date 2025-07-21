
import React, { useState } from 'react';
import { Button } from './button';

interface ExpandableDescriptionProps {
  description: string;
  maxLength?: number;
  className?: string;
}

const ExpandableDescription = ({ 
  description, 
  maxLength = 100, 
  className = "" 
}: ExpandableDescriptionProps) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!description) return null;
  
  const shouldTruncate = description.length > maxLength;
  const displayText = expanded || !shouldTruncate 
    ? description 
    : `${description.substring(0, maxLength)}...`;

  return (
    <div className={className}>
      <p className="text-gray-400 text-sm">{displayText}</p>
      {shouldTruncate && (
        <Button
          variant="link"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="text-blue-400 hover:text-blue-300 p-0 h-auto text-xs"
        >
          {expanded ? 'See less' : 'See more'}
        </Button>
      )}
    </div>
  );
};

export default ExpandableDescription;
