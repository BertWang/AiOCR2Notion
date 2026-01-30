"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

interface VersionHistoryProps {
  noteId: string;
  onRestore?: () => void;
}

export function VersionHistory({ noteId, onRestore }: VersionHistoryProps) {
  const [versions] = useState([]);

  return (
    <Button variant="outline" size="sm" className="flex items-center gap-2">
      <History className="w-4 h-4" />
      版本歷史
      {versions.length > 0 && (
        <Badge variant="secondary" className="ml-1">
          {versions.length}
        </Badge>
      )}
    </Button>
  );
}
