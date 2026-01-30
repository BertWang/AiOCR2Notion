"use client";

import { Home, Search, Settings, PlusCircle, BookOpen, Layers } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { CollectionTree } from "@/components/collection-tree"
import { useRouter, usePathname } from "next/navigation"
import { useState } from "react"

// Menu items.
const items = [
  {
    id: "home",
    title: "儀表板", // 更改為儀表板以區分
    url: "/",
    icon: Home,
  },
  {
    id: "all-notes",
    title: "所有筆記",
    url: "/notes",
    icon: Layers,
  },
  {
    id: "search",
    title: "搜尋",
    url: "/search",
    icon: Search,
  },
]

const settingsItems = [
    {
        id: "settings",
        title: "設定",
        url: "/settings",
        icon: Settings,
    }
]

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  const handleCollectionSelect = (collection: any) => {
    if (collection === null) {
      // 顯示所有筆記
      router.push('/notes');
      setSelectedCollection(null);
    } else {
      // 顯示特定資料夾的筆記
      router.push(`/notes?collection=${collection.id}`);
      setSelectedCollection(collection.id);
    }
  };

  return (
    <Sidebar className="border-r border-stone-200 bg-stone-50/50 backdrop-blur-sm">
      <SidebarHeader className="p-4 border-b border-stone-100">
        <h1 className="text-xl font-serif font-bold text-stone-800 tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-stone-700" />
            <span>Moltbot</span>
            <span className="text-[10px] uppercase tracking-wider bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded-full font-sans font-medium">Beta</span>
        </h1>
        <p className="text-xs text-stone-500 font-sans pl-8">智慧筆記歸檔系統</p>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 flex flex-col gap-4 overflow-hidden">
        <SidebarGroup className="shrink-0">
          <SidebarGroupLabel className="text-stone-400 text-xs uppercase tracking-widest font-medium mb-2 px-2">Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="hover:bg-stone-200/60 active:bg-stone-200 text-stone-600 hover:text-stone-900 transition-all duration-200 ease-in-out">
                    <a href={item.url} className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                      <span className="font-medium tracking-wide text-sm">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Collection Tree */}
        <div className="flex-1 min-h-0 border-t border-stone-200 pt-2 overflow-hidden">
          <CollectionTree 
            selectedId={selectedCollection}
            onSelect={handleCollectionSelect}
            onRefresh={() => {
              // 可選：刷新筆記列表
              if (pathname === '/notes') {
                router.refresh();
              }
            }}
          />
        </div>

        <SidebarGroup className="shrink-0 border-t border-stone-200 pt-2 mt-2">
          <SidebarGroupLabel className="text-stone-400 text-xs uppercase tracking-widest font-medium mb-2 px-2">System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="hover:bg-stone-200/60 text-stone-600 hover:text-stone-900 transition-all duration-200">
                    <a href={item.url} className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 opacity-70" />
                      <span className="font-medium tracking-wide text-sm">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-stone-100">
        <p className="text-[10px] text-stone-400 text-center">
          © 2025 Moltbot AI
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
