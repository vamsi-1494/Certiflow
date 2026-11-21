import * as XLSX from 'xlsx';

export interface RowValidationError {
  rowNumber: number;
  field: string;
  value: any;
  error: string;
}

export interface ValidatedCandidate {
  fullName: string;
  guardianName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: 'Male' | 'Female' | 'Other';
  mobileNumber: string;
  aadhaarLast4: string;
  courseCode: string;
  trainingCompletionDate: string; // YYYY-MM-DD
}

export interface SpreadsheetValidationResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: RowValidationError[];
  candidates: ValidatedCandidate[];
}

export class SpreadsheetValidator {
  /**
   * Parses buffer (CSV or Excel) and validates all rows against schema rules.
   * Enforces all-or-nothing validation.
   */
  static parseAndValidate(buffer: Buffer): SpreadsheetValidationResult {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return {
        isValid: false,
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        errors: [{ rowNumber: 1, field: 'file', value: null, error: 'Uploaded spreadsheet is empty or has no sheets.' }],
        candidates: []
      };
    }

    const sheet = workbook.Sheets[sheetName];
    // Parse sheet as array of objects using headers
    const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rawRows.length === 0) {
      return {
        isValid: false,
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        errors: [{ rowNumber: 1, field: 'file', value: null, error: 'Spreadsheet has no candidate data rows.' }],
        candidates: []
      };
    }

    const errors: RowValidationError[] = [];
    const validCandidates: ValidatedCandidate[] = [];

    // Header normalization map
    // Allows flexible column naming: "Full Name", "full_name", "Candidate Name", etc.
    rawRows.forEach((row, index) => {
      const rowNumber = index + 2; // Row 1 is header, so row 2 is the first data row
      const rowErrors: RowValidationError[] = [];

      // 1. Full Name
      const fullName = (row['Full Name'] || row['fullName'] || row['Candidate Name'] || row['name'] || '').toString().trim();
      if (!fullName) {
        rowErrors.push({ rowNumber, field: 'fullName', value: fullName, error: 'Full Name is required.' });
      } else if (fullName.length < 2 || fullName.length > 100) {
        rowErrors.push({ rowNumber, field: 'fullName', value: fullName, error: 'Full Name must be between 2 and 100 characters.' });
      }

      // 2. Guardian Name
      const guardianName = (row['Guardian Name'] || row['guardianName'] || row['Father Name'] || row['Mother Name'] || '').toString().trim();
      if (!guardianName) {
        rowErrors.push({ rowNumber, field: 'guardianName', value: guardianName, error: 'Guardian / Father Name is required.' });
      }

      // 3. Date of Birth (YYYY-MM-DD)
      let dobRaw = row['Date of Birth'] || row['dateOfBirth'] || row['DOB'] || '';
      let dobString = '';
      if (dobRaw instanceof Date) {
        dobString = dobRaw.toISOString().split('T')[0];
      } else {
        dobString = dobRaw.toString().trim();
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dobString) {
        rowErrors.push({ rowNumber, field: 'dateOfBirth', value: dobRaw, error: 'Date of Birth is required (format: YYYY-MM-DD).' });
      } else if (!dateRegex.test(dobString) || isNaN(Date.parse(dobString))) {
        rowErrors.push({ rowNumber, field: 'dateOfBirth', value: dobString, error: 'Date of Birth must be in valid YYYY-MM-DD format.' });
      } else {
        const birthDate = new Date(dobString);
        const ageYears = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000);
        if (ageYears < 18) {
          rowErrors.push({ rowNumber, field: 'dateOfBirth', value: dobString, error: 'Candidate must be at least 18 years old.' });
        }
      }

      // 4. Gender
      const genderRaw = (row['Gender'] || row['gender'] || '').toString().trim().toLowerCase();
      let normalizedGender: 'Male' | 'Female' | 'Other' | null = null;
      if (genderRaw === 'm' || genderRaw === 'male') normalizedGender = 'Male';
      else if (genderRaw === 'f' || genderRaw === 'female') normalizedGender = 'Female';
      else if (genderRaw === 'o' || genderRaw === 'other') normalizedGender = 'Other';

      if (!normalizedGender) {
        rowErrors.push({ rowNumber, field: 'gender', value: row['Gender'], error: "Gender must be 'Male', 'Female', or 'Other'." });
      }

      // 5. Mobile Number (10 digits Indian)
      let mobileRaw = (row['Mobile Number'] || row['mobileNumber'] || row['Phone'] || row['mobile'] || '').toString().replace(/[\s\-\+]/g, '');
      if (mobileRaw.startsWith('91') && mobileRaw.length === 12) {
        mobileRaw = mobileRaw.slice(2);
      }
      const mobileRegex = /^[6-9]\d{9}$/;
      if (!mobileRaw) {
        rowErrors.push({ rowNumber, field: 'mobileNumber', value: row['Mobile Number'], error: 'Mobile Number is required.' });
      } else if (!mobileRegex.test(mobileRaw)) {
        rowErrors.push({ rowNumber, field: 'mobileNumber', value: row['Mobile Number'], error: 'Mobile Number must be a valid 10-digit Indian number starting with 6-9.' });
      }

      // 6. Aadhaar Last 4 Digits
      let aadhaarRaw = (row['Aadhaar Last 4'] || row['aadhaarLast4'] || row['Aadhaar'] || '').toString().trim();
      const aadhaarRegex = /^\d{4}$/;
      if (!aadhaarRaw) {
        rowErrors.push({ rowNumber, field: 'aadhaarLast4', value: aadhaarRaw, error: 'Last 4 digits of Aadhaar are required.' });
      } else if (!aadhaarRegex.test(aadhaarRaw)) {
        rowErrors.push({ rowNumber, field: 'aadhaarLast4', value: aadhaarRaw, error: 'Aadhaar Last 4 must be exactly 4 numeric digits.' });
      }

      // 7. Course Code
      const courseCode = (row['Course Code'] || row['courseCode'] || row['course'] || '').toString().trim();
      if (!courseCode) {
        rowErrors.push({ rowNumber, field: 'courseCode', value: courseCode, error: 'Course Code is required.' });
      }

      // 8. Training Completion Date
      let compDateRaw = row['Training Completion Date'] || row['trainingCompletionDate'] || row['completionDate'] || '';
      let compDateString = '';
      if (compDateRaw instanceof Date) {
        compDateString = compDateRaw.toISOString().split('T')[0];
      } else {
        compDateString = compDateRaw.toString().trim();
      }

      if (!compDateString) {
        rowErrors.push({ rowNumber, field: 'trainingCompletionDate', value: compDateRaw, error: 'Training Completion Date is required (format: YYYY-MM-DD).' });
      } else if (!dateRegex.test(compDateString) || isNaN(Date.parse(compDateString))) {
        rowErrors.push({ rowNumber, field: 'trainingCompletionDate', value: compDateString, error: 'Training Completion Date must be in YYYY-MM-DD format.' });
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else if (normalizedGender) {
        validCandidates.push({
          fullName,
          guardianName,
          dateOfBirth: dobString,
          gender: normalizedGender,
          mobileNumber: mobileRaw,
          aadhaarLast4: aadhaarRaw,
          courseCode,
          trainingCompletionDate: compDateString
        });
      }
    });

    const totalRows = rawRows.length;
    const invalidRows = new Set(errors.map(e => e.rowNumber)).size;
    const validRows = totalRows - invalidRows;

    return {
      isValid: errors.length === 0,
      totalRows,
      validRows,
      invalidRows,
      errors,
      candidates: errors.length === 0 ? validCandidates : []
    };
  }
}
