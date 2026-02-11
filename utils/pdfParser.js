// Core node modules
let pdf = require('pdf-parse');

// Handle various export formats of pdf-parse
if (typeof pdf !== 'function') {
    if (pdf.default) {
        pdf = pdf.default;
    } else if (pdf.PDFParse) {
        pdf = pdf.PDFParse;
    }
}

class EPFPassbookParser {

    // Extract raw text from PDF buffer
    async extractText(pdfBuffer) {
        try {
            // Check if pdf is a constructor (class) or a standard function
            if (pdf.prototype && pdf.prototype.getText) {
                // Class-based usage (pdf-parse v2/fork)
                const u8 = new Uint8Array(pdfBuffer);
                const instance = new pdf(u8);
                const data = await instance.getText();
                return data && data.text ? data.text : '';
            } else {
                // Standard pdf-parse function usage
                const data = await pdf(pdfBuffer);
                return data.text;
            }
        } catch (error) {
            console.error('PDF text extraction failed:', error.message);
            throw new Error('Invalid PDF format. Please upload a valid EPF passbook from EPFO portal.');
        }
    }

    // Parse member information section
    parseMemberInfo(text) {
        const memberInfo = {};

        // Helper to extract value with flexible regex
        const extract = (label, regex) => {
            const match = text.match(regex);
            return match ? match[1].trim() : null;
        };

        // Establishment ID and Name
        // Pattern: "Establishment ID/Name <ID>/<Name>"
        const estMatch = text.match(/Establishment ID\/Name\s*[:\-]?\s*([A-Z0-9]+)\s*\/\s*([^\n]+)/i);
        if (estMatch) {
            memberInfo.establishmentId = estMatch[1].trim();
            memberInfo.establishmentName = estMatch[2].trim();
        }

        // Member ID and Name
        const memMatch = text.match(/Member ID\/Name\s*[:\-]?\s*([A-Z0-9]+)\s*\/\s*([^\n]+)/i);
        if (memMatch) {
            memberInfo.memberId = memMatch[1].trim();
            memberInfo.memberName = memMatch[2].trim();
        }

        // UAN (Universal Account Number)
        const uanMatch = text.match(/UAN\s*[:\-]?\s*(\d{12})/i);
        memberInfo.uan = uanMatch ? uanMatch[1] : null;

        // Date of Birth - DD-MM-YYYY
        const dobMatch = text.match(/Date of Birth\s*[:\-]?\s*(\d{2}[\-\/]\d{2}[\-\/]\d{4})/i);
        memberInfo.dateOfBirth = dobMatch ? dobMatch[1] : null;

        // Financial Year
        const fyMatch = text.match(/(\d{4}-\d{4})/);
        memberInfo.financialYear = fyMatch ? fyMatch[1] : '2025-2026';

        return memberInfo;
    }

    // Helper: Parse 5 numeric columns from a line string (Backwards Scan)
    parseAmountsFromLine(line) {
        const parseVal = (str) => parseInt((str || '').replace(/[^\d]/g, ''), 10) || 0;
        const isNumeric = (str) => /^[\d,.]+$/.test(str);

        const parts = line.trim().split(/\s+/);
        const numericTokens = [];
        let i = parts.length - 1;

        // Scan backwards
        while (i >= 0) {
            const token = parts[i];
            if (isNumeric(token)) {
                numericTokens.unshift(parseVal(token));
                i--;
            } else {
                break; // Stop at first non-numeric token
            }
        }

        let result = {
            epfWage: 0, epsWage: 0, empShare: 0, emprShare: 0, pension: 0,
            hasAmounts: false,
            endIndex: i // Index of last non-numeric token
        };

        const count = numericTokens.length;
        if (count >= 3) {
            result.hasAmounts = true;
            // Map Right-to-Left
            result.pension = numericTokens[count - 1];
            result.emprShare = numericTokens[count - 2];
            result.empShare = numericTokens[count - 3];

            if (count >= 4) result.epsWage = numericTokens[count - 4];
            if (count >= 5) result.epfWage = numericTokens[count - 5];
        }

        return result;
    }

