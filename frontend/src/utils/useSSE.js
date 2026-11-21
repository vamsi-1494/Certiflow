import { useState, useEffect } from 'react';

export function useSSE(onEventReceived) {
  const [isConnected, setIsConnected] = useState(false);
  const [latestEvent, setLatestEvent] = useState(null);

  useEffect(() => {
    let eventSource = null;

    try {
      eventSource = new EventSource('http://localhost:5000/api/events/stream');

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onerror = () => {
        setIsConnected(false);
      };

      const eventTypes = [
        'CONNECTED',
        'BATCH_STATUS_UPDATED',
        'APPROVAL_RECORDED',
        'QUALITY_REVIEW_COMPLETED',
        'BATCH_APPROVED',
        'BATCH_REJECTED',
        'CERTIFICATES_ISSUED',
        'CERTIFICATE_CANCELLED'
      ];

      eventTypes.forEach((type) => {
        eventSource.addEventListener(type, (e) => {
          try {
            const parsed = JSON.parse(e.data);
            setLatestEvent(parsed);
            if (onEventReceived) {
              onEventReceived(parsed);
            }
          } catch (err) {
            console.warn('[SSE] Failed to parse event payload:', err);
          }
        });
      });
    } catch (err) {
      console.warn('[SSE] EventSource initialization failed:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  return { isConnected, latestEvent };
}
