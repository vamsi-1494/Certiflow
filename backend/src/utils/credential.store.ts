import { CertificateStatus } from '@prisma/client';

export const inMemoryCertificates: Map<string, any> = new Map();

export const initSharedCertificateStore = () => {
  if (inMemoryCertificates.size > 0) return;

  const validCert = {
    id: 'cert-001',
    certificateNumber: 'PSM-2026-BPL-OFAP-0001',
    candidateId: 'cand-rohan-001',
    candidateName: 'Rohan Sharma',
    guardianName: 'Mahesh Sharma',
    courseName: 'Organic Farming & Agro-processing',
    courseCode: 'OFAP-106',
    trainingCentreName: 'Apex Skill Development Centre',
    districtName: 'Bhopal',
    batchId: 'batch-006',
    batchNumber: 'BATCH-2026-006',
    verificationCode: 'VRF-ROH-8899-VALID',
    accessToken: 'tok_rohan_valid_access_key_9988',
    pdfPath: './storage/certificates/PSM-2026-BPL-OFAP-0001.pdf',
    status: CertificateStatus.ISSUED,
    issueDate: new Date('2026-01-20'),
    issuingAuthority: 'Pragati Skills Mission, Govt of India',
    cancellationReason: null,
    cancelledAt: null,
    cancelledBy: null,
    createdAt: new Date('2026-01-20'),
    updatedAt: new Date('2026-01-20')
  };

  const cancelledCert = {
    id: 'cert-002',
    certificateNumber: 'PSM-2026-BPL-TTT-0002-REVOKED',
    candidateId: 'cand-vikram-002',
    candidateName: 'Vikram Aditya',
    guardianName: 'Rameshwar Aditya',
    courseName: 'Telecom Tower Technician',
    courseCode: 'TTT-107',
    trainingCentreName: 'Apex Skill Development Centre',
    districtName: 'Bhopal',
    batchId: 'batch-007',
    batchNumber: 'BATCH-2026-007',
    verificationCode: 'VRF-VIK-7766-REVOKED',
    accessToken: 'tok_vikram_revoked_key_1122',
    pdfPath: './storage/certificates/PSM-2026-BPL-TTT-0002-REVOKED.pdf',
    status: CertificateStatus.CANCELLED,
    issueDate: new Date('2026-01-18'),
    issuingAuthority: 'Pragati Skills Mission, Govt of India',
    cancellationReason: 'Duplicate Aadhaar record identified during State Office vigilance audit.',
    cancelledAt: new Date('2026-01-25'),
    cancelledBy: 'Farah Khan (State Office)',
    createdAt: new Date('2026-01-18'),
    updatedAt: new Date('2026-01-25')
  };

  inMemoryCertificates.set(validCert.id, validCert);
  inMemoryCertificates.set(cancelledCert.id, cancelledCert);
};

initSharedCertificateStore();
