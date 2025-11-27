
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface ApprovalStatus {
  isAdmin: boolean;
  isApproved: boolean;
  approvalStatus: string;
  loading: boolean;
  userType: string;
}

export const useApprovalStatus = (): ApprovalStatus => {
  const { user } = useAuth();
  const [status, setStatus] = useState<ApprovalStatus>({
    isAdmin: false,
    isApproved: false,
    approvalStatus: 'pending',
    loading: true,
    userType: ''
  });

  useEffect(() => {
    const fetchApprovalStatus = async () => {
      if (!user) {
        setStatus({
          isAdmin: false,
          isApproved: false,
          approvalStatus: 'pending',
          loading: false,
          userType: ''
        });
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin, approval_status, user_type')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching approval status:', error);
          setStatus(prev => ({ ...prev, loading: false }));
          return;
        }

        if (data) {
          setStatus({
            isAdmin: data.is_admin || false,
            isApproved: data.approval_status === 'approved',
            approvalStatus: data.approval_status || 'pending',
            userType: data.user_type || '',
            loading: false
          });
        } else {
          // Profile doesn't exist yet
          setStatus({
            isAdmin: false,
            isApproved: false,
            approvalStatus: 'pending',
            loading: false,
            userType: ''
          });
        }
      } catch (error) {
        console.error('Error fetching approval status:', error);
        setStatus(prev => ({ ...prev, loading: false }));
      }
    };

    fetchApprovalStatus();
  }, [user]);

  return status;
};
