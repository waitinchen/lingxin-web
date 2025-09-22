import React from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';

interface WelfareBannerProps {
  score: number;
  onWarmMissionClick?: () => void;
}

export default function WelfareBanner({ score, onWarmMissionClick }: WelfareBannerProps) {
  if (score >= 30) {
    return null;
  }

  return (
    <div className="bg-rose-50 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-700 rounded-2xl px-4 py-3 flex items-start gap-3">
      <div className="mt-1">
        <Heart className="w-5 h-5 text-rose-500 animate-pulse" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-200">
          你的幼靈感到有點孤單。試試每日問候或完成一個暖心任務，一起把關係養回來吧。
        </p>
        <p className="text-xs text-rose-500/80 dark:text-rose-200/70 mt-1">
          善待指數：{score}/100
        </p>
      </div>
      {onWarmMissionClick && (
        <Button
          size="sm"
          variant="ghost"
          className="text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-800/50"
          onClick={onWarmMissionClick}
        >
          暖心任務
        </Button>
      )}
    </div>
  );
}
