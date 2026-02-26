import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

/**
 * usePresence Hook
 * Item 244: Active Member Avatars
 */
export function usePresence(api, householdId, user) {
  const [activeMembers, setActiveMembers] = useState([]);

  useEffect(() => {
    if (!householdId || !user) return;

    const socket = io(window.location.origin, {
      query: {
        householdId,
        userId: user.id,
        firstName: user.firstName,
        avatar: user.avatar || '👤',
      },
    });

    socket.on('presence_update', (members) => {
      setActiveMembers(members);
    });

    return () => {
      socket.disconnect();
    };
  }, [householdId, user]);

  return activeMembers;
}
