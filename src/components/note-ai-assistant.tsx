"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Loader2, Send, Lightbulb, MessageCircle, AlertCircle, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Suggestion {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export function NoteAIAssistant({ noteId }: { noteId: string }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [activeTab, setActiveTab] = useState("suggestions");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 獲取建議
  const fetchSuggestions = useCallback(async () => {
    setIsLoadingSuggestions(true);
    try {
      const response = await fetch(`/api/notes/${noteId}/ai-suggestions`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }

      const data = await response.json();
      setSuggestions(data.suggestions);
      toast.success("智能建議已生成");
    } catch (error) {
      console.error("Fetch suggestions error:", error);
      toast.error("生成建議失敗");
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [noteId]);

  // 獲取聊天歷史
  const fetchChatHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/notes/${noteId}/ai-chat`);

      if (!response.ok) {
        throw new Error("Failed to fetch chat history");
      }

      const data = await response.json();
      setMessages(data.messages);
    } catch (error) {
      console.error("Fetch chat history error:", error);
    }
  }, [noteId]);

  // 初始化時獲取歷史
  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

  // 自動滾動到最新訊息
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages]);

  // 發送訊息
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue;
    setInputValue("");

    // 樂觀更新 UI
    const tempUserMessage: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setIsLoadingChat(true);

    try {
      const response = await fetch(`/api/notes/${noteId}/ai-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}`;
        const details = errorData.details ? ` (${errorData.details})` : "";
        throw new Error(`Failed to send message: ${errorMessage}${details}`);
      }

      const data = await response.json();

      // 移除臨時訊息，添加真實訊息
      setMessages((prev) =>
        prev.filter((m) => m.id !== tempUserMessage.id).concat([
          {
            ...data.userMessage,
            createdAt: data.userMessage.createdAt,
          },
          {
            ...data.assistantMessage,
            createdAt: data.assistantMessage.createdAt,
          },
        ])
      );
    } catch (error) {
      console.error("Send message error:", error);
      const errorMessage = error instanceof Error ? error.message : "發送訊息失敗";
      toast.error(errorMessage, {
        description: "請檢查網路連接或稍後重試",
      });
      // 移除臨時訊息
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
    } finally {
      setIsLoadingChat(false);
    }
  }, [inputValue, noteId]);

  // 複製訊息到剪貼板
  const handleCopyMessage = useCallback(async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      toast.success("已複製");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error("複製失敗");
    }
  }, []);

  // 格式化時間戳記
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            智能建議
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            與 AI 對話
          </TabsTrigger>
        </TabsList>

        {/* 智能建議 Tab */}
        <TabsContent value="suggestions" className="flex-1 flex flex-col gap-4">
          <Button
            onClick={fetchSuggestions}
            disabled={isLoadingSuggestions}
            className="w-full bg-stone-900 text-white hover:bg-stone-800"
          >
            {isLoadingSuggestions ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                生成建議中...
              </>
            ) : (
              <>
                <Lightbulb className="w-4 h-4 mr-2" />
                生成智能建議
              </>
            )}
          </Button>

          <ScrollArea className="flex-1 border rounded-lg">
            {suggestions.length === 0 ? (
              <div className="p-4 text-center text-sm text-stone-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>點擊上方按鈕生成建議</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="p-3 border border-stone-200 rounded-lg bg-stone-50 hover:bg-stone-100 transition-colors"
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                        {suggestion.category}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          suggestion.priority === "high"
                            ? "bg-red-100 text-red-700"
                            : suggestion.priority === "medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {suggestion.priority}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm text-stone-900 mb-1">
                      {suggestion.title}
                    </h4>
                    <p className="text-xs text-stone-600">
                      {suggestion.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* AI 對話 Tab */}
        <TabsContent value="chat" className="flex-1 flex flex-col gap-3 overflow-hidden">
          <ScrollArea className="flex-1 border border-stone-200 rounded-lg bg-stone-50/30">
            <div className="p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-sm text-stone-500 py-12">
                  <MessageCircle className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">開始與 AI 對話</p>
                  <p className="text-xs mt-1 opacity-75">詢問有關您筆記的任何問題</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}
                  >
                    {/* 用戶訊息 */}
                    {msg.role === "user" && (
                      <div className="flex flex-col items-end gap-1 max-w-xs lg:max-w-md">
                        <div className="bg-blue-500 text-white rounded-2xl rounded-tr-sm px-4 py-2 shadow-sm">
                          <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                        </div>
                        <span className="text-[10px] text-stone-400 px-3">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    {/* AI 回應 */}
                    {msg.role === "assistant" && (
                      <div className="flex flex-col items-start gap-1 max-w-sm lg:max-w-md">
                        <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm group hover:shadow-md transition-shadow">
                          <div className="prose prose-sm max-w-none text-stone-900">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ node, ...props }) => <p className="text-sm leading-relaxed mb-2 last:mb-0" {...props} />,
                                strong: ({ node, ...props }) => <strong className="font-semibold text-stone-900" {...props} />,
                                em: ({ node, ...props }) => <em className="italic text-stone-700" {...props} />,
                                ul: ({ node, ...props }) => <ul className="text-sm list-disc list-inside space-y-1 my-2" {...props} />,
                                ol: ({ node, ...props }) => <ol className="text-sm list-decimal list-inside space-y-1 my-2" {...props} />,
                                li: ({ node, ...props }) => <li className="text-sm leading-relaxed" {...props} />,
                                code: ({ node, inline, ...props }) =>
                                  inline ? (
                                    <code className="bg-stone-100 text-stone-800 px-1.5 py-0.5 rounded text-xs font-mono" {...props} />
                                  ) : (
                                    <code className="bg-stone-100 text-stone-800 p-2 rounded block text-xs font-mono overflow-x-auto my-2" {...props} />
                                  ),
                                blockquote: ({ node, ...props }) => (
                                  <blockquote className="border-l-4 border-stone-300 pl-3 italic text-stone-600 my-2 text-sm" {...props} />
                                ),
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>

                          {/* 複製按鈕 */}
                          <button
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity mt-2 p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-md inline-flex items-center gap-1"
                            title="複製訊息"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-green-500" />
                                <span className="text-[10px] text-green-500">已複製</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="text-[10px]">複製</span>
                              </>
                            )}
                          </button>
                        </div>
                        <span className="text-[10px] text-stone-400 px-3">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* 載入狀態 */}
              {isLoadingChat && (
                <div className="flex justify-start gap-2">
                  <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                    <span className="text-sm text-stone-500">AI 正在思考中...</span>
                  </div>
                </div>
              )}

              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* 輸入區域 */}
          <div className="flex items-end gap-2 bg-white border border-stone-200 rounded-lg p-2 shadow-sm">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !isLoadingChat && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="詢問 AI...（Shift+Enter 換行）"
              disabled={isLoadingChat}
              className="flex-1 text-sm border-0 focus-visible:ring-0 resize-none"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoadingChat}
              size="sm"
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg shrink-0"
            >
              {isLoadingChat ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
