"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Loader2,
  Search,
  Star,
  Users,
  AlertCircle,
  CheckCircle,
  Trash2,
  Power,
  PowerOff,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import { ServiceValidation } from "@/components/service-validation";
import { ServiceTroubleshooting } from "@/components/service-troubleshooting";

interface MarketplaceService {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  type: string;
  version: string;
  logo?: string;
  totalInstalls: number;
  rating?: number;
  reviews: number;
  isInstalled: boolean;
  requiredFields: Record<string, boolean>;
  optionalFields: Record<string, boolean>;
}

interface InstalledService {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  description?: string;
  lastTestStatus?: string;
  lastTestedAt?: string;
}

export function MCPMarketplaceClient() {
  const [activeTab, setActiveTab] = useState("browse");
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [installedServices, setInstalledServices] = useState<InstalledService[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<Set<string>>(new Set());
  const [selectedService, setSelectedService] = useState<MarketplaceService | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [testingServices, setTestingServices] = useState<Set<string>>(new Set());
  const [deletingServices, setDeletingServices] = useState<Set<string>>(new Set());
  const [togglingServices, setTogglingServices] = useState<Set<string>>(new Set());
  const [managingServices, setManagingServices] = useState<Set<string>>(new Set());
  const [ratingServices, setRatingServices] = useState<Record<string, any>>({});
  const [favoriteServices, setFavoriteServices] = useState<Set<string>>(new Set());
  const [ratingStars, setRatingStars] = useState<Record<string, number>>({});
  const [favoritingServices, setFavoritingServices] = useState<Set<string>>(new Set());
  const [expandedService, setExpandedService] = useState<string | null>(null);

  // 加載市場數據
  useEffect(() => {
    loadMarketplace();
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    if (selectedService) {
      const initialValues: Record<string, string> = {};
      Object.keys(selectedService.requiredFields || {}).forEach((field) => {
        initialValues[field] = "";
      });
      Object.keys(selectedService.optionalFields || {}).forEach((field) => {
        if (!(field in initialValues)) initialValues[field] = "";
      });
      setConfigValues(initialValues);
    }
  }, [selectedService]);

  const loadMarketplace = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append("category", selectedCategory);
      if (searchQuery) params.append("search", searchQuery);

      const response = await fetch(`/api/mcp/marketplace?${params}`);
      const data = await response.json();

      if (data.success) {
        setServices(data.marketplace || []);
        setCategories(data.categories || []);
      }
    } catch (error) {
      toast.error("無法加載市場數據");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 加載已安裝的服務
  useEffect(() => {
    const loadInstalled = async () => {
      try {
        const response = await fetch("/api/mcp/marketplace?action=installed");
        const data = await response.json();
        if (data.success) {
          setInstalledServices(data.installed || []);
        }
      } catch (error) {
        console.error("Failed to load installed services:", error);
      }
    };

    loadInstalled();
  }, []);

  const handleInstall = async (service: MarketplaceService) => {
    if (service.isInstalled) {
      toast.info(`${service.displayName} 已經安裝`);
      return;
    }

    setInstalling((prev) => new Set(prev).add(service.id));

    try {
      const response = await fetch("/api/mcp/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registryId: service.id,
          config: configValues,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "安裝失敗");
      }

      toast.success(`${service.displayName} 已安裝`, {
        description: data.message,
      });

      // 重新加載數據
      loadMarketplace();
      setInstalledServices((prev) => [
        ...prev,
        {
          id: data.serviceId,
          name: service.name,
          type: service.type,
          enabled: true,
          description: service.description,
        },
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "安裝失敗"
      );
    } finally {
      setInstalling((prev) => {
        const next = new Set(prev);
        next.delete(service.id);
        return next;
      });
    }
  };

  const handleTestService = async (serviceId: string) => {
    setTestingServices((prev) => new Set(prev).add(serviceId));
    try {
      const response = await fetch(`/api/mcp/${serviceId}/test`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "測試失敗");
      }

      toast.success("測試完成", { description: data.message });
      setInstalledServices((prev) =>
        prev.map((service) =>
          service.id === serviceId
            ? {
                ...service,
                lastTestStatus: data.testStatus,
                lastTestedAt: data.timestamp,
              }
            : service
        )
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "測試失敗");
    } finally {
      setTestingServices((prev) => {
        const next = new Set(prev);
        next.delete(serviceId);
        return next;
      });
    }
  };

  const handleFavoriteToggle = async (serviceId: string) => {
    setFavoritingServices((prev) => new Set(prev).add(serviceId));
    const isFavorited = favoriteServices.has(serviceId);
    const action = isFavorited ? "remove" : "add";

    try {
      const response = await fetch(`/api/mcp/${serviceId}/favorite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "收藏操作失敗");
      }

      setFavoriteServices((prev) => {
        const next = new Set(prev);
        if (isFavorited) {
          next.delete(serviceId);
          toast.success("已移除收藏");
        } else {
          next.add(serviceId);
          toast.success("已添加收藏");
        }
        return next;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "收藏操作失敗");
    } finally {
      setFavoritingServices((prev) => {
        const next = new Set(prev);
        next.delete(serviceId);
        return next;
      });
    }
  };



  const handleToggleService = async (serviceId: string) => {
    setTogglingServices((prev) => new Set(prev).add(serviceId));
    try {
      const response = await fetch(`/api/mcp/services/${serviceId}/toggle`, {
        method: "PATCH",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "切換失敗");
      }

      toast.success(data.message);
      setInstalledServices((prev) =>
        prev.map((service) =>
          service.id === serviceId
            ? { ...service, enabled: data.enabled }
            : service
        )
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "切換失敗");
    } finally {
      setTogglingServices((prev) => {
        const next = new Set(prev);
        next.delete(serviceId);
        return next;
      });
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("確定要刪除此服務？此操作無法復原。")) return;

    setDeletingServices((prev) => new Set(prev).add(serviceId));
    try {
      const response = await fetch(`/api/mcp/services/${serviceId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "刪除失敗");
      }

      toast.success("服務已刪除");
      setInstalledServices((prev) =>
        prev.filter((service) => service.id !== serviceId)
      );
      loadMarketplace();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "刪除失敗");
    } finally {
      setDeletingServices((prev) => {
        const next = new Set(prev);
        next.delete(serviceId);
        return next;
      });
    }
  };

  const handleManageService = async (serviceId: string, action: "enable" | "disable" | "uninstall") => {
    setManagingServices((prev) => new Set(prev).add(serviceId));
    try {
      const response = await fetch(`/api/mcp/${serviceId}/manage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "操作失敗");
      }

      if (action === "uninstall") {
        setInstalledServices((prev) => prev.filter((s) => s.id !== serviceId));
        toast.success("已卸載");
      } else {
        setInstalledServices((prev) =>
          prev.map((s) =>
            s.id === serviceId
              ? { ...s, enabled: action === "enable" }
              : s
          )
        );
        toast.success(data.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失敗");
    } finally {
      setManagingServices((prev) => {
        const next = new Set(prev);
        next.delete(serviceId);
        return next;
      });
    }
  };

  const handleRateService = async (serviceId: string, rating: number, isFavorite: boolean) => {
    try {
      const response = await fetch(`/api/mcp/${serviceId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          isFavorite,
          userId: `user_${Date.now()}`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "評分失敗");
      }

      setRatingServices((prev) => ({
        ...prev,
        [serviceId]: { rating, isFavorite },
      }));
      toast.success("評分已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "評分失敗");
    }
  };

  return (
    <div className="space-y-6">
      {/* 安裝確認對話框 */}
      <Dialog
        open={selectedService !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedService(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>安裝 {selectedService?.displayName}</DialogTitle>
            <DialogDescription>
              {selectedService?.description}
            </DialogDescription>
          </DialogHeader>

          {selectedService && (
            <div className="space-y-4">
              {Object.keys(selectedService.requiredFields).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">必填配置</h4>
                  {Object.keys(selectedService.requiredFields).map((field) => (
                    <div key={field} className="space-y-1">
                      <label className="text-xs text-stone-600 flex items-center gap-2">
                        <AlertCircle className="h-3 w-3 text-orange-600" />
                        {field}
                      </label>
                      <Input
                        value={configValues[field] || ""}
                        onChange={(e) =>
                          setConfigValues((prev) => ({
                            ...prev,
                            [field]: e.target.value,
                          }))
                        }
                        placeholder={`輸入 ${field}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              {Object.keys(selectedService.optionalFields).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">選填配置</h4>
                  {Object.keys(selectedService.optionalFields).map((field) => (
                    <div key={field} className="space-y-1">
                      <label className="text-xs text-stone-600">{field}</label>
                      <Input
                        value={configValues[field] || ""}
                        onChange={(e) =>
                          setConfigValues((prev) => ({
                            ...prev,
                            [field]: e.target.value,
                          }))
                        }
                        placeholder={`輸入 ${field}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={() => {
                  handleInstall(selectedService);
                  setSelectedService(null);
                }}
                className="w-full"
                disabled={
                  installing.has(selectedService.id) ||
                  Object.keys(selectedService.requiredFields).some(
                    (field) => !configValues[field]
                  )
                }
              >
                {installing.has(selectedService.id) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    安裝中...
                  </>
                ) : (
                  "確認安裝"
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="browse">瀏覽市場</TabsTrigger>
          <TabsTrigger value="installed">
            已安裝 ({installedServices.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          {/* 搜尋和篩選 */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
              <Input
                placeholder="搜尋 MCP 服務..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* 分類篩選 */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  全部
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* 服務網格 */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-stone-500">未找到服務</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => (
                <Card
                  key={service.id}
                  className={`flex flex-col transition-all ${
                    service.isInstalled ? "border-green-200 bg-green-50" : ""
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">
                          {service.displayName}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          v{service.version}
                        </CardDescription>
                      </div>
                      {service.isInstalled && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-3">
                    <p className="text-sm text-stone-600">
                      {service.description}
                    </p>

                    {/* 統計信息 */}
                    <div className="flex items-center gap-4 text-xs text-stone-500">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {service.totalInstalls}+
                      </div>
                      {service.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {service.rating}
                        </div>
                      )}
                    </div>

                    {/* 標籤 */}
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {service.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {service.type}
                      </Badge>
                    </div>

                    {/* 必填字段提示 */}
                    {Object.keys(service.requiredFields).length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                        <AlertCircle className="h-3 w-3" />
                        需要配置
                      </div>
                    )}

                    {/* 安裝按鈕 */}
                    <div className="space-y-2 pt-2">
                      <Button
                        size="sm"
                        className="w-full"
                        variant={service.isInstalled ? "secondary" : "default"}
                        disabled={installing.has(service.id) || service.isInstalled}
                        onClick={() => {
                          if (!service.isInstalled) {
                            setSelectedService(service);
                          }
                        }}
                      >
                        {installing.has(service.id) ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            安裝中...
                          </>
                        ) : service.isInstalled ? (
                          "已安裝"
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            安裝
                          </>
                        )}
                      </Button>
                      
                      {/* 評分和收藏 */}
                      <div className="flex gap-2">
                        <div className="flex-1 flex items-center gap-1 bg-stone-50 rounded p-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() =>
                                  handleRateService(service.id, star, 
                                    ratingServices[service.id]?.isFavorite ?? false)
                                }
                                className="hover:opacity-70 transition-opacity"
                                disabled={service.isInstalled ? false : true}
                              >
                                <Star
                                  className={`h-4 w-4 ${
                                    star <=
                                    (ratingServices[service.id]?.rating ?? 0)
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-stone-300"
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                          <span className="text-xs text-stone-500 ml-1">
                            ({service.reviews || 0})
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            handleRateService(service.id, 
                              ratingServices[service.id]?.rating ?? 0,
                              !(ratingServices[service.id]?.isFavorite ?? false))
                          }
                          disabled={service.isInstalled ? false : true}
                          className="p-2 hover:bg-stone-100 rounded transition-colors"
                          title="收藏此服務"
                        >
                          <Heart
                            className={`h-4 w-4 ${
                              ratingServices[service.id]?.isFavorite
                                ? "fill-red-500 text-red-500"
                                : "text-stone-300"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="installed" className="space-y-4">
          {installedServices.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-stone-500 mb-4">未安裝任何服務</p>
              <Button
                onClick={() => {
                  setActiveTab("browse");
                  setSelectedCategory(null);
                  setSearchQuery("");
                }}
              >
                瀏覽市場
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {installedServices.map((service) => (
                <Card key={service.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {service.name}
                        </CardTitle>
                        {service.description && (
                          <CardDescription className="text-xs">
                            {service.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {service.lastTestStatus === "success" ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-orange-600" />
                        )}
                        <Badge
                          variant={service.enabled ? "default" : "secondary"}
                        >
                          {service.enabled ? "啟用" : "停用"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xs text-stone-500">
                      {service.lastTestedAt
                        ? `上次測試：${new Date(service.lastTestedAt).toLocaleString()}`
                        : "尚未測試"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestService(service.id)}
                        disabled={testingServices.has(service.id)}
                        className="flex-1"
                      >
                        {testingServices.has(service.id) ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            測試中...
                          </>
                        ) : (
                          "測試連線"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleService(service.id)}
                        disabled={togglingServices.has(service.id)}
                        className="flex-1"
                      >
                        {togglingServices.has(service.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : service.enabled ? (
                          <>
                            <PowerOff className="h-4 w-4 mr-2" />
                            停用
                          </>
                        ) : (
                          <>
                            <Power className="h-4 w-4 mr-2" />
                            啟用
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteService(service.id)}
                        disabled={deletingServices.has(service.id)}
                      >
                        {deletingServices.has(service.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* 詳細診斷按鈕 */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setExpandedService(
                          expandedService === service.id ? null : service.id
                        )
                      }
                      className="w-full"
                    >
                      {expandedService === service.id ? "隱藏詳情" : "顯示詳情"}
                    </Button>

                    {/* 展開的驗證和故障排查部分 */}
                    {expandedService === service.id && (
                      <div className="space-y-4 pt-4 border-t">
                        <ServiceValidation
                          serviceId={service.id}
                          serviceName={service.name}
                        />
                        <ServiceTroubleshooting
                          serviceId={service.id}
                          serviceName={service.name}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
