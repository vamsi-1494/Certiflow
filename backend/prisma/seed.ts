import { PrismaClient, Role, BatchStatus, CertificateStatus, ApprovalDecision, QualityDecision } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Seeding database for Pragati Skills Mission...');

  const passwordHash = await bcrypt.hash('Password@123', 10);

  // 1. Districts
  const bhopal = await prisma.district.upsert({
    where: { code: 'BPL' },
    update: {},
    create: {
      name: 'Bhopal',
      code: 'BPL',
      state: 'Madhya Pradesh'
    }
  });

  const indore = await prisma.district.upsert({
    where: { code: 'IND' },
    update: {},
    create: {
      name: 'Indore',
      code: 'IND',
      state: 'Madhya Pradesh'
    }
  });

  console.log('[Seed] Districts created: Bhopal, Indore');

  // 2. Training Centre
  const trainingCentre = await prisma.trainingCentre.upsert({
    where: { centreCode: 'TC-BPL-001' },
    update: {},
    create: {
      centreCode: 'TC-BPL-001',
      name: 'Apex Skill Development Centre',
      districtId: bhopal.id,
      address: 'Plot 42, MP Nagar Zone II, Bhopal',
      contactPhone: '+91 98765 43210',
      contactEmail: 'apex.bhopal@pragati.gov.in'
    }
  });

  console.log('[Seed] Training Centre created: Apex Skill Development Centre');

  // 3. Demo Users
  // Anika - Training Centre
  const anika = await prisma.user.upsert({
    where: { email: 'anika@pragati.gov.in' },
    update: {},
    create: {
      email: 'anika@pragati.gov.in',
      name: 'Anika Sharma',
      password: passwordHash,
      role: Role.TRAINING_CENTRE,
      phone: '+91 98765 00001',
      trainingCentreId: trainingCentre.id,
      districtId: bhopal.id
    }
  });

  // Dev - District Officer 1
  const dev = await prisma.user.upsert({
    where: { email: 'dev@pragati.gov.in' },
    update: {},
    create: {
      email: 'dev@pragati.gov.in',
      name: 'Dev Verma',
      password: passwordHash,
      role: Role.DISTRICT_OFFICER,
      phone: '+91 98765 00002',
      districtId: bhopal.id
    }
  });

  // Meera - District Officer 2
  const meera = await prisma.user.upsert({
    where: { email: 'meera@pragati.gov.in' },
    update: {},
    create: {
      email: 'meera@pragati.gov.in',
      name: 'Meera Rao',
      password: passwordHash,
      role: Role.DISTRICT_OFFICER,
      phone: '+91 98765 00003',
      districtId: bhopal.id
    }
  });

  // Kabir - District Officer 3
  const kabir = await prisma.user.upsert({
    where: { email: 'kabir@pragati.gov.in' },
    update: {},
    create: {
      email: 'kabir@pragati.gov.in',
      name: 'Kabir Singh',
      password: passwordHash,
      role: Role.DISTRICT_OFFICER,
      phone: '+91 98765 00004',
      districtId: bhopal.id
    }
  });

  // Neha - Quality Team
  const neha = await prisma.user.upsert({
    where: { email: 'neha@pragati.gov.in' },
    update: {},
    create: {
      email: 'neha@pragati.gov.in',
      name: 'Neha Gupta',
      password: passwordHash,
      role: Role.QUALITY_TEAM,
      phone: '+91 98765 00005'
    }
  });

  // Farah - State Office
  const farah = await prisma.user.upsert({
    where: { email: 'farah@pragati.gov.in' },
    update: {},
    create: {
      email: 'farah@pragati.gov.in',
      name: 'Farah Khan',
      password: passwordHash,
      role: Role.STATE_OFFICE,
      phone: '+91 98765 00006'
    }
  });

  console.log('[Seed] Demo Users seeded: Anika, Dev, Meera, Kabir, Neha, Farah (Password: Password@123)');

  // 4. Sample Batches
  // Batch 1: Small Batch (10 candidates) - DRAFT / SUBMITTED
  const batch1 = await prisma.batch.upsert({
    where: { batchNumber: 'BATCH-2026-001' },
    update: {},
    create: {
      batchNumber: 'BATCH-2026-001',
      courseName: 'Solar Panel Installation Technician',
      courseCode: 'SPIT-101',
      trainingCentreId: trainingCentre.id,
      districtId: bhopal.id,
      status: BatchStatus.SUBMITTED,
      totalCandidates: 10,
      submittedAt: new Date(),
      candidates: {
        create: Array.from({ length: 10 }, (_, i) => ({
          fullName: `Candidate Small ${i + 1}`,
          guardianName: `Guardian ${i + 1}`,
          dateOfBirth: '2001-05-15',
          gender: i % 2 === 0 ? 'Male' : 'Female',
          mobileNumber: `+91 91000 000${i.toString().padStart(2, '0')}`,
          aadhaarLast4: (1000 + i).toString().slice(-4),
          courseCode: 'SPIT-101',
          trainingCompletionDate: new Date('2026-01-30')
        }))
      }
    }
  });

  // Batch 2: Large Batch (60 candidates) - Triggers Quality Review (> 50)
  const batch2 = await prisma.batch.upsert({
    where: { batchNumber: 'BATCH-2026-002' },
    update: {},
    create: {
      batchNumber: 'BATCH-2026-002',
      courseName: 'Healthcare General Duty Assistant',
      courseCode: 'GDA-202',
      trainingCentreId: trainingCentre.id,
      districtId: bhopal.id,
      status: BatchStatus.QUALITY_REVIEW,
      totalCandidates: 60,
      submittedAt: new Date(Date.now() - 3600000 * 24),
      candidates: {
        create: Array.from({ length: 60 }, (_, i) => ({
          fullName: `Candidate Large ${i + 1}`,
          guardianName: `Parent ${i + 1}`,
          dateOfBirth: '2000-08-20',
          gender: i % 3 === 0 ? 'Female' : 'Male',
          mobileNumber: `+91 92000 ${i.toString().padStart(5, '0')}`,
          aadhaarLast4: (2000 + i).toString().slice(-4),
          courseCode: 'GDA-202',
          trainingCompletionDate: new Date('2026-02-10')
        }))
      },
      approvals: {
        create: [
          { userId: dev.id, round: 1, decision: ApprovalDecision.APPROVED, comments: 'Attendance verified.' },
          { userId: meera.id, round: 1, decision: ApprovalDecision.APPROVED, comments: 'Practical lab assessments verified.' }
        ]
      }
    }
  });

  // Batch 3: Batch waiting for district approval (1/2 Approvals)
  const batch3 = await prisma.batch.upsert({
    where: { batchNumber: 'BATCH-2026-003' },
    update: {},
    create: {
      batchNumber: 'BATCH-2026-003',
      courseName: 'Electric Vehicle Service Specialist',
      courseCode: 'EVSS-303',
      trainingCentreId: trainingCentre.id,
      districtId: bhopal.id,
      status: BatchStatus.DISTRICT_REVIEW,
      totalCandidates: 15,
      submittedAt: new Date(Date.now() - 3600000 * 12),
      candidates: {
        create: Array.from({ length: 15 }, (_, i) => ({
          fullName: `EV Candidate ${i + 1}`,
          guardianName: `Parent EV ${i + 1}`,
          dateOfBirth: '1999-11-12',
          gender: 'Male',
          mobileNumber: `+91 93000 ${i.toString().padStart(5, '0')}`,
          aadhaarLast4: (3000 + i).toString().slice(-4),
          courseCode: 'EVSS-303',
          trainingCompletionDate: new Date('2026-02-15')
        }))
      },
      approvals: {
        create: [
          { userId: dev.id, round: 1, decision: ApprovalDecision.APPROVED, comments: 'Dev approved. Waiting for 2nd officer.' }
        ]
      }
    }
  });

  // Batch 4: Batch returned for correction
  const batch4 = await prisma.batch.upsert({
    where: { batchNumber: 'BATCH-2026-004' },
    update: {},
    create: {
      batchNumber: 'BATCH-2026-004',
      courseName: 'Data Entry & Office Automation',
      courseCode: 'DEOA-104',
      trainingCentreId: trainingCentre.id,
      districtId: bhopal.id,
      status: BatchStatus.RETURNED_FOR_CORRECTION,
      totalCandidates: 12,
      correctionReason: 'Candidate 3 and 7 have mismatching date of birth with matriculation records.',
      submittedAt: new Date(Date.now() - 3600000 * 48),
      currentApprovalRound: 1,
      candidates: {
        create: Array.from({ length: 12 }, (_, i) => ({
          fullName: `Data Entry Candidate ${i + 1}`,
          guardianName: `Guardian ${i + 1}`,
          dateOfBirth: '2002-01-10',
          gender: i % 2 === 0 ? 'Female' : 'Male',
          mobileNumber: `+91 94000 ${i.toString().padStart(5, '0')}`,
          aadhaarLast4: (4000 + i).toString().slice(-4),
          courseCode: 'DEOA-104',
          trainingCompletionDate: new Date('2026-01-25')
        }))
      }
    }
  });

  // Batch 5: Batch waiting for state approval
  const batch5 = await prisma.batch.upsert({
    where: { batchNumber: 'BATCH-2026-005' },
    update: {},
    create: {
      batchNumber: 'BATCH-2026-005',
      courseName: 'Plumbing & Water Management',
      courseCode: 'PWM-105',
      trainingCentreId: trainingCentre.id,
      districtId: bhopal.id,
      status: BatchStatus.STATE_APPROVAL,
      totalCandidates: 20,
      submittedAt: new Date(Date.now() - 3600000 * 30),
      approvals: {
        create: [
          { userId: dev.id, round: 1, decision: ApprovalDecision.APPROVED, comments: 'Approved by Dev.' },
          { userId: meera.id, round: 1, decision: ApprovalDecision.APPROVED, comments: 'Approved by Meera.' }
        ]
      },
      candidates: {
        create: Array.from({ length: 20 }, (_, i) => ({
          fullName: `Plumbing Candidate ${i + 1}`,
          guardianName: `Guardian ${i + 1}`,
          dateOfBirth: '1998-04-18',
          gender: 'Male',
          mobileNumber: `+91 95000 ${i.toString().padStart(5, '0')}`,
          aadhaarLast4: (5000 + i).toString().slice(-4),
          courseCode: 'PWM-105',
          trainingCompletionDate: new Date('2026-02-01')
        }))
      }
    }
  });

  // Batch 6: Issued Certificate Batch
  const batch6 = await prisma.batch.upsert({
    where: { batchNumber: 'BATCH-2026-006' },
    update: {},
    create: {
      batchNumber: 'BATCH-2026-006',
      courseName: 'Organic Farming & Agro-processing',
      courseCode: 'OFAP-106',
      trainingCentreId: trainingCentre.id,
      districtId: bhopal.id,
      status: BatchStatus.ISSUED,
      totalCandidates: 1,
      submittedAt: new Date(Date.now() - 3600000 * 72),
      lastApprovedAt: new Date(Date.now() - 3600000 * 48),
      candidates: {
        create: [
          {
            fullName: 'Rohan Sharma',
            guardianName: 'Ramesh Sharma',
            dateOfBirth: '2001-07-14',
            gender: 'Male',
            mobileNumber: '+91 98111 22233',
            aadhaarLast4: '8899',
            courseCode: 'OFAP-106',
            trainingCompletionDate: new Date('2026-01-15')
          }
        ]
      }
    }
  });

  // Attach Certificate for Batch 6 candidate
  const batch6Candidate = await prisma.candidate.findFirst({
    where: { batchId: batch6.id }
  });

  if (batch6Candidate) {
    await prisma.certificate.upsert({
      where: { certificateNumber: 'PSM-2026-BPL-OFAP-0001' },
      update: {},
      create: {
        certificateNumber: 'PSM-2026-BPL-OFAP-0001',
        candidateId: batch6Candidate.id,
        batchId: batch6.id,
        verificationCode: 'VRF-ROH-8899-VALID',
        accessToken: 'tok_rohan_valid_access_key_9988',
        pdfPath: './storage/certificates/PSM-2026-BPL-OFAP-0001.pdf',
        status: CertificateStatus.ISSUED,
        issueDate: new Date('2026-01-20')
      }
    });
  }

  // Batch 7: Cancelled Certificate Batch
  const batch7 = await prisma.batch.upsert({
    where: { batchNumber: 'BATCH-2026-007' },
    update: {},
    create: {
      batchNumber: 'BATCH-2026-007',
      courseName: 'Telecom Tower Technician',
      courseCode: 'TTT-107',
      trainingCentreId: trainingCentre.id,
      districtId: bhopal.id,
      status: BatchStatus.ISSUED,
      totalCandidates: 1,
      submittedAt: new Date(Date.now() - 3600000 * 96),
      lastApprovedAt: new Date(Date.now() - 3600000 * 72),
      candidates: {
        create: [
          {
            fullName: 'Vikram Aditya',
            guardianName: 'Surya Aditya',
            dateOfBirth: '1999-03-25',
            gender: 'Male',
            mobileNumber: '+91 98222 33344',
            aadhaarLast4: '7766',
            courseCode: 'TTT-107',
            trainingCompletionDate: new Date('2026-01-10')
          }
        ]
      }
    }
  });

  const batch7Candidate = await prisma.candidate.findFirst({
    where: { batchId: batch7.id }
  });

  if (batch7Candidate) {
    await prisma.certificate.upsert({
      where: { certificateNumber: 'PSM-2026-BPL-TTT-0002-REVOKED' },
      update: {},
      create: {
        certificateNumber: 'PSM-2026-BPL-TTT-0002-REVOKED',
        candidateId: batch7Candidate.id,
        batchId: batch7.id,
        verificationCode: 'VRF-VIK-7766-REVOKED',
        accessToken: 'tok_vikram_revoked_key_1122',
        pdfPath: './storage/certificates/PSM-2026-BPL-TTT-0002-REVOKED.pdf',
        status: CertificateStatus.CANCELLED,
        cancellationReason: 'Duplicate Aadhaar record identified during State Office vigilance audit.',
        cancelledAt: new Date(),
        cancelledByUserId: farah.id,
        issueDate: new Date('2026-01-18')
      }
    });
  }

  console.log('[Seed] Sample batches seeded successfully across all lifecycle stages!');
}

main()
  .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
