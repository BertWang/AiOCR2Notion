'use client';

import React, { useEffect, useRef, useState } from 'react';
import { NotesGraph } from '@/lib/note-correlation';

interface KnowledgeGraphProps {
  graph: NotesGraph;
  onNodeClick?: (nodeId: string) => void;
}

/**
 * 知識圖譜可視化組件
 * 使用 Canvas 繪製互動式筆記關聯圖
 */
export function KnowledgeGraphVisualizer({ graph, onNodeClick }: KnowledgeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || graph.nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 響應式 Canvas 大小
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // 力導向圖佈局（簡化版）
    const nodePositions = new Map<string, { x: number; y: number }>();
    
    // 初始化節點位置（圓形分佈）
    const angle = (2 * Math.PI) / graph.nodes.length;
    const radius = Math.min(canvas.width, canvas.height) / 3;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    graph.nodes.forEach((node, index) => {
      const x = centerX + radius * Math.cos(index * angle);
      const y = centerY + radius * Math.sin(index * angle);
      nodePositions.set(node.id, { x, y });
    });

    // 繪製函數
    const draw = () => {
      ctx.fillStyle = '#fafaf8';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 繪製邊
      graph.edges.forEach(edge => {
        const sourcePos = nodePositions.get(edge.source);
        const targetPos = nodePositions.get(edge.target);
        
        if (!sourcePos || !targetPos) return;

        ctx.strokeStyle = `rgba(120, 113, 108, ${0.2 + edge.weight * 0.6})`;
        ctx.lineWidth = 1 + edge.weight * 2;
        ctx.beginPath();
        ctx.moveTo(sourcePos.x, sourcePos.y);
        ctx.lineTo(targetPos.x, targetPos.y);
        ctx.stroke();
      });

      // 繪製節點
      graph.nodes.forEach(node => {
        const pos = nodePositions.get(node.id);
        if (!pos) return;

        const isHovered = hoveredNode === node.id;
        const isSelected = selectedNode === node.id;
        const radius = isHovered || isSelected ? 16 : 12;

        // 節點背景
        ctx.fillStyle = isSelected ? '#78716c' : isHovered ? '#a8a29e' : '#d6d3d1';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
        ctx.fill();

        // 節點邊框
        ctx.strokeStyle = isSelected ? '#292524' : '#78716c';
        ctx.lineWidth = isSelected ? 3 : 1;
        ctx.stroke();

        // 節點文字
        ctx.fillStyle = '#1c1917';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.title.substring(0, 3), pos.x, pos.y);
      });
    };

    // 滑鼠事件處理
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      let hovered: string | null = null;
      for (const [nodeId, pos] of nodePositions) {
        const dist = Math.sqrt((pos.x - x) ** 2 + (pos.y - y) ** 2);
        if (dist <= 16) {
          hovered = nodeId;
          break;
        }
      }
      setHoveredNode(hovered);
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      for (const [nodeId, pos] of nodePositions) {
        const dist = Math.sqrt((pos.x - x) ** 2 + (pos.y - y) ** 2);
        if (dist <= 16) {
          setSelectedNode(nodeId);
          onNodeClick?.(nodeId);
          break;
        }
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    draw();

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
    };
  }, [graph, hoveredNode, selectedNode, onNodeClick]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-stone-200 overflow-hidden">
      <div className="p-4 border-b border-stone-200 bg-stone-50">
        <h3 className="text-sm font-semibold text-stone-700">知識圖譜</h3>
        <p className="text-xs text-stone-500">
          {graph.nodes.length} 個筆記, {graph.edges.length} 個連接
        </p>
      </div>
      <canvas
        ref={canvasRef}
        className="flex-1 cursor-pointer hover:bg-stone-50/50 transition-colors"
      />
      <div className="p-3 border-t border-stone-200 bg-stone-50 text-xs text-stone-600">
        <p>💡 懸停查看筆記，點擊選擇</p>
      </div>
    </div>
  );
}
