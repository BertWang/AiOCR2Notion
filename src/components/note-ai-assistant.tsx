"use client";

import { useState, useCallback, useEffect } from "react";
import { Loader2, Send, Lightbulb, MessageCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
        <TabsContent value="chat" className="flex-1 flex flex-col gap-4">
          <ScrollArea className="flex-1 border rounded-lg p-4">
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-sm text-stone-500 py-8">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>開始與 AI 對話</p>
                  <p className="text-xs mt-1">詢問有關您筆記的任何問題</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                        msg.role === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-stone-200 text-stone-900"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {isLoadingChat && (
                <div className="flex justify-start">
                  <div className="bg-stone-200 text-stone-900 px-3 py-2 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex items-center gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !isLoadingChat) {
                  handleSendMessage();
                }
              }}
              placeholder="詢問 AI..."
              disabled={isLoadingChat}
              className="flex-1 text-sm"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoadingChat}
              size="sm"
              className="bg-blue-500 hover:bg-blue-600 text-white"
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
