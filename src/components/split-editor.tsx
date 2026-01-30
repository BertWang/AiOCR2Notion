"use client";

import { useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Edit2, ZoomIn, ZoomOut, Save, RefreshCw, X, Plus, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { VersionHistory } from "@/components/version-history";
import { NoteAIAssistant } from "@/components/note-ai-assistant";

interface Note {
  id: string;
  imageUrl: string;
  refinedContent: string | null;
  rawOcrText: string | null;
  summary: string | null;
  tags: string | null;
  status?: string;
}

export function SplitEditor({ note }: { note: Note }) {
  const [content, setContent] = useState(note.refinedContent || "");
  const [zoom, setZoom] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(note.status || "COMPLETED");

  // 標籤管理狀態
  const [editableTags, setEditableTags] = useState<string[]>(note.tags ? note.tags.split(',').filter(Boolean).map(tag => tag.trim()) : []);
  const [newTagInput, setNewTagInput] = useState("");

  const addTag = () => {
    const tagToAdd = newTagInput.trim();
    if (tagToAdd && !editableTags.includes(tagToAdd)) {
      setEditableTags(prev => [...prev, tagToAdd]);
      setNewTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEditableTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
        const response = await fetch(`/api/notes/${note.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                content: content, 
                tags: editableTags.join(',') // 傳送更新後的標籤
            }),
        });

        if (!response.ok) {
            throw new Error('儲存失敗');
        }
        // 建立版本歷史
        try {
          await fetch(`/api/notes/${note.id}/versions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              changeDescription: '手動儲存',
              changeType: 'manual',
            })
          });
        } catch (versionError) {
          console.warn('Version creation failed:', versionError);
        }
        toast.success("變更已儲存");
    } catch(e) {
        console.error("Error saving note:", e);
        toast.error("儲存失敗");
    } finally {
        setIsSaving(false);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    toast.info("正在重新分析筆記...");
    
    try {
        const res = await fetch('/api/retry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ noteId: note.id })
        });
        
        if (!res.ok) throw new Error("Retry failed");
        
        const data = await res.json();
        setContent(data.note.refinedContent);
        setCurrentStatus("COMPLETED");
        toast.success("分析完成！");
        // 重新整理頁面以更新其他資訊 (如 confidence)
        window.location.reload(); 
        
    } catch (e) {
        toast.error("重試失敗，請稍後再試");
        setCurrentStatus("FAILED");
    } finally {
        setIsRetrying(false);
    }
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full w-full">
      {/* Left Panel: Image Viewer */}
      <ResizablePanel defaultSize={45} minSize={25}>
        <div className="h-full flex flex-col bg-stone-100/50">
          <div className="p-2 border-b border-stone-200 flex items-center justify-between bg-white/50">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider px-2">Original Source</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs w-8 text-center">{(zoom * 100).toFixed(0)}%</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(3, z + 0.1))}>
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-stone-200/30">
            <div 
                className="transition-transform duration-200 ease-out origin-center shadow-lg border border-stone-200 bg-white"
                style={{ transform: `scale(${zoom})` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={note.imageUrl} 
                alt="Original Note" 
                className="max-w-full h-auto object-contain block"
                style={{ maxHeight: 'calc(100vh - 120px)' }}
              />
            </div>
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Right Panel: Editor / Preview */}
      <ResizablePanel defaultSize={55} minSize={30}>
        <div className="h-full flex flex-col bg-white">
             {/* Info Bar */}
            <div className="px-4 py-2 border-b border-stone-100 bg-stone-50/30 flex flex-wrap gap-2 items-center min-h-[40px]">
                 {editableTags.map(tag => (
                     <Badge key={tag} variant="secondary" className="group text-[10px] px-2 py-0 h-6 bg-stone-100 text-stone-600 hover:bg-stone-200 border-stone-200 flex items-center gap-1 cursor-default transition-all">
                        #{tag}
                        <span onClick={() => removeTag(tag)} className="hover:text-red-500 hover:bg-red-50 rounded-full p-0.5 cursor-pointer ml-1 inline-flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-2.5 h-2.5" />
                        </span>
                     </Badge>
                 ))}
                 
                 {/* New Tag Input */}
                 <div className="flex items-center gap-1">
                    <Input 
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addTag(); }}
                        placeholder="Add tag..."
                        className="h-6 w-24 text-[11px] px-2 border-stone-200 bg-white focus-visible:ring-1 focus-visible:ring-stone-300"
                    />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={addTag}>
                        <Plus className="w-3.5 h-3.5 text-stone-400" />
                    </Button>
                 </div>

                 {note.summary && (
                     <span className="text-xs text-stone-500 border-l border-stone-200 pl-3 ml-2 italic truncate flex-1">
                        "{note.summary}"
                     </span>
                 )}
            </div>

          <Tabs defaultValue="preview" className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-stone-200 px-2 flex items-center justify-between bg-white">
                <TabsList className="bg-transparent h-10 p-0 gap-1">
                    <TabsTrigger value="preview" className="data-[state=active]:bg-stone-100 data-[state=active]:text-stone-900 data-[state=active]:shadow-none rounded-t-md rounded-b-none border-b-2 border-transparent data-[state=active]:border-stone-400 px-4 py-2 h-10 text-xs font-medium">
                        <Eye className="w-3.5 h-3.5 mr-2" />
                        預覽模式
                    </TabsTrigger>
                    <TabsTrigger value="edit" className="data-[state=active]:bg-stone-100 data-[state=active]:text-stone-900 data-[state=active]:shadow-none rounded-t-md rounded-b-none border-b-2 border-transparent data-[state=active]:border-stone-400 px-4 py-2 h-10 text-xs font-medium">
                        <Edit2 className="w-3.5 h-3.5 mr-2" />
                        編輯 Markdown
                    </TabsTrigger>
                </TabsList>
                
                <Button 
                    size="sm" 
                    onClick={handleSave} 
                    disabled={isSaving}
                    variant="ghost"
                    className="h-7 text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                >
                    {isSaving ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                    儲存
                </Button>

                <VersionHistory noteId={note.id} />
                
                {currentStatus === 'FAILED' && (
                    <Button 
                        size="sm" 
                        onClick={handleRetry} 
                        disabled={isRetrying}
                        className="h-7 text-xs bg-red-500 text-white hover:bg-red-600 ml-2"
                    >
                        {isRetrying ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                        重試分析
                    </Button>
                )}

                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Sparkles className="w-4 h-4" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-96 flex flex-col gap-4 p-6">
                        <SheetHeader>
                            <SheetTitle>AI 助手</SheetTitle>
                            <SheetDescription>從 AI 獲取洞察與建議</SheetDescription>
                        </SheetHeader>

                        <NoteAIAssistant noteId={note.id} />
                    </SheetContent>
                </Sheet>
            </div>

            <div className="flex-1 overflow-hidden relative">
                <TabsContent value="preview" className="h-full m-0 p-0 border-0">
                    <ScrollArea className="h-full w-full">
                        <div className="prose prose-stone prose-sm max-w-none p-8 font-serif prose-img:rounded-lg prose-img:shadow-md prose-img:mx-auto prose-img:max-h-[600px] prose-img:w-auto prose-hr:my-8">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {content}
                            </ReactMarkdown>
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="edit" className="h-full m-0 p-0 border-0">
                     <Textarea 
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full h-full resize-none p-6 font-mono text-sm border-0 focus-visible:ring-0 rounded-none leading-relaxed text-stone-700 bg-stone-50/20"
                        spellCheck={false}
                     />
                </TabsContent>
            </div>
          </Tabs>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
