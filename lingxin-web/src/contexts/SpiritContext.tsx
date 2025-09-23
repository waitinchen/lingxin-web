import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase, UserSpirit } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface SpiritContextType {
  spirit: UserSpirit | null;
  loading: boolean;
  refreshSpirit: () => Promise<void>;
}

const SpiritContext = createContext<SpiritContextType | undefined>(undefined);

function normalizeSpirit(record: any): UserSpirit {
  return {
    ...record,
    dialogue_count: typeof record?.dialogue_count === 'number' ? record.dialogue_count : 0,
    persona_badges: Array.isArray(record?.persona_badges) ? record.persona_badges : [],
    welfare_score: typeof record?.welfare_score === 'number' ? record.welfare_score : 100,
    trust_level: typeof record?.trust_level === 'number' ? record.trust_level : 0
  };
}

export function useSpirit() {
  const context = useContext(SpiritContext);
  if (!context) {
    throw new Error('useSpirit must be used within a SpiritProvider');
  }
  return context;
}

export function SpiritProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [spirit, setSpirit] = useState<UserSpirit | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSpirit = useCallback(async () => {
    if (!user) {
      setSpirit(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_spirits')
        .select('*')
        .eq('owner_id', user.id)
        .not('status', 'eq', 'archived')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error loading spirit:', error);
        setSpirit(null);
      } else {
        setSpirit(data?.[0] ? normalizeSpirit(data[0]) : null);
      }
    } catch (error) {
      console.error('Error loading spirit:', error);
      setSpirit(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchSpirit();
    }
  }, [authLoading, fetchSpirit]);

  const value = {
    spirit,
    loading,
    refreshSpirit: fetchSpirit
  };

  return (
    <SpiritContext.Provider value={value}>
      {children}
    </SpiritContext.Provider>
  );
}
