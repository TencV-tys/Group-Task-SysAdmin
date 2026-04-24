// hooks/useAdminGroups.ts - SIMPLIFIED WORKING VERSION
import { useState, useCallback, useRef, useEffect } from 'react';
import { AdminGroupsService } from '../services/admin.groups.service';
import { adminSocket } from '../services/adminSocket';
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

  const isMountedRef = useRef(true);
  const initialLoadDoneRef = useRef(false);
  const currentFiltersRef = useRef<GroupFilters>({});

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
    if (!isMountedRef.current) return;
    
    if (filters) {
      currentFiltersRef.current = filters;
    }
    
    console.log('📤 [useAdminGroups] fetchGroups called');
    setLoading(true);
    setError(null);
    
    try {
      const result = await AdminGroupsService.getGroupsWithAnalysis(filters);
      
      if (isMountedRef.current && result.success) {
        setGroups(result.groups || []);
        if (result.pagination) {
          setPagination({
            total: result.pagination.total || 0,
            page: filters?.page || 1,
            limit: filters?.limit || 20,
            pages: result.pagination.pages || 1,
            hasMore: result.pagination.hasMore || false
          });
        }
      } else if (isMountedRef.current) {
        setError(result.message || 'Failed to load groups');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // ===== FETCH STATISTICS =====
  const fetchStats = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      const result = await AdminGroupsService.getGroupStatistics();
      if (isMountedRef.current && result.success && result.statistics) {
        setStats(result.statistics);
      }
    } catch (err) {
      console.error('❌ [useAdminGroups] Exception in fetchStats:', err);
    }
  }, []);

  // ===== ANALYZE GROUP =====
  const analyzeGroup = useCallback(async (groupId: string): Promise<ReportAnalysisResponse> => {
    try {
      return await AdminGroupsService.analyzeGroupReports(groupId);
    } catch (err) {
      console.error('❌ [useAdminGroups] Exception in analyzeGroup:', err);
      return { success: false, message: 'Failed to analyze group' };
    }
  }, []);

  // ===== APPLY ACTION =====
  const applyAction = useCallback(async (groupId: string, action: ActionType, reason?: string): Promise<ApplyActionResult> => {
    setActionLoading(true);
    try {
      const result = await AdminGroupsService.applyAction(groupId, action, reason);
      return result;
    } catch (err) {
      console.error('❌ [useAdminGroups] Exception in applyAction:', err);
      return { success: false, message: 'Failed to apply action' };
    } finally {
      setActionLoading(false);
    }
  }, []);

  // ===== DELETE GROUP =====
  const deleteGroup = useCallback(async (groupId: string, hardDelete?: boolean): Promise<DeleteGroupResponse> => {
    setActionLoading(true);
    try {
      const result = await AdminGroupsService.deleteGroup(groupId, { hardDelete });
      return result;
    } catch (err) {
      console.error('❌ [useAdminGroups] Exception in deleteGroup:', err);
      return { success: false, message: 'Failed to delete group' };
    } finally {
      setActionLoading(false);
    }
  }, []);

  // ===== GET GROUP BY ID =====
  const getGroupById = useCallback(async (groupId: string): Promise<GroupResponse> => {
    try {
      return await AdminGroupsService.getGroupById(groupId);
    } catch (err) {
      console.error('❌ [useAdminGroups] Exception in getGroupById:', err);
      return { success: false, message: 'Failed to fetch group' };
    }
  }, []);

  // ===== INITIAL LOAD - ONLY ONCE (disable lint rule) =====
  useEffect(() => {
    if (!initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
      console.log('🚀 [useAdminGroups] Initial load starting');
      fetchGroups({ page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' });
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array - intentionally only run once

  // ===== SOCKET LISTENERS - ONLY ONCE (disable lint rule) =====
  useEffect(() => {
    console.log('🎧 [useAdminGroups] Setting up socket listeners');
    
    const handleRefresh = () => {
      console.log('📢 [useAdminGroups] Socket event - refreshing data');
      if (isMountedRef.current) {
        fetchGroups(currentFiltersRef.current);
        fetchStats();
      }
    };
    
    adminSocket.on('group:report_count_updated', handleRefresh);
    adminSocket.on('group:suspended', handleRefresh);
    adminSocket.on('group:deleted', handleRefresh);
    adminSocket.on('group:restored', handleRefresh);
    adminSocket.on('group:admin_action', handleRefresh);
    
    return () => {
      console.log('🔇 [useAdminGroups] Removing socket listeners');
      adminSocket.off('group:report_count_updated', handleRefresh);
      adminSocket.off('group:suspended', handleRefresh);
      adminSocket.off('group:deleted', handleRefresh);
      adminSocket.off('group:restored', handleRefresh);
      adminSocket.off('group:admin_action', handleRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array - intentionally only run once

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