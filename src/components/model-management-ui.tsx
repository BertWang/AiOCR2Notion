"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Save, RotateCw, Brain, Zap, Sparkles, Settings2 } from "lucide-react";

// Gemini 模型配置
const GEMINI_MODELS = [
  {
    id: "gemini-2.0-flash-exp",
    name: "Gemini 2.0 Flash (實驗版)",
    description: "最新實驗版本，速度最快",
    speed: 5,
    quality: 4,
    cost: 1,
    recommended: true
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash (穩定版)",
    description: "2.0 Flash 穩定版本",
    speed: 5,
    quality: 4,
    cost: 1,
    recommended: false
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    description: "更強大但較慢，適合複雜任務",
    speed: 3,
    quality: 5,
    cost: 3,
    recommended: false
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    description: "1.5 Flash 快速版本",
    speed: 4,
    quality: 3,
    cost: 1,
    recommended: false
  },
  {
    id: "gemini-1.5-flash-8b",
    name: "Gemini 1.5 Flash 8B",
    description: "輕量級版本，極快速度",
    speed: 5,
    quality: 3,
    cost: 1,
    recommended: false
  },
  {
    id: "gemini-pro",
    name: "Gemini Pro (Legacy)",
    description: "早期 Pro 版本",
    speed: 3,
    quality: 4,
    cost: 2,
    recommended: false
  }
];

interface ModelConfig {
  modelName: string;
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
}

export function ModelManagementUI() {
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.0-flash-exp");
  const [temperature, setTemperature] = useState<number>(0.7);
  const [topP, setTopP] = useState<number>(0.9);
  const [topK, setTopK] = useState<number>(40);
  const [maxTokens, setMaxTokens] = useState<number>(2048);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 載入當前配置
  useEffect(() => {
    loadCurrentConfig();
  }, []);

  const loadCurrentConfig = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSelectedModel(data.settings.modelName || "gemini-2.0-flash-exp");
          
          // 解析 config JSON
          const config = typeof data.settings.config === 'string' 
            ? JSON.parse(data.settings.config) 
            : data.settings.config;
          
          if (config) {
            setTemperature(config.temperature ?? 0.7);
            setTopP(config.topP ?? 0.9);
            setTopK(config.topK ?? 40);
            setMaxTokens(config.maxOutputTokens ?? 2048);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load model config:', error);
      toast.error('無法載入模型配置');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // 驗證參數範圍
    if (temperature < 0 || temperature > 2) {
      toast.error('溫度參數必須在 0-2 之間');
      return;
    }
    if (topP < 0 || topP > 1) {
      toast.error('Top P 必須在 0-1 之間');
      return;
    }
    if (topK < 1 || topK > 100) {
      toast.error('Top K 必須在 1-100 之間');
      return;
    }

    setIsSaving(true);
    try {
      const config: ModelConfig = {
        modelName: selectedModel,
        temperature,
        topP,
        topK,
        maxOutputTokens: maxTokens
      };

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiProvider: 'gemini',
          modelName: selectedModel,
          config: JSON.stringify(config)
        })
      });

      if (!response.ok) throw new Error('Failed to save');

      toast.success('模型配置已保存', {
        description: `現在使用 ${GEMINI_MODELS.find(m => m.id === selectedModel)?.name}`
      });
    } catch (error) {
      console.error('Save error:', error);
      toast.error('保存失敗，請稍後再試');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setTemperature(0.7);
    setTopP(0.9);
    setTopK(40);
    setMaxTokens(2048);
    toast.info('已重置為默認參數');
  };

  const currentModel = GEMINI_MODELS.find(m => m.id === selectedModel);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <div className="flex items-center gap-2 text-stone-500">
            <RotateCw className="w-4 h-4 animate-spin" />
            載入配置中...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 模型選擇 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI 模型選擇
              </CardTitle>
              <CardDescription>選擇適合您需求的 Gemini 模型版本</CardDescription>
            </div>
            {currentModel?.recommended && (
              <Badge variant="default" className="bg-green-500">
                <Sparkles className="w-3 h-3 mr-1" />
                推薦
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {GEMINI_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                className={cn(
                  "relative p-4 rounded-lg border-2 text-left transition-all hover:shadow-md",
                  selectedModel === model.id
                    ? "border-stone-900 bg-stone-50"
                    : "border-stone-200 hover:border-stone-300"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm">{model.name}</h3>
                  {model.recommended && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      推薦
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-stone-500 mb-3">{model.description}</p>
                
                {/* 性能指標 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> 速度
                    </span>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-1.5 h-3 rounded-sm",
                            i < model.speed ? "bg-green-500" : "bg-stone-200"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> 品質
                    </span>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-1.5 h-3 rounded-sm",
                            i < model.quality ? "bg-blue-500" : "bg-stone-200"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500">成本</span>
                    <span className="font-mono">{"$".repeat(model.cost)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 模型參數調整 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            模型參數
          </CardTitle>
          <CardDescription>調整模型行為以優化輸出結果</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">基礎參數</TabsTrigger>
              <TabsTrigger value="advanced">進階參數</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6 mt-6">
              {/* Temperature */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="temperature">溫度 (Temperature)</Label>
                  <span className="text-sm font-mono text-stone-600">{temperature.toFixed(2)}</span>
                </div>
                <Slider
                  id="temperature"
                  min={0}
                  max={2}
                  step={0.1}
                  value={[temperature]}
                  onValueChange={(value) => setTemperature(value[0])}
                  className="w-full"
                />
                <p className="text-xs text-stone-500">
                  控制輸出的隨機性。較低值（0.0-0.5）更保守，較高值（0.5-2.0）更有創意。
                </p>
              </div>

              {/* Max Tokens */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="maxTokens">最大 Token 數</Label>
                  <span className="text-sm font-mono text-stone-600">{maxTokens}</span>
                </div>
                <Slider
                  id="maxTokens"
                  min={512}
                  max={4096}
                  step={256}
                  value={[maxTokens]}
                  onValueChange={(value) => setMaxTokens(value[0])}
                  className="w-full"
                />
                <p className="text-xs text-stone-500">
                  限制輸出長度。較高值允許更長的回應，但會增加成本。
                </p>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6 mt-6">
              {/* Top P */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="topP">Top P (Nucleus Sampling)</Label>
                  <span className="text-sm font-mono text-stone-600">{topP.toFixed(2)}</span>
                </div>
                <Slider
                  id="topP"
                  min={0}
                  max={1}
                  step={0.05}
                  value={[topP]}
                  onValueChange={(value) => setTopP(value[0])}
                  className="w-full"
                />
                <p className="text-xs text-stone-500">
                  考慮累積概率質量中的 token。0.9 表示只考慮前 90% 的 token。
                </p>
              </div>

              {/* Top K */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="topK">Top K</Label>
                  <span className="text-sm font-mono text-stone-600">{topK}</span>
                </div>
                <Slider
                  id="topK"
                  min={1}
                  max={100}
                  step={1}
                  value={[topK]}
                  onValueChange={(value) => setTopK(value[0])}
                  className="w-full"
                />
                <p className="text-xs text-stone-500">
                  限制每步考慮的 token 數量。較低值（10-20）更確定，較高值（40-100）更多樣。
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* 操作按鈕 */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button variant="outline" onClick={handleReset}>
              <RotateCw className="w-4 h-4 mr-2" />
              重置為默認值
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存配置
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 使用說明 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-900">配置建議</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 一般用途：使用 <strong>Gemini 2.0 Flash</strong> + 溫度 0.7</li>
                <li>• 高精度需求：使用 <strong>Gemini 1.5 Pro</strong> + 溫度 0.3</li>
                <li>• 創意內容：使用 <strong>Gemini 2.0 Flash</strong> + 溫度 1.0</li>
                <li>• 成本優化：使用 <strong>Gemini 1.5 Flash 8B</strong></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
