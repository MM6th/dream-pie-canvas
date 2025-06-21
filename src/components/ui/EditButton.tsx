
import React from "react";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditButtonProps {
  onClick: () => void;
  children?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

const EditButton = ({ onClick, children, disabled, className }: EditButtonProps) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={cn("bg-black text-white border-0", className)}
    >
      <Edit className="w-4 h-4 mr-2" />
      {children || "Edit"}
    </Button>
  );
};

export default EditButton;
