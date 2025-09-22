import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Commitment } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  Edit3, 
  Trash2,
  Plus,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

export default function CommitmentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('scheduled');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCommitments();
  }, [user]);

  const loadCommitments = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('commitment-engine', {
        body: {
          action: 'list',
          status: 'all',
          limit: 100
        }
      });
      
      if (error) {
        throw new Error(error.message || '無法加載承諾清單');
      }
      
      if (data?.data?.commitments) {
        setCommitments(data.data.commitments);
      }
    } catch (error: any) {
      console.error('Error loading commitments:', error);
      toast.error(error.message || '加載承諾清單失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCommitments();
    setRefreshing(false);
    toast.success('清單已更新');
  };

  const updateCommitmentStatus = async (commitmentId: string, newStatus: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('commitment-engine', {
        body: {
          action: 'update',
          commitment_id: commitmentId,
          status: newStatus,
          updated_at: new Date().toISOString()
        }
      });
      
      if (error) {
        throw new Error(error.message || '更新失敗');
      }
      
      // Update local state
      setCommitments(prev => 
        prev.map(c => c.id === commitmentId ? { ...c, status: newStatus as any } : c)
      );
      
      const statusText = {
        'completed': '完成',
        'cancelled': '取消',
        'scheduled': '重新安排'
      }[newStatus] || '更新';
      
      toast.success(`承諾已${statusText}`);
    } catch (error: any) {
      console.error('Error updating commitment:', error);
      toast.error(error.message || '更新失敗');
    }
  };

  const deleteCommitment = async (commitmentId: string) => {
    if (!confirm('確定要刪除這個承諾嗎？')) {
      return;
    }
    
    try {
      const { error } = await supabase.functions.invoke('commitment-engine', {
        body: {
          action: 'delete',
          commitment_id: commitmentId
        }
      });
      
      if (error) {
        throw new Error(error.message || '刪除失敗');
      }
      
      setCommitments(prev => prev.filter(c => c.id !== commitmentId));
      toast.success('承諾已刪除');
    } catch (error: any) {
      console.error('Error deleting commitment:', error);
      toast.error(error.message || '刪除失敗');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'draft': { color: 'bg-gray-100 text-gray-800', text: '草稿' },
      'scheduled': { color: 'bg-blue-100 text-blue-800', text: '已安排' },
      'completed': { color: 'bg-green-100 text-green-800', text: '已完成' },
      'cancelled': { color: 'bg-red-100 text-red-800', text: '已取消' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <Badge className={`${config.color} border-0`}>
        {config.text}
      </Badge>
    );
  };

  const formatDateTime = (dateTime: string) => {
    try {
      return format(new Date(dateTime), 'MM月dd日 HH:mm', { locale: zhTW });
    } catch {
      return '時間未設定';
    }
  };

  const getIntentTypeIcon = (intentType: string) => {
    switch (intentType) {
      case 'reminder':
        return <AlertCircle className="w-4 h-4" />;
      case 'scheduled':
        return <Calendar className="w-4 h-4" />;
      case 'recurring':
        return <RefreshCw className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const filteredCommitments = commitments.filter(c => {
    switch (activeTab) {
      case 'scheduled':
        return c.status === 'scheduled' || c.status === 'draft';
      case 'completed':
        return c.status === 'completed';
      case 'cancelled':
        return c.status === 'cancelled';
      default:
        return true;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-safe">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/chat')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                承諾清單
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mark-1 承諾引擎
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            重新整理
          </Button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scheduled">待觸發 ({commitments.filter(c => c.status === 'scheduled' || c.status === 'draft').length})</TabsTrigger>
            <TabsTrigger value="completed">已完成 ({commitments.filter(c => c.status === 'completed').length})</TabsTrigger>
            <TabsTrigger value="cancelled">已取消 ({commitments.filter(c => c.status === 'cancelled').length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">加載中...</p>
              </div>
            ) : filteredCommitments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  沒有承諾記錄
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  在聊天中設定提醒或任務，就會出現在這裡
                </p>
                <Button 
                  onClick={() => navigate('/chat')}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  開始聊天
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCommitments.map((commitment) => (
                  <Card key={commitment.id} className="border border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="text-blue-500 mt-1">
                            {getIntentTypeIcon(commitment.intent_type)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {commitment.title}
                            </h3>
                            {commitment.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {commitment.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-2 mt-2">
                              {getStatusBadge(commitment.status)}
                              {commitment.priority > 1 && (
                                <Badge variant="outline" className="text-orange-600 border-orange-300">
                                  優先級 {commitment.priority}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      {/* Time and Action */}
                      <div className="space-y-3">
                        {commitment.when_time && (
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Clock className="w-4 h-4 mr-2" />
                            {formatDateTime(commitment.when_time)}
                            {commitment.when_rrule && (
                              <span className="ml-2 text-blue-600">(重複)</span>
                            )}
                          </div>
                        )}
                        
                        {commitment.what_action && (
                          <div className="text-sm">
                            <span className="font-medium text-gray-900 dark:text-white">行動：</span>
                            <span className="text-gray-600 dark:text-gray-400 ml-2">{commitment.what_action}</span>
                          </div>
                        )}
                        
                        {commitment.where_location && (
                          <div className="text-sm">
                            <span className="font-medium text-gray-900 dark:text-white">地點：</span>
                            <span className="text-gray-600 dark:text-gray-400 ml-2">{commitment.where_location}</span>
                          </div>
                        )}
                        
                        {commitment.notes && (
                          <div className="text-sm">
                            <span className="font-medium text-gray-900 dark:text-white">備註：</span>
                            <span className="text-gray-600 dark:text-gray-400 ml-2">{commitment.notes}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div className="text-xs text-gray-400">
                          v{commitment.version} · {format(new Date(commitment.created_at), 'MM/dd HH:mm')}
                        </div>
                        
                        <div className="flex space-x-2">
                          {commitment.status === 'scheduled' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateCommitmentStatus(commitment.id, 'completed')}
                                className="text-green-600 border-green-300 hover:bg-green-50"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                完成
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateCommitmentStatus(commitment.id, 'cancelled')}
                                className="text-red-600 border-red-300 hover:bg-red-50"
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                取消
                              </Button>
                            </>
                          )}
                          
                          {(commitment.status === 'completed' || commitment.status === 'cancelled') && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateCommitmentStatus(commitment.id, 'scheduled')}
                              className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              重新啟動
                            </Button>
                          )}
                          
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => deleteCommitment(commitment.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Help text */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            在聊天中說「提醒我明天早上運動」，就會自動創建承諾
          </p>
        </div>
      </div>
    </div>
  );
}