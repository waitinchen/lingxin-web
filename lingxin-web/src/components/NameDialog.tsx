import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface NameDialogProps {
  open: boolean;
  loading?: boolean;
  initialName?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<void> | void;
}

export default function NameDialog({ open, loading = false, initialName = '', onOpenChange, onSubmit }: NameDialogProps) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setName(initialName);
  }, [initialName, open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    await onSubmit(name.trim());
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-indigo-100/60 dark:border-indigo-900/60">
            <div className="flex items-center justify-between px-6 pt-6">
              <Dialog.Title className="text-xl font-semibold text-indigo-600 dark:text-indigo-300">
                請幫我取名字！
              </Dialog.Title>
              <Dialog.Close className="p-1 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/30" aria-label="Close">
                <X className="w-5 h-5 text-gray-500" />
              </Dialog.Close>
            </div>
            <form onSubmit={handleSubmit} className="px-6 pb-6">
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 mb-4">
                想一個你喜歡的名字，讓我成為專屬於你的語氣靈吧。
              </p>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="輸入幼靈的名字"
                disabled={loading}
                className="bg-white/80 dark:bg-gray-800/80"
                maxLength={12}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-2">建議 2-6 個字，讓名字朗朗上口。</p>
              <div className="flex justify-end space-x-3 mt-6">
                <Dialog.Close asChild>
                  <Button type="button" variant="ghost" className="text-gray-500" disabled={loading}>
                    稍後再說
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={loading || !name.trim()} className="bg-indigo-500 hover:bg-indigo-600">
                  {loading ? '命名中…' : '完成命名'}
                </Button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
