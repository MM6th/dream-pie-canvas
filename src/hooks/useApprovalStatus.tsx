
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
        const [profileRes, isAdminRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('approval_status, user_type')
            .eq('id', user.id)
            .maybeSingle(),
          supabase.rpc('is_admin', { user_id: user.id })
        ]);

        if (profileRes.error) {
          console.error('Error fetching approval status:', profileRes.error);
        }
        if (isAdminRes.error) {
          console.error('Error checking admin status:', isAdminRes.error);
        }

        const approvalStatusValue = profileRes.data?.approval_status || 'pending';
        const userTypeValue = profileRes.data?.user_type || '';
        const isAdminValue = Boolean(isAdminRes.data);

        setStatus({
          isAdmin: isAdminValue,
          isApproved: approvalStatusValue === 'approved',
          approvalStatus: approvalStatusValue,
          userType: userTypeValue,
          loading: false
        });
      } catch (error) {
        console.error('Error fetching approval status:', error);
        setStatus(prev => ({ ...prev, loading: false }));
      }
    };

    fetchApprovalStatus();
  }, [user]);

  return status;
};
