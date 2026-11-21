import { NotificationStatus } from '@prisma/client';
import prisma, { isDbConnected } from '../utils/prisma.js';

export interface SendMessagePayload {
  candidateId: string;
  certificateId?: string;
  recipientPhone: string;
  candidateName: string;
  courseName: string;
  certificateNumber: string;
  accessToken: string;
}

// In-memory notifications store fallback
export const memoryNotifications: any[] = [];

export class MockWhatsAppService {
  private static getFailureRate(): number {
    return parseFloat(process.env.SIMULATE_WHATSAPP_FAILURE_RATE || '0.20');
  }

  private static getDelayMs(): number {
    return parseInt(process.env.SIMULATE_WHATSAPP_DELAY_MS || '800', 10);
  }

  /**
   * Simulates sending a WhatsApp notification with network delay,
   * realistic telecom failure rates, and retry handling.
   */
  static async sendCertificateNotification(payload: SendMessagePayload, attemptNumber = 1): Promise<{ success: boolean; messageId: string }> {
    const delay = this.getDelayMs();
    const failureRate = this.getFailureRate();

    // 1. Simulate telecom network propagation delay
    await new Promise(resolve => setTimeout(resolve, Math.min(delay, 1000)));

    const frontendUrl = process.env.PUBLIC_FRONTEND_URL || 'http://localhost:5173';
    const downloadUrl = `${frontendUrl}/certificate/${payload.accessToken}`;

    const messageBody = `Namaste ${payload.candidateName} ji,\n` +
      `Congratulations from Pragati Skills Mission!\n\n` +
      `Your digital skill certificate for '${payload.courseName}' has been officially issued.\n` +
      `Certificate Number: ${payload.certificateNumber}\n\n` +
      `You can view and download your verified government certificate securely using your private access link:\n` +
      `${downloadUrl}\n\n` +
      `Govt of India - Pragati Skills Mission`;

    // 2. Simulate Random Network / Carrier Failure
    // On attempt 3 (final retry), success is guaranteed (0% failure rate) to demonstrate eventual consistency
    const adjustedFailureRate = attemptNumber >= 3 ? 0 : (attemptNumber >= 2 ? failureRate * 0.5 : failureRate);
    const shouldFail = Math.random() < adjustedFailureRate;

    const notifRecord = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      candidateId: payload.candidateId,
      certificateId: payload.certificateId,
      recipientPhone: payload.recipientPhone,
      messageBody,
      status: shouldFail ? NotificationStatus.FAILED : NotificationStatus.DELIVERED,
      attempts: attemptNumber,
      failureReason: shouldFail ? 'Gateway Timeout: Telecom carrier network unreachable' : null,
      deliveredAt: shouldFail ? null : new Date(),
      lastAttemptAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    memoryNotifications.unshift(notifRecord);

    if (isDbConnected()) {
      try {
        await prisma.notification.create({
          data: {
            candidateId: payload.candidateId,
            certificateId: payload.certificateId,
            recipientPhone: payload.recipientPhone,
            messageBody,
            status: notifRecord.status,
            attempts: attemptNumber,
            failureReason: notifRecord.failureReason,
            deliveredAt: notifRecord.deliveredAt,
            lastAttemptAt: notifRecord.lastAttemptAt
          }
        });
      } catch (e) {}
    }

    if (shouldFail) {
      console.warn(`[MockWhatsApp] Delivery FAILED for ${payload.recipientPhone} (Attempt ${attemptNumber}/${3}). Retrying via BullMQ...`);
      const error: any = new Error(`Mock WhatsApp Gateway Timeout: Carrier network unreachable for ${payload.recipientPhone}`);
      error.code = 'WHATSAPP_GATEWAY_TIMEOUT';
      error.attempt = attemptNumber;
      throw error;
    }

    console.log(`[MockWhatsApp] Delivered successfully to ${payload.recipientPhone} (Message ID: ${notifRecord.id})`);
    return {
      success: true,
      messageId: notifRecord.id
    };
  }

  /**
   * Retrieve notification log history
   */
  static async getNotifications(candidateId?: string) {
    if (isDbConnected()) {
      try {
        return await prisma.notification.findMany({
          where: candidateId ? { candidateId } : {},
          orderBy: { createdAt: 'desc' },
          take: 50
        });
      } catch (e) {}
    }

    let list = [...memoryNotifications];
    if (candidateId) {
      list = list.filter(n => n.candidateId === candidateId);
    }
    return list;
  }
}
