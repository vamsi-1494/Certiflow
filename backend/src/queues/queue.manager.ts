import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { CertificateService } from '../services/certificate.service.js';
import { MockWhatsAppService, SendMessagePayload } from '../services/whatsapp.service.js';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

let certQueue: Queue | null = null;
let notifQueue: Queue | null = null;
let isRedisConnected = false;

// Fast Redis connection probe (500ms timeout)
async function initRedisQueues() {
  try {
    const probe = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      connectTimeout: 400,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null // Don't hang or retry in offline mode
    });

    probe.on('error', () => {}); // Suppress offline error logging

    await new Promise((resolve, reject) => {
      probe.ping((err) => {
        if (err) reject(err);
        else resolve(true);
      });
      setTimeout(() => reject(new Error('Redis connection timeout')), 400);
    });

    probe.disconnect();

    // If ping succeeded, initialize BullMQ with active Redis connection
    const connection = { host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null };
    certQueue = new Queue('certificate-generation', { connection });
    notifQueue = new Queue('whatsapp-notifications', { connection });

    new Worker('certificate-generation', async (job) => {
      console.log(`[BullMQ Worker] Generating certificates for batch: ${job.data.batchId}`);
      return await CertificateService.generateCertificatesForBatch(job.data.batchId);
    }, { connection });

    new Worker('whatsapp-notifications', async (job) => {
      console.log(`[BullMQ Worker] Sending WhatsApp to: ${job.data.recipientPhone} (Attempt ${job.attemptsMade + 1})`);
      return await MockWhatsAppService.sendCertificateNotification(job.data, job.attemptsMade + 1);
    }, { connection });

    isRedisConnected = true;
    console.log('[QueueManager] Connected to Redis. BullMQ background workers active.');
  } catch (err) {
    isRedisConnected = false;
    // Standalone mode: Asynchronous background dispatcher will handle jobs
  }
}

// Probe Redis on boot
initRedisQueues().catch(() => {});

export class QueueManager {
  /**
   * Enqueues batch certificate generation job.
   * Runs asynchronously in background: HTTP request never blocks on PDF generation.
   */
  static async enqueueCertificateGeneration(batchId: string): Promise<void> {
    if (isRedisConnected && certQueue) {
      try {
        await certQueue.add('generateBatch', { batchId }, {
          jobId: `batch-cert-${batchId}`,
          removeOnComplete: true
        });
        return;
      } catch (err) {}
    }

    // In-process asynchronous execution (Zero HTTP blocking)
    setImmediate(async () => {
      try {
        await CertificateService.generateCertificatesForBatch(batchId);
      } catch (err: any) {
        console.error(`[Async Queue Error] Certificate generation failed:`, err.message);
      }
    });
  }

  /**
   * Enqueues simulated WhatsApp notification with exponential backoff retry.
   */
  static async enqueueNotification(payload: SendMessagePayload): Promise<void> {
    if (isRedisConnected && notifQueue) {
      try {
        await notifQueue.add('sendWhatsApp', payload, {
          jobId: `wa-cert-${payload.candidateId}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true
        });
        return;
      } catch (err) {}
    }

    // In-process fallback with simulated retry
    setImmediate(async () => {
      let attempts = 0;
      const maxAttempts = 3;
      while (attempts < maxAttempts) {
        attempts++;
        try {
          await MockWhatsAppService.sendCertificateNotification(payload, attempts);
          break; // Success
        } catch (err: any) {
          if (attempts >= maxAttempts) {
            console.error(`[Async Queue] WhatsApp notification failed permanently for ${payload.recipientPhone} after ${attempts} attempts.`);
          } else {
            const backoffDelay = Math.pow(2, attempts) * 300;
            await new Promise(r => setTimeout(r, backoffDelay));
          }
        }
      }
    });
  }
}
