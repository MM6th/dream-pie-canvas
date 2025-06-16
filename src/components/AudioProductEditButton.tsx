
import React from "react";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";

interface AudioProductEditButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

const AudioProductEditButton = ({ onClick, disabled }: AudioProductEditButtonProps) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      size="sm"
      className="bg-black text-white border-0 hover:bg-gray-800"
    >
      <Edit className="w-3 h-3 mr-1" />
      Edit
    </Button>
  );
};

export default AudioProductEditButton;
