import { supabase } from '../supabaseClient';

export const getNotifications = async (filters = {}) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    const {
      page = 1,
      limit = 20,
      unread_only = false
    } = filters;

    // Try legacy schema first (is_read/title/content). Fallback to new (read_at/payload).
    let mapped = [];
    let unreadCount = 0;
    let totalPages = 0;
    try {
      // Legacy first: avoids network 400 spam on projects without read_at
      let query = supabase
        .from('notifications')
        .select('id, user_id, type, title, content, is_read, created_at', { count: 'exact' })
        .eq('user_id', user.id);

      if (unread_only) {
        query = query.eq('is_read', false);
      }

      query = query.order('created_at', { ascending: false });

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data: notificationsLegacy, error: legacyErr, count } = await query;
      if (legacyErr) throw legacyErr;

      const { count: unreadLegacy } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      unreadCount = unreadLegacy || 0;
      mapped = (notificationsLegacy || []).map(n => ({
        id: n.id,
        user_id: n.user_id,
        type: n.type,
        payload: {}, // no payload in legacy
        title: n.title || (n.type === 'comment' ? 'New comment' : n.type === 'item_chat' || n.type === 'post_chat' ? 'New chat' : 'Announcement'),
        content: n.content || '',
        is_read: Boolean(n.is_read),
        created_at: n.created_at
      }));

      totalPages = Math.ceil((count || 0) / limit);
    } catch (eNew) {
      // New schema fallback
      let query = supabase
        .from('notifications')
        .select('id, user_id, type, payload, read_at, created_at', { count: 'exact' })
        .eq('user_id', user.id);

      if (unread_only) {
        query = query.is('read_at', null);
      }

      query = query.order('created_at', { ascending: false });

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data: notifications, error: notificationsError, count } = await query;
      if (notificationsError) throw notificationsError;

      const { count: unread } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null);

      unreadCount = unread || 0;
      mapped = (notifications || []).map(n => ({
        id: n.id,
        user_id: n.user_id,
        type: n.type,
        payload: n.payload || {},
        title: n.payload?.title || (n.type === 'comment' ? 'New comment' : n.type === 'item_chat' || n.type === 'post_chat' ? 'New chat' : 'Announcement'),
        content: n.payload?.content || '',
        is_read: Boolean(n.read_at),
        created_at: n.created_at
      }));

      totalPages = Math.ceil((count || 0) / limit);
    }

    return {
      res_code: 200,
      res_msg: 'Notifications retrieved successfully',
      notifications: mapped,
      unread_count: unreadCount,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_items: totalPages * limit, // approximate
        has_next: page < totalPages
      }
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

export const getUnreadNotificationCount = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    let count = 0;
    try {
      const { count: c1, error: e1 } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null);
      if (e1) throw e1;
      count = c1 || 0;
    } catch (eNew) {
      const { count: c2, error: e2 } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (e2) throw e2;
      count = c2 || 0;
    }


    return {
      res_code: 200,
      res_msg: 'Unread notification count retrieved successfully',
      unread_count: count || 0
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    let updateError = null;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id);
      if (error) throw error;
    } catch (eNew) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);
      updateError = error;
    }

    if (updateError) throw updateError;

    return {
      res_code: 200,
      res_msg: 'Notification marked as read'
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

export const markAllNotificationsAsRead = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    let updateError = null;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null);
      if (error) throw error;
    } catch (eNew) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      updateError = error;
    }

    if (updateError) throw updateError;

    return {
      res_code: 200,
      res_msg: 'All notifications marked as read'
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

export const createNotification = async (notificationData) => {
  try {
    const { user_id, type, title, content, ...rest } = notificationData;

    const { data: newNotification, error: notificationError } = await supabase
      .from('notifications')
      .insert([
        {
          user_id,
          type,
          payload: { title, content, ...rest },
          read_at: null
        }
      ])
      .select()
      .single();

    if (notificationError) throw notificationError;

    return {
      res_code: 201,
      res_msg: 'Notification created',
      notification: newNotification
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};

export const deleteNotification = async (notificationId) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    if (!user) {
      return {
        res_code: 401,
        res_msg: 'Authentication required'
      };
    }

    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    return {
      res_code: 200,
      res_msg: 'Notification deleted'
    };
  } catch (error) {
    return {
      res_code: 400,
      res_msg: error.message,
      error: error
    };
  }
};


