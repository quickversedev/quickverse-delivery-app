import { useCallback, useEffect, useRef, useState } from 'react';
import poolService from '../services/pool.service';
import websocketService from '../services/websocket.service';
import type { PoolOrder, PoolWebSocketEvent } from '../types/pool.types';

interface UsePoolOrdersResult {
  orders: PoolOrder[];
  loading: boolean;
  claiming: string | null;       // poolId currently being claimed
  claimOrder: (poolId: string, partnerId: string) => Promise<'success' | 'taken' | 'expired' | 'error'>;
  refresh: () => Promise<void>;
}

export default function usePoolOrders(isOnline: boolean): UsePoolOrdersResult {
  const [orders, setOrders] = useState<PoolOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await poolService.getOpenPoolOrders();
      setOrders(data);
    } catch (e) {
      console.warn('[usePoolOrders] fetch failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle incoming WebSocket pool events
  const handlePoolEvent = useCallback((event: PoolWebSocketEvent) => {
    if (event.type === 'ORDER_ADDED' && event.poolEntry) {
      setOrders(prev => {
        const exists = prev.some(o => o.poolId === event.poolEntry!.poolId);
        if (exists) return prev;
        return [event.poolEntry!, ...prev];
      });
    } else if (
      event.type === 'ORDER_CLAIMED' ||
      event.type === 'ORDER_EXPIRED'
    ) {
      setOrders(prev => prev.filter(o => o.poolId !== event.poolId));
    }
  }, []);

  // Subscribe to pool WebSocket when online
  useEffect(() => {
    if (!isOnline) {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      return;
    }

    fetch();

    // Wait briefly for WS connection to be ready before subscribing
    const timer = setTimeout(() => {
      unsubscribeRef.current = websocketService.subscribeToPool(handlePoolEvent);
    }, 500);

    return () => {
      clearTimeout(timer);
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [isOnline, fetch, handlePoolEvent]);

  const claimOrder = useCallback(
    async (
      poolId: string,
      partnerId: string,
    ): Promise<'success' | 'taken' | 'expired' | 'error'> => {
      setClaiming(poolId);
      try {
        await poolService.claimOrder(poolId, partnerId);
        setOrders(prev => prev.filter(o => o.poolId !== poolId));
        return 'success';
      } catch (err: any) {
        const code = err?.code ?? '';
        if (code === '1074') return 'taken';
        if (code === '1075') return 'expired';
        return 'error';
      } finally {
        setClaiming(null);
      }
    },
    [],
  );

  return { orders, loading, claiming, claimOrder, refresh: fetch };
}
