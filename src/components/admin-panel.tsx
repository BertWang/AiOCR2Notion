"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AdminPanel() {
  const [settings, setSettings] = useState<any>(null);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // Structured form state for MCP server and Notion config
  const [mcpCommand, setMcpCommand] = useState('npx');
  const [mcpArgsText, setMcpArgsText] = useState('-y @notionhq/notion-mcp-server');
  const [mcpEnvKeys, setMcpEnvKeys] = useState<string[]>(['OPENAPI_MCP_HEADERS']);
  const [notionClientIdVar, setNotionClientIdVar] = useState('NOTION_CLIENT_ID');
  const [notionClientSecretVar, setNotionClientSecretVar] = useState('NOTION_CLIENT_SECRET');

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

  async function addIntegration(provider: string) {
    try {
      const res = await fetch('/api/integrations', { method: 'POST', body: JSON.stringify({ provider, enabled: false, config: {} }) });
      if (!res.ok) throw new Error('create failed');
      const created = await res.json();
      setIntegrations(prev => [created, ...prev]);
      toast.success('已新增整合：' + provider);
    } catch (e) {
      console.error(e);
      toast.error('新增失敗');
    }
  }

  // Add MCP Server entry via structured form data (no secrets stored here)
  async function addMcpServer(command: string, args: string[], env: Record<string,string>) {
    try {
      const res = await fetch('/api/integrations', { method: 'POST', body: JSON.stringify({ provider: 'mcp-server', enabled: false, config: { command, args, env } }) });
      if (!res.ok) throw new Error('create failed');
      const created = await res.json();
      setIntegrations(prev => [created, ...prev]);
      toast.success('已新增 MCP Server');
    } catch (e) {
      console.error(e);
      toast.error('新增 MCP Server 失敗');
    }
  }

  function addMcpEnvKey() {
    setMcpEnvKeys(prev => [...prev, 'NEW_ENV_VAR']);
  }

  function updateMcpEnvKey(index: number, value: string) {
    setMcpEnvKeys(prev => prev.map((k,i) => i === index ? value : k));
  }

  function removeMcpEnvKey(index: number) {
    setMcpEnvKeys(prev => prev.filter((_,i) => i !== index));
  }

  function validateEnvVarName(name: string) {
    return /^[A-Z0-9_]{3,64}$/.test(name);
  }

  async function submitMcpForm() {
    const args = mcpArgsText.split(/\s+/).filter(Boolean);
    // Validate env keys
    for (const k of mcpEnvKeys) {
      if (!validateEnvVarName(k)) {
        toast.error(`環境變數名稱格式錯誤：${k}（請使用大寫字母/數字/下劃線）`);
        return;
      }
    }

    const envObj: Record<string,string> = {};
    for (const k of mcpEnvKeys) envObj[k] = `__ENV__${k}__`;

    await addMcpServer(mcpCommand, args, envObj);
  }

  async function testWebhook(provider: string) {
    try {
      setLoading(true);
      const endpoint = `/api/webhooks/${provider}`;
      const res = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ test: true, message: `test from admin for ${provider}` }) });
      if (!res.ok) throw new Error('test failed');
      toast.success('Webhook 測試成功');
    } catch (e) {
      console.error(e);
      toast.error('Webhook 測試失敗');
    } finally { setLoading(false); }
  }

  async function connectNotion(integrationId: string) {
    try {
      const res = await fetch(`/api/integrations/notion/connect?integrationId=${integrationId}`);
      // The connect route redirects; in client fetch we will get a redirect response.
      // Prefer direct navigation to the connect endpoint so the browser follows redirect.
      window.location.href = `/api/integrations/notion/connect?integrationId=${integrationId}`;
    } catch (e) {
      console.error(e);
      toast.error('無法啟動 Notion 連線');
    }
  }

  async function disconnectNotion(integrationId: string) {
    try {
      const res = await fetch('/api/integrations', { method: 'PUT', body: JSON.stringify({ id: integrationId, enabled: false, config: {} }) });
      if (!res.ok) throw new Error('disconnect failed');
      const updated = await res.json();
      setIntegrations(prev => prev.map(i => i.id === updated.id ? updated : i));
      toast.success('Notion 已中斷連線');
    } catch (e) {
      console.error(e);
      toast.error('斷線失敗');
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
          <div className="mb-2 flex gap-2">
            <Button size="sm" onClick={()=>addIntegration('notion')}>新增 Notion</Button>
            <Button size="sm" onClick={()=>addIntegration('mcp')}>新增 MCP</Button>
            <Button size="sm" onClick={()=>{
              const exampleCmd = 'npx';
              const exampleArgs = ['-y','@notionhq/notion-mcp-server'];
              const exampleEnv = { OPENAPI_MCP_HEADERS: '{"Authorization": "Bearer <REPLACE_WITH_SECRET>", "Notion-Version": "2022-06-28"}' };
              addMcpServer(exampleCmd, exampleArgs, exampleEnv);
            }}>新增 MCP Server 範例</Button>
          </div>
          {/* Structured MCP form */}
          <div className="p-3 border rounded bg-stone-50">
            <div className="text-sm font-medium mb-2">手動新增 MCP Server（結構化）</div>
            <div className="grid grid-cols-1 gap-2">
              <label className="text-xs">Command</label>
              <Input value={mcpCommand} onChange={(e)=>setMcpCommand(e.target.value)} />
              <label className="text-xs">Args (空白分隔)</label>
              <Input value={mcpArgsText} onChange={(e)=>setMcpArgsText(e.target.value)} />
              <div>
                <div className="text-xs">Env Var Names (只輸入變數名稱，用於在部署環境中注入真實值)</div>
                <div className="flex flex-col gap-1 mt-1">
                  {mcpEnvKeys.map((k, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input value={k} onChange={(e)=>updateMcpEnvKey(idx, e.target.value)} />
                      <Button size="sm" onClick={()=>removeMcpEnvKey(idx)}>移除</Button>
                    </div>
                  ))}
                  <div className="mt-1">
                    <Button size="sm" onClick={addMcpEnvKey}>新增 Env 名稱</Button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={submitMcpForm}>建立 MCP Server</Button>
              </div>
            </div>
          </div>
          {integrations.map(integration => (
            <div key={integration.id} className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">{integration.provider}</div>
                <div className="text-sm text-stone-500">{integration.enabled ? '已啟用' : '已停用'}</div>
              </div>
              <div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={()=>toggleIntegration(integration.id, !integration.enabled)}>
                    {integration.enabled ? '停用' : '啟用'}
                  </Button>
                  <Button size="sm" onClick={()=>testWebhook(integration.provider)}>
                    測試 Webhook
                  </Button>
                  {integration.provider === 'notion' && (
                    integration.config && integration.config.access_token ? (
                      <Button size="sm" onClick={()=>disconnectNotion(integration.id)}>Disconnect</Button>
                    ) : (
                      <Button size="sm" onClick={()=>connectNotion(integration.id)}>Connect Notion</Button>
                    )
                  )}
                </div>
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
