import { Response } from 'express';

export interface SSEPayload {
  event: string;
  data: any;
  timestamp: string;
}

export class SSEManager {
  private static clients: Set<Response> = new Set();
  private static keepAliveTimer: NodeJS.Timeout | null = null;

  /**
   * Registers a new HTTP Response as a long-lived SSE stream.
   */
  public static addClient(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders?.();

    this.clients.add(res);

    // Initial handshake packet
    const handshake: SSEPayload = {
      event: 'CONNECTED',
      data: {
        message: 'Pragati Skills Mission Real-Time SSE Stream Connected',
        connectedClients: this.clients.size
      },
      timestamp: new Date().toISOString()
    };
    res.write(`event: CONNECTED\ndata: ${JSON.stringify(handshake)}\n\n`);

    // Clean up when client disconnects
    res.on('close', () => {
      this.clients.delete(res);
    });

    // Start 25s ping keep-alive timer if not active
    if (!this.keepAliveTimer) {
      this.keepAliveTimer = setInterval(() => {
        for (const client of this.clients) {
          try {
            client.write(': keep-alive ping\n\n');
          } catch (e) {
            this.clients.delete(client);
          }
        }
      }, 25000);
    }
  }

  /**
   * Broadcasts an event to all connected dashboard clients
   */
  public static broadcast(eventType: string, payload: any): void {
    const sseEvent: SSEPayload = {
      event: eventType,
      data: payload,
      timestamp: new Date().toISOString()
    };

    const rawMessage = `event: ${eventType}\ndata: ${JSON.stringify(sseEvent)}\n\n`;

    for (const client of this.clients) {
      try {
        client.write(rawMessage);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  /**
   * Returns active connected client count
   */
  public static getConnectedCount(): number {
    return this.clients.size;
  }

  /**
   * Tear down all streams (useful during tests or shutdown)
   */
  public static closeAll(): void {
    for (const client of this.clients) {
      try {
        client.end();
      } catch (e) {}
    }
    this.clients.clear();
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }
}
