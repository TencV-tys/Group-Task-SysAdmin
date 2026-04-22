// hooks/useAdminGroups.ts - FIXED with proper socket listener

import { useState, useCallback, useRef, useEffect } from 'react';
import { AdminGroupsService } from '../services/admin.groups.service';
import { adminSocket } from '../services/adminSocket'; // ✅ ADD THIS IMPORT
import type { 
  Group, 
  GroupFilters, 
  GroupResponse,
  ActionType,
  GroupStatisticsResponse,
  ReportAnalysisResponse,
  ApplyActionResult,
  DeleteGroupResponse
} from '../services/admin.groups.service';

export function useAdminGroups() {
  console.log('🏭 [useAdminGroups] Hook initializing');
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false); 
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<GroupStatisticsResponse['statistics'] | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
    hasMore: false
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<GroupFilters>({}); // ✅ ADD currentFilters state

  const isMountedRef = useRef(true);
  const fetchCountRef = useRef(0);
  const statsFetchedRef = useRef(false);

  useEffect(() => {
    console.log('🟢 [useAdminGroups] Hook mounted');
    isMountedRef.current = true;
    return () => {
      console.log('🔴 [useAdminGroups] Hook unmounted');
      isMountedRef.current = false;
    };
  }, []);

  // ===== FETCH GROUPS =====
  const fetchGroups = useCallback(async (filters?: GroupFilters) => {
    const fetchId = ++fetchCountRef.current;
    console.log(`📤 [useAdminGroups:${fetchId}] fetchGroups called with filters:`, filters);
    
    // Update currentFilters when fetchGroups is called
    if (filters) {
      setCurrentFilters(filters);
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await AdminGroupsService.getGroupsWithAnalysis(filters);
      console.log(`📦 [useAdminGroups:${fetchId}] getGroupsWithAnalysis response:`, {
        success: result.success,
        groupsCount: result.groups?.length,
        pagination: result.pagination,
        message: result.message
      });
      
      if (result.success) {
        setGroups(result.groups || []);
        setPagination(prev => ({
          total: result.pagination?.total || 0,
          page: filters?.page || prev.page,
          limit: filters?.limit || prev.limit,
          pages: result.pagination?.pages || 1,
          hasMore: result.pagination?.hasMore || false
        }));
        console.log(`✅ [useAdminGroups:${fetchId}] Groups updated:`, {
          count: result.groups?.length,
          total: result.pagination?.total
        });
        return { success: true, data: result };
      } else {
        console.error(`❌ [useAdminGroups:${fetchId}] Failed to fetch groups:`, result.message);
        setError(result.message || 'Failed to load groups');
        return { success: false, message: result.message };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      console.error(`❌ [useAdminGroups:${fetchId}] Exception in fetchGroups:`, errorMessage, err);
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
      console.log(`🏁 [useAdminGroups:${fetchId}] fetchGroups completed, loading set to false`);
    }
  }, []);

  // ===== FETCH STATISTICS =====
  const fetchStats = useCallback(async () => {
    console.log('📊 [useAdminGroups] fetchStats called');
    
    if (statsFetchedRef.current) {
      console.log('⏭️ [useAdminGroups] fetchStats skipped - already fetched once');
      return { success: true, data: stats };
    }
    
    try {
      const result = await AdminGroupsService.getGroupStatistics();
      console.log('📦 [useAdminGroups] getGroupStatistics response:', {
        success: result.success,
        hasStats: !!result.statistics,
        overview: result.statistics?.overview,
        message: result.message
      });
      
      if (result.success && result.statistics) {
        setStats(result.statistics);
        statsFetchedRef.current = true;
        console.log('✅ [useAdminGroups] Statistics updated:', result.statistics.overview);
      } else {
        console.error('❌ [useAdminGroups] Failed to fetch stats:', result.message);
      }
      return result;
    } catch (err) {
      console.error('❌ [useAdminGroups] Exception in fetchStats:', err);
      return { success: false, message: 'Failed to fetch stats' };
    }
  }, [stats]);

  // ===== ANALYZE GROUP =====
  const analyzeGroup = useCallback(async (groupId: string): Promise<ReportAnalysisResponse> => {
    console.log('🔍 [useAdminGroups] analyzeGroup called for group:', groupId);
    
    try {
      const result = await AdminGroupsService.analyzeGroupReports(groupId);
      console.log('📦 [useAdminGroups] analyzeGroupReports response:', {
        success: result.success,
        hasAnalysis: !!result.analysis,
        reportCount: result.analysis?.reportCount,
        actions: result.analysis?.availableActions?.map(a => a.action),
        message: result.message
      });
      return result;
    } catch (err) {
      console.error('❌ [useAdminGroups] Exception in analyzeGroup:', err);
      return { success: false, message: 'Failed to analyze group' };
    }
  }, []);

  // ===== APPLY ACTION =====
  const applyAction = useCallback(async (groupId: string, action: ActionType, reason?: string): Promise<ApplyActionResult> => {
    console.log(`🎬 [useAdminGroups] applyAction called:`, { groupId, action, reason });
    setActionLoading(true);
    
    try {
      const result = await AdminGroupsService.applyAction(groupId, action, reason);
      console.log(`📦 [useAdminGroups] applyAction response for ${action}:`, {
        success: result.success,
        message: result.message,
        data: result.data
      });
      
      if (result.success) {
        console.log(`✅ [useAdminGroups] Action ${action} applied successfully`);
        // Refresh groups and stats after action
        await fetchGroups(currentFilters);
        await fetchStats();
      } else {
        console.error(`❌ [useAdminGroups] Action ${action} failed:`, result.message);
      }
      return result;
    } catch (err) {
      console.error(`❌ [useAdminGroups] Exception in applyAction (${action}):`, err);
      return { success: false, message: 'Failed to apply action' };
    } finally {
      setActionLoading(false);
      console.log(`🏁 [useAdminGroups] actionLoading set to false for ${action}`);
    }
  }, [fetchGroups, fetchStats, currentFilters]); 

  // ===== DELETE GROUP =====
  const deleteGroup = useCallback(async (groupId: string, hardDelete?: boolean): Promise<DeleteGroupResponse> => {
    const mode = hardDelete ? 'HARD DELETE' : 'SOFT DELETE';
    console.log(`🗑️ [useAdminGroups] deleteGroup called:`, { groupId, mode });
    
    setActionLoading(true);
    try {
      const result = await AdminGroupsService.deleteGroup(groupId, { hardDelete });
      console.log(`📦 [useAdminGroups] deleteGroup response (${mode}):`, {
        success: result.success,
        message: result.message
      });
      
      if (result.success) {
        console.log(`✅ [useAdminGroups] ${mode} successful`);
        // Refresh groups and stats after delete
        await fetchGroups(currentFilters);
        await fetchStats();
      } else {
        console.error(`❌ [useAdminGroups] ${mode} failed:`, result.message);
      }
      return result;
    } catch (err) {
      console.error(`❌ [useAdminGroups] Exception in deleteGroup (${mode}):`, err);
      return { success: false, message: 'Failed to delete group' };
    } finally {
      setActionLoading(false);
      console.log(`🏁 [useAdminGroups] actionLoading set to false for delete`);
    }
  }, [fetchGroups, fetchStats, currentFilters]);

  // ===== GET GROUP BY ID =====
  const getGroupById = useCallback(async (groupId: string): Promise<GroupResponse> => {
    console.log('🔎 [useAdminGroups] getGroupById called for group:', groupId);
    
    try {
      const result = await AdminGroupsService.getGroupById(groupId);
      console.log('📦 [useAdminGroups] getGroupById response:', {
        success: result.success,
        hasGroup: 'group' in result ? !!result.group : false,
        groupName: 'group' in result ? result.group?.name : undefined,
        message: result.message
      });
      return result;
    } catch (err) {
      console.error('❌ [useAdminGroups] Exception in getGroupById:', err);
      return { 
        success: false, 
        message: 'Failed to fetch group' 
      };
    }
  }, []);

  // ===== REAL-TIME SOCKET LISTENER FOR GROUP REPORT COUNT UPDATES =====
  useEffect(() => {
    const handleGroupReportCountUpdated = () => {
      console.log('📢 Real-time: Group report count updated, refreshing groups...');
      // Refresh groups to get updated report counts
      if (isMountedRef.current) {
        fetchGroups(currentFilters);
        fetchStats();
      }
    };
    
    // Register the socket listener
    adminSocket.on('group:report_count_updated', handleGroupReportCountUpdated);
    
    return () => {
      adminSocket.off('group:report_count_updated', handleGroupReportCountUpdated);
    };
  }, [fetchGroups, fetchStats, currentFilters]);

  // ===== OTHER SOCKET LISTENERS FOR GROUP ACTIONS =====
  useEffect(() => {
    const handleGroupSuspended = () => {
      console.log('📢 Real-time: Group suspended, refreshing...');
      if (isMountedRef.current) {
        fetchGroups(currentFilters);
        fetchStats();
      }
    };
    
    const handleGroupDeleted = () => {
      console.log('📢 Real-time: Group deleted, refreshing...');
      if (isMountedRef.current) {
        fetchGroups(currentFilters);
        fetchStats();
      }
    };
    
    const handleGroupRestored = () => {
      console.log('📢 Real-time: Group restored, refreshing...');
      if (isMountedRef.current) {
        fetchGroups(currentFilters);
        fetchStats();
      }
    };
    
    const handleGroupAdminAction = () => {
      console.log('📢 Real-time: Group admin action, refreshing...');
      if (isMountedRef.current) {
        fetchGroups(currentFilters);
        fetchStats();
      }
    };
    
    adminSocket.on('group:suspended', handleGroupSuspended);
    adminSocket.on('group:deleted', handleGroupDeleted);
    adminSocket.on('group:restored', handleGroupRestored);
    adminSocket.on('group:admin_action', handleGroupAdminAction);
    
    return () => {
      adminSocket.off('group:suspended', handleGroupSuspended);
      adminSocket.off('group:deleted', handleGroupDeleted);
      adminSocket.off('group:restored', handleGroupRestored);
      adminSocket.off('group:admin_action', handleGroupAdminAction);
    };
  }, [fetchGroups, fetchStats, currentFilters]);

  console.log('📊 [useAdminGroups] Current state:', {
    groupsCount: groups.length,
    loading,
    hasError: !!error,
    hasStats: !!stats,
    pagination,
    actionLoading
  });

  return {
    groups,
    loading,
    error,
    stats, 
    pagination,
    actionLoading,
    fetchGroups,
    fetchStats,
    analyzeGroup,
    applyAction,
    deleteGroup,
    getGroupById,
  };
}