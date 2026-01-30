"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AdminPanel() {
  const [settings, setSettings] = useState<any>(null);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchIntegrations();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      setSettings(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchIntegrations() {
    try {
      const res = await fetch('/api/integrations');
      const data = await res.json();
      setIntegrations(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function saveSettings() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings', { method: 'PUT', body: JSON.stringify(settings) });
      if (!res.ok) throw new Error('save failed');
      const data = await res.json();
      setSettings(data);
      toast.success('設定已儲存');
    } catch (e) {
      console.error(e);
      toast.error('儲存失敗');
    } finally { setLoading(false); }
  }

  async function toggleIntegration(id: string, enabled: boolean) {
    try {
      const res = await fetch('/api/integrations', { method: 'PUT', body: JSON.stringify({ id, enabled }) });
      if (!res.ok) throw new Error('update failed');
      const updated = await res.json();
      setIntegrations(prev => prev.map(i => i.id === updated.id ? updated : i));
      toast.success('更新成功');
    } catch (e) {
      console.error(e);
      toast.error('更新失敗');
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4">後台：AI 與整合設定</h3>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="text-sm text-stone-600">AI Provider</label>
          <Input value={settings?.aiProvider || ''} onChange={(e)=>setSettings({...settings, aiProvider: e.target.value})} />
        </div>
        <div>
          <label className="text-sm text-stone-600">Model Name</label>
          <Input value={settings?.modelName || ''} onChange={(e)=>setSettings({...settings, modelName: e.target.value})} />
        </div>
        <div>
          <label className="text-sm text-stone-600">Provider Config (JSON)</label>
          <Input value={JSON.stringify(settings?.config||{})} onChange={(e)=>{
            try { const cfg = JSON.parse(e.target.value); setSettings({...settings, config: cfg}); } catch { /* ignore */ }
          }} />
        </div>

        <div>
          <h4 className="font-medium">整合服務</h4>
          {integrations.map(integration => (
            <div key={integration.id} className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">{integration.provider}</div>
                <div className="text-sm text-stone-500">{integration.enabled ? '已啟用' : '已停用'}</div>
              </div>
              <div>
                <Button size="sm" onClick={()=>toggleIntegration(integration.id, !integration.enabled)}>
                  {integration.enabled ? '停用' : '啟用'}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={saveSettings} disabled={loading}>儲存設定</Button>
        </div>
      </div>
    </div>
  );
}