    // Parse contribution records with robust line processing
    parseContributions(text) {
        const contributions = [];

        // Find contribution table
        let tableStart = -1;
        const potentialHeaders = ['EPF Wages', 'Wage Month', 'Transaction Date', 'Particulars'];
        for (const header of potentialHeaders) {
            const idx = text.indexOf(header);
            if (idx !== -1) { tableStart = idx; break; }
        }

        if (tableStart === -1) {
            console.warn('⚠️ Could not find contribution table start marker');
            return contributions;
        }

        let tableEnd = text.indexOf('Total Contributions', tableStart);
        if (tableEnd === -1) tableEnd = text.indexOf('Closing Balance', tableStart);
        if (tableEnd === -1) tableEnd = text.indexOf('Taxable Data', tableStart);
        if (tableEnd === -1) tableEnd = text.length;

        const tableText = text.substring(tableStart, tableEnd);
        const lines = tableText.split('\n');

        // DEBUG
        if (lines.length < 5) console.log('⚠️ Debug Table Text Excerpt:', tableText.substring(0, 200).replace(/\n/g, '\\n'));

        let currentRecord = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            const rowStartRegex = /([A-Za-z]{3}-\d{4})\s+(\d{2}-\d{2}-\d{4})/;
            const match = trimmed.match(rowStartRegex);

            if (match) {
                if (currentRecord) contributions.push(this.finalizeRecord(currentRecord));

                // Process new record line
                const parts = trimmed.split(/\s+/);

                // 1. Identify Start Columns (Month, Date, Type)
                let dateIndex = -1;
                for (let i = 0; i < parts.length; i++) {
                    if (/\d{2}-\d{2}-\d{4}/.test(parts[i])) { dateIndex = i; break; }
                }
                if (dateIndex === -1 && match) dateIndex = 1;

                const wageMonth = parts[dateIndex - 1] || match[1];
                const creditDate = parts[dateIndex] || match[2];

                let transactionType = 'CR';
                if (parts[dateIndex + 1] && ['CR', 'DR'].includes(parts[dateIndex + 1])) {
                    transactionType = parts[dateIndex + 1];
                }

                // 2. Identify Numeric Columns (Scanning Backwards)
                const amounts = this.parseAmountsFromLine(trimmed);

                // 3. Extract Particulars
                // Reconstruct the middle part strings
                // Start after TransactionType (dateIndex + 2 usually)
                // End before the numeric tokens we consumed (amounts.endIndex)

                const startTokenIdx = (parts[dateIndex + 1] === transactionType) ? dateIndex + 2 : dateIndex + 1;
                const endTokenIdx = amounts.endIndex;

                let particulars = "";
                if (endTokenIdx >= startTokenIdx) {
                    particulars = parts.slice(startTokenIdx, endTokenIdx + 1).join(" ");
                } else {
                    particulars = trimmed; // Fallback
                }

                currentRecord = {
                    wageMonth, creditDate, transactionType, particulars,
                    epfWage: amounts.epfWage, epsWage: amounts.epsWage,
                    empShare: amounts.empShare, emprShare: amounts.emprShare, pension: amounts.pension,
                    rawLine: trimmed
                };

            } else {
                // Continuation line processing
                if (currentRecord) {
                    currentRecord.particulars += " " + trimmed;
                    currentRecord.rawLine += " " + trimmed;

                    // If amounts were missing (0), try to find them on this line!
                    // Often transfer rows wrap, with amounts on the second line.
                    if (currentRecord.empShare === 0 && currentRecord.pension === 0) {
                        const amounts = this.parseAmountsFromLine(trimmed);
                        if (amounts.hasAmounts) {
                            currentRecord.epfWage = amounts.epfWage;
                            currentRecord.epsWage = amounts.epsWage;
                            currentRecord.empShare = amounts.empShare;
                            currentRecord.emprShare = amounts.emprShare;
                            currentRecord.pension = amounts.pension;

                            // Remove numbers from appended particulars?
                            // Optional: particulars usually ends with the numbers now.
                            // But keeping them is safer than aggressive removal.
                        }
                    }
                }
            }
        }

