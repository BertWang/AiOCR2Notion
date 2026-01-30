"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ConfigPreset {
  id: string;
  name: string;
  description: string | null;
  type: string;
  config: any;
  isDefault: boolean;
  usageCount: number;
}

interface ConfigPresetsManagerProps {
  type: string;
  currentConfig?: any;
  onApplyPreset?: (config: any) => void;
}

export function ConfigPresetsManager({ type, onApplyPreset }: ConfigPresetsManagerProps) {
  const [presets, setPresets] = useState<ConfigPreset[]>([]);
  
  const handleSavePreset = async () => {
    toast.info("預設儲存功能開發中...");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          配置預設
        </h3>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleSavePreset}>
          <Plus className="w-3 h-3 mr-1" />
          儲存配置
        </Button>
      </div>
      
      <div className="text-sm text-stone-500">
        {presets.length === 0 ? "尚無預設配置" : `有 ${presets.length} 個預設`}
      </div>
    </div>
  );
}
