
import React from "react";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";

interface EditButtonProps {
  onClick: () => void;
  children?: React.ReactNode;
  disabled?: boolean;
}

const EditButton = ({ onClick, children, disabled }: EditButtonProps) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="bg-black text-white border-0"
    >
      <Edit className="w-4 h-4 mr-2" />
      {children || "Edit"}
    </Button>
  );
};

export default EditButton;
