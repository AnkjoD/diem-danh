import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { StudentData } from '@/common/interfaces/student';

const SOCKET_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';

export const useAttendanceSocket = (sessionId: string | null) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [lastUpdate, setLastUpdate] = useState<{ students: StudentData[]; message: string } | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const s = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    s.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    s.on('attendance_updated', (data: { sessionId: string; students: StudentData[]; message: string }) => {
      console.log('Attendance update received:', data);
      
      // Chỉ cập nhật nếu cùng sessionId (hoặc nếu là Dashboard tổng quát)
      if (!sessionId || data.sessionId === sessionId) {
        setLastUpdate({ students: data.students, message: data.message });
        
        // Invalidate cache để TanStack Query tự động gọi lại API lấy danh sách mới
        queryClient.invalidateQueries({ queryKey: ['today_session'] });
        queryClient.invalidateQueries({ queryKey: ['sessions'] });
      }
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [sessionId, queryClient]);

  const clearLastUpdate = () => setLastUpdate(null);

  return { socket, lastUpdate, clearLastUpdate };
};
