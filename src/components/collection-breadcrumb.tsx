import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  id: string;
  name: string;
}

interface CollectionBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function CollectionBreadcrumb({ items, className }: CollectionBreadcrumbProps) {
  return (
    <nav className={cn("flex items-center text-sm text-stone-500", className)} aria-label="Breadcrumb">
      <Link 
        href="/notes" 
        className="flex items-center hover:text-stone-900 transition-colors"
      >
        <Home className="w-4 h-4" />
        <span className="sr-only">Home</span>
      </Link>
      
      {items.map((item, index) => (
        <div key={item.id} className="flex items-center">
          <ChevronRight className="w-4 h-4 mx-1 text-stone-400" />
          {index === items.length - 1 ? (
            <span className="font-medium text-stone-900 truncate max-w-[200px]">
              {item.name}
            </span>
          ) : (
            <Link 
              href={`/notes?collection=${item.id}`}
              className="hover:text-stone-900 transition-colors truncate max-w-[150px]"
            >
              {item.name}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
