import React from 'react';
import { Enneagram } from '@/lib/supabase';
import { Label } from '@/components/ui/label';

const ENNEA_CONFIG: Array<{ key: keyof Enneagram; title: string; description: string }> = [
  { key: 'e1', title: '1 號 完美型', description: '守規、完備、給出清晰步驟' },
  { key: 'e2', title: '2 號 助人型', description: '關懷、主動詢問對方感受' },
  { key: 'e3', title: '3 號 成就型', description: '效率、結果導向、總結要點' },
  { key: 'e4', title: '4 號 自我型', description: '共鳴情緒、允許停頓與感受' },
  { key: 'e5', title: '5 號 理智型', description: '理性、引用知識、條列化' },
  { key: 'e6', title: '6 號 忠誠型', description: '風險評估、給出備案' },
  { key: 'e7', title: '7 號 樂觀型', description: '樂觀、提供選項、鼓勵探索' },
  { key: 'e8', title: '8 號 領導型', description: '果敢、立場明確、保護對方' },
  { key: 'e9', title: '9 號 和平型', description: '調和、緩和衝突、尋找共識' }
];

interface EnneagramPanelProps {
  value: Enneagram;
  locked?: boolean;
  onChange?: (value: Enneagram) => void;
}

export default function EnneagramPanel({ value, locked = false, onChange }: EnneagramPanelProps) {
  const handleChange = (key: keyof Enneagram, next: number) => {
    if (locked || !onChange) return;
    onChange({ ...value, [key]: next });
  };

  return (
    <div className="space-y-6">
      {ENNEA_CONFIG.map((item) => (
        <div
          key={item.key}
          className="bg-white/70 dark:bg-gray-900/40 border border-gray-200/70 dark:border-gray-700/60 rounded-xl p-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {item.title}
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.description}</p>
            </div>
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {value[item.key]}
            </div>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={value[item.key]}
            onChange={(event) => handleChange(item.key, Number(event.target.value))}
            disabled={locked}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
          {locked && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              人格定盤已鎖定，如需調整請洽官方支援。
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