        if (currentRecord) contributions.push(this.finalizeRecord(currentRecord));
        return contributions;
    }

    finalizeRecord(rec) {
        let type = 'regular';
        let oldDetails = null;

        // Check for Transfer
        if (/TRANSFER IN|VDR|INTEREST/i.test(rec.particulars)) {
            type = 'transfer_in';
            if (/INTEREST/i.test(rec.particulars)) type = 'transfer_in_interest';

            const idMatch = rec.particulars.match(/Old Member Id[\s:\-]+([A-Z0-9]{10,})/i);
            if (idMatch) oldDetails = idMatch[1];

        } else if (/Arrear/i.test(rec.particulars)) {
            type = 'arrears';
        }

        // Validate/Correct Amounts
        if (type === 'regular' && rec.epfWage > 0) {
            const expectedEmp = Math.round(rec.epfWage * 0.12);
            if (rec.empShare === 0 && expectedEmp > 0) rec.empShare = expectedEmp;
        }

        return {
            wageMonth: rec.wageMonth,
            creditDate: rec.creditDate,
            transactionType: rec.transactionType,
            particulars: rec.particulars.replace(/\s+/g, ' ').trim(),
            contributionType: type,
            oldMemberId: oldDetails,
            wages: { epf: rec.epfWage, eps: rec.epsWage },
            contributions: { employee: rec.empShare, employer: rec.emprShare, pension: rec.pension },
            totalContribution: rec.empShare + rec.emprShare + rec.pension
        };
    }

    // Parse summary section
    parseSummary(text) {
        const summary = {};
        const parseAmount = (val) => {
            if (!val) return 0;
            return parseInt(val.replace(/,/g, ''), 10) || 0;
        };

        const openingMatch = text.match(/Opening Balance as on 31\/03\/(\d{4})\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/i);
        if (openingMatch) {
            summary.openingBalance = {
                asOn: `31/03/${openingMatch[1]}`,
                employee: parseAmount(openingMatch[2]), employer: parseAmount(openingMatch[3]), pension: parseAmount(openingMatch[4])
            };
        } else {
            summary.openingBalance = { asOn: '31/03/2025', employee: 0, employer: 0, pension: 0 };
        }

        const contribMatch = text.match(/Total Contributions.*?\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/i);
        if (contribMatch) {
            summary.totalContributions = {
                amount: parseAmount(contribMatch[1]) + parseAmount(contribMatch[2]) + parseAmount(contribMatch[3]),
                details: { employee: parseAmount(contribMatch[1]), employer: parseAmount(contribMatch[2]), pension: parseAmount(contribMatch[3]) }
            };
        }

        const transferMatch = text.match(/Total Transfer-Ins.*?\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/i);
        if (transferMatch) {
            summary.totalTransferIns = {
                amount: parseAmount(transferMatch[1]) + parseAmount(transferMatch[2]) + parseAmount(transferMatch[3]),
                details: { employee: parseAmount(transferMatch[1]), employer: parseAmount(transferMatch[2]), pension: parseAmount(transferMatch[3]) }
            };
        }

        const withdrawMatch = text.match(/Total Withdrawals\s+for the year\[\s*(\d{4})\]\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/i);
        if (withdrawMatch) {
            summary.totalWithdrawals = {
                year: withdrawMatch[1],
                employee: parseAmount(withdrawMatch[2]), employer: parseAmount(withdrawMatch[3]), pension: parseAmount(withdrawMatch[4]),
                total: parseAmount(withdrawMatch[2]) + parseAmount(withdrawMatch[3]) + parseAmount(withdrawMatch[4])
            };
        } else {
            summary.totalWithdrawals = { year: '2025', employee: 0, employer: 0, pension: 0, total: 0 };
        }

        summary.interestDetails = { status: 'N/A', employee: 0, employer: 0, pension: 0 };

        const balanceMatch = text.match(/Closing Balance as on 31\/03\/(\d{4})\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/);
        if (balanceMatch) {
            const emp = parseAmount(balanceMatch[2]);
            const empr = parseAmount(balanceMatch[3]);
            const pens = parseAmount(balanceMatch[4]);
            summary.closingBalance = {
                asOn: `31/03/${balanceMatch[1]}`, employee: emp, employer: empr, pension: pens,
                totalEPF: emp + empr, totalCorpus: emp + empr + pens
            };
        } else {
            summary.closingBalance = { asOn: 'Unknown', employee: 0, employer: 0, pension: 0, totalEPF: 0, totalCorpus: 0 };
        }

        return summary;
    }

    parseTaxableData(text) {
        const taxableData = { monthlyBreakdown: [], closingBalance: { taxable: 0, nonTaxable: 0 } };
        const sectionMatch = text.match(/Taxable Data for the year[\s\S]+/i);
        if (!sectionMatch) return taxableData;

        const lines = sectionMatch[0].split('\n');
        const parseVal = (str) => parseInt((str || '').replace(/[^\d]/g, ''), 10) || 0;

        for (const line of lines) {
            const trimmed = line.trim();
            const rowMatch = trimmed.match(/^([A-Za-z]{3}-\d{4})\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/);
            if (rowMatch) {
                taxableData.monthlyBreakdown.push({
                    month: rowMatch[1],
                    monthlyContribution: parseVal(rowMatch[2]),
                    nonTaxableBalance: parseVal(rowMatch[3]),
                    taxableBalance: parseVal(rowMatch[4])
                });
            }
        }
        return taxableData;
    }

    calculateInsights(contributions, summary, taxableData) {
        const insights = {
            totalContributionRecords: contributions.length,
            regularContributions: { count: 0, totalAmount: 0 },
            transferIns: { count: 0, totalAmount: 0 },
            missingMonths: [], accountStatus: 'Active'
        };

        contributions.forEach(c => {
            if (c.contributionType === 'regular') {
                insights.regularContributions.count++;
                insights.regularContributions.totalAmount += c.totalContribution;
            } else if (c.contributionType.startsWith('transfer_in')) {
                insights.transferIns.count++;
                insights.transferIns.totalAmount += c.totalContribution;
            }
        });
        return insights;
    }

    extractPrintDate(text) {
        const match = text.match(/Printed on\s*[:\-]\s*(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2})/);
        return match ? match[1] : null;
    }

    async parse(pdfBuffer) {
        try {
            console.log('📄 Starting PDF parsing...');
            const text = await this.extractText(pdfBuffer);
            console.log('✅ Text extracted successfully');

            const memberInfo = this.parseMemberInfo(text);
            const contributions = this.parseContributions(text);
            console.log(`✅ Contributions parsed: ${contributions.length} records`);

            const summary = this.parseSummary(text);
            const taxableData = this.parseTaxableData(text);
            const insights = this.calculateInsights(contributions, summary, taxableData);

            console.log('✅ EPF passbook parsing completed successfully');
            return {
                success: true, memberInfo, contributions, summary, taxableData, insights,
                metadata: {
                    parsedAt: new Date().toISOString(),
                    totalRecords: contributions.length,
                    pdfType: 'EPF Passbook',
                    printedOn: this.extractPrintDate(text) || 'Unknown'
                }
            };
        } catch (error) {
            console.error('❌ Parsing failed:', error.message);
            throw error;
        }
    }
}

module.exports = new EPFPassbookParser();