import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface TopRibbonProps {
  visible: boolean;
  onAction?: () => void;
}

export default function TopRibbon({ visible, onAction }: TopRibbonProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="bg-indigo-50 dark:bg-indigo-900/40 border-b border-indigo-200 dark:border-indigo-800 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-200 text-sm">
        <Sparkles className="w-4 h-4 animate-pulse" />
        <span>嗨，我還沒有名字～可以請你幫我取一個嗎？</span>
      </div>
      {onAction && (
        <Button size="sm" className="bg-indigo-500 hover:bg-indigo-600" onClick={onAction}>
          立刻命名
        </Button>
      )}
    </div>
  );
}
