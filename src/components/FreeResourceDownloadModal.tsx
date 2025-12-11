import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";

const PDF_URL = "/free-resources/Salt_Mineral_Deficiency_Chart.pdf";

interface FreeResourceDownloadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FreeResourceDownloadModal = ({ open, onOpenChange }: FreeResourceDownloadModalProps) => {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = PDF_URL;
    link.download = "Salt_Mineral_Deficiency_Chart.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download started!");
  };

  const handleOpenInBrowser = () => {
    window.open(PDF_URL, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Salt & Mineral Deficiency Chart
          </DialogTitle>
          <DialogDescription>
            Your free astrology resource is ready to download.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            This comprehensive chart shows the relationship between zodiac signs and their associated cell salts, 
            helping you identify potential mineral deficiencies based on your astrological profile.
          </p>

          <div className="flex flex-col gap-2">
            <Button onClick={handleDownload} className="w-full flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={handleOpenInBrowser} className="w-full">
              Open in Browser
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
