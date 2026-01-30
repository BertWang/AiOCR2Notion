"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload } from "lucide-react";
import { toast } from "sonner";

interface NotionExportProps {
  selectedNoteIds: string[];
  onExportComplete?: () => void;
}

export function NotionExport({ selectedNoteIds, onExportComplete }: NotionExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (selectedNoteIds.length === 0) {
      toast.error("請至少選擇一份筆記");
      return;
    }
    toast.info("Notion 匯出功能開發中...");
  };

  return (
    <Button 
      variant="outline" 
      size="sm"
      disabled={selectedNoteIds.length === 0 || isExporting}
      className="flex items-center gap-2"
      onClick={handleExport}
    >
      <Upload className="w-4 h-4" />
      匯出到 Notion
      {selectedNoteIds.length > 0 && (
        <Badge variant="secondary" className="ml-1">
          {selectedNoteIds.length}
        </Badge>
      )}
    </Button>
  );
}
