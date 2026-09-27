import {
  GoogleSheetFile,
  PivotTableCell,
  PivotTableData,
  PivotTableRow,
  SavingsMetrics,
  AccountEarningsItem,
  OutgoingItem,
  OutgoingsData,
} from '../types/savings';

const PALETTE = [
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#14b8a6', // teal
  '#6366f1', // indigo
];

// Helper to convert column index (0-based) to letter (0 -> A, 1 -> B, 26 -> AA)
export const colIndexToLetter = (colIndex: number): string => {
  let letter = '';
  let temp = colIndex;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

// Search Google Drive for spreadsheets named 'Savings'
export const searchSavingsSpreadsheet = async (token: string): Promise<GoogleSheetFile[]> => {
  const query = encodeURIComponent("name = 'Savings' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Drive API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return (data.files || []) as GoogleSheetFile[];
};

// List recent spreadsheets in user's Drive for switching/selection
export const listRecentSpreadsheets = async (token: string): Promise<GoogleSheetFile[]> => {
  const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=15`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Drive API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return (data.files || []) as GoogleSheetFile[];
};

// Inspect spreadsheet tabs and metadata
export const getSpreadsheetMetadata = async (
  token: string,
  spreadsheetId: string,
): Promise<{ title: string; sheetNames: string[] }> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Sheets API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const title = data.properties?.title || 'Savings';
  const sheetNames = (data.sheets || []).map((s: any) => s.properties?.title as string);
  return { title, sheetNames };
};

// Clean currency / numerical strings: e.g. "$ 1,250.50" or "(500.00)" -> 1250.5 or -500
export const parseCleanNumber = (val: string): number | null => {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  // Handle accounting format (1,234.56) -> -1234.56
  const isNegative = trimmed.startsWith('(') && trimmed.endsWith(')');
  const sanitized = trimmed
    .replace(/[$,€£¥\s()]/g, '')
    .replace(/%/g, '');

  if (!sanitized || isNaN(Number(sanitized))) {
    return null;
  }

  const num = parseFloat(sanitized);
  return isNegative ? -num : num;
};

// Detect currency symbol from formatted string
export const extractCurrencySymbol = (sample: string): string => {
  if (sample.includes('$')) return '$';
  if (sample.includes('€')) return '€';
  if (sample.includes('£')) return '£';
  if (sample.includes('¥')) return '¥';
  if (sample.includes('₹')) return '₹';
  return '$';
};


// Detect account type based on name and cells
export const detectAccountType = (accountName: string, rowCells?: PivotTableCell[]): string => {
  const lower = accountName.toLowerCase();
  if (lower.includes('isa')) return 'Cash ISA';
  if (lower.includes('regular') || lower.includes('reg saver') || (lower.includes('digital') && lower.includes('saver'))) {
    return 'Regular Saver';
  }
  if (lower.includes('xmas') || lower.includes('christmas')) return 'Xmas Saver';
  if (lower.includes('notice') || lower.includes('fixed') || lower.includes('bond') || lower.includes('term')) {
    return 'Fixed / Notice';
  }
  if (lower.includes('flex') || lower.includes('easy') || lower.includes('instant')) return 'Easy Access';
  if (lower.includes('bs') || lower.includes('building society')) return 'Building Society';

  if (rowCells) {
    for (const c of rowCells) {
      const val = c.rawValue.toLowerCase();
      if (val.includes('isa')) return 'Cash ISA';
      if (val.includes('regular')) return 'Regular Saver';
      if (val.includes('notice')) return 'Notice Account';
    }
  }
  return 'Standard Savings';
};

// Parse raw 2D sheet values into structured PivotTableData
export const parsePivotTable = (
  rawValues: string[][],
  spreadsheetId: string,
  spreadsheetTitle: string,
  sheetName: string,
  appliedRange?: string,
): PivotTableData => {
  if (!rawValues || rawValues.length === 0) {
    throw new Error(`The '${sheetName}' tab is empty.`);
  }

  // Find header row (the first row with at least 2 non-empty values, usually row 0 or 1)
  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(5, rawValues.length); r++) {
    const row = rawValues[r] || [];
    const nonEmpties = row.filter((c) => c && c.trim() !== '');
    if (nonEmpties.length >= 2) {
      headerRowIndex = r;
      break;
    }
  }

  // Standardize row lengths to max columns
  const maxCols = Math.max(...rawValues.map((r) => r.length), 1);
  const normalizedRows = rawValues.map((row) => {
    const filled = [...row];
    while (filled.length < maxCols) filled.push('');
    return filled;
  });

  const headerRow = normalizedRows[headerRowIndex] || [];
  const headers = headerRow.map((h, i) => (h && h.trim()) || (i === 0 ? 'Account / Category' : `Column ${colIndexToLetter(i)}`));

  let detectedCurrency = '$';
  const parsedRows: PivotTableRow[] = [];
  let grandTotalRow: PivotTableRow | undefined;
  let grandTotalColIndex: number | undefined;

  // Check if any column is labeled "Total" or "Grand Total"
  headers.forEach((h, idx) => {
    const lower = h.toLowerCase();
    if (lower.includes('grand total') || lower === 'total' || lower.includes('sum')) {
      grandTotalColIndex = idx;
    }
  });

  // Process data rows
  for (let r = headerRowIndex + 1; r < normalizedRows.length; r++) {
    const rawRow = normalizedRows[r];
    const firstCell = (rawRow[0] || '').trim();
    
    // Skip completely empty spacer rows
    if (rawRow.every((c) => !c || c.trim() === '')) {
      continue;
    }

    const isTotalRow =
      firstCell.toLowerCase().includes('total') ||
      firstCell.toLowerCase().includes('grand total') ||
      firstCell.toLowerCase().includes('sum');

    const cells: PivotTableCell[] = rawRow.map((val, colIdx) => {
      const cellCoord = `${colIndexToLetter(colIdx)}${r + 1}`;
      const numVal = parseCleanNumber(val);
      if (detectedCurrency === '$' && typeof val === 'string') {
        const detected = extractCurrencySymbol(val);
        if (detected !== '$') detectedCurrency = detected;
      }
      return {
        colIndex: colIdx,
        sheetCell: cellCoord,
        rawValue: val,
        numericValue: numVal,
        formattedValue: val || '-',
        isHeader: false,
        isTotal: isTotalRow || colIdx === grandTotalColIndex,
      };
    });

    // Find row total value (either from total column or max/sum)
    let rowTotal: number | undefined;
    if (grandTotalColIndex !== undefined && cells[grandTotalColIndex]?.numericValue !== null) {
      rowTotal = cells[grandTotalColIndex]?.numericValue ?? undefined;
    } else {
      // Sum all numeric cells in row after label
      const numbers = cells.slice(1).map((c) => c.numericValue).filter((n): n is number => n !== null);
      if (numbers.length > 0) {
        rowTotal = numbers.reduce((a, b) => a + b, 0);
      }
    }

    const rowObj: PivotTableRow = {
      rowIndex: r,
      label: firstCell || `Row ${r + 1}`,
      cells,
      totalValue: rowTotal,
      isTotalRow,
    };

    if (isTotalRow) {
      grandTotalRow = rowObj;
    } else {
      parsedRows.push(rowObj);
    }
  }

  // Calculate overall savings total
  let overallTotal = 0;
  if (grandTotalRow && grandTotalRow.totalValue !== undefined) {
    overallTotal = grandTotalRow.totalValue;
  } else if (grandTotalRow) {
    const numbers = grandTotalRow.cells.slice(1).map((c) => c.numericValue).filter((n): n is number => n !== null);
    overallTotal = numbers.length > 0 ? (numbers[numbers.length - 1] ?? numbers.reduce((a, b) => a + b, 0)) : 0;
  } else {
    overallTotal = parsedRows.reduce((acc, row) => acc + (row.totalValue || 0), 0);
  }

  // REQUIREMENT: Values on 'Asset & Account Allocation' box must ONLY come from Column B (index 1)
  const colBTotal = parsedRows
    .filter((r) => !r.isTotalRow)
    .reduce((sum, r) => sum + (r.cells[1]?.numericValue || 0), 0);

  const categoryBreakdown = parsedRows
    .filter((r) => !r.isTotalRow && r.cells[1]?.numericValue !== null && (r.cells[1]?.numericValue || 0) > 0)
    .map((r, i) => {
      const amt = r.cells[1]?.numericValue || 0;
      return {
        category: r.label,
        amount: amt,
        percentage: colBTotal > 0 ? (amt / colBTotal) * 100 : 0,
        color: PALETTE[i % PALETTE.length],
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // Available candidate columns for Earnings chart
  const availableEarningsColumns: { colIndex: number; name: string }[] = [];
  for (let c = 1; c < headers.length; c++) {
    // Check if column has any numbers in non-total rows
    const hasNumbers = parsedRows.some((r) => !r.isTotalRow && r.cells[c]?.numericValue !== null);
    if (hasNumbers) {
      availableEarningsColumns.push({ colIndex: c, name: headers[c] || `Column ${colIndexToLetter(c)}` });
    }
  }

  // Identify preferred earnings column (check for "interest", "earning", "return", "projected", "annual")
  let preferredEarningsColIdx = availableEarningsColumns.length > 0 ? availableEarningsColumns[0].colIndex : 1;
  const keywordCol = availableEarningsColumns.find((col) => {
    const l = col.name.toLowerCase();
    return l.includes('interest') || l.includes('earning') || l.includes('projected') || l.includes('yield') || l.includes('return');
  });

  if (keywordCol) {
    preferredEarningsColIdx = keywordCol.colIndex;
  } else if (availableEarningsColumns.length > 1) {
    // Default to last numeric column if multiple columns exist and none matched keyword
    preferredEarningsColIdx = availableEarningsColumns[availableEarningsColumns.length - 1].colIndex;
  }

  // Generate account earnings items for the chart
  const accountEarnings: AccountEarningsItem[] = parsedRows
    .filter((r) => !r.isTotalRow)
    .map((r) => {
      const cell = r.cells[preferredEarningsColIdx];
      const val = cell?.numericValue || 0;
      return {
        accountName: r.label,
        accountType: detectAccountType(r.label, r.cells),
        earnings: val,
        formattedEarnings:
          cell?.formattedValue && cell.formattedValue !== '-'
            ? cell.formattedValue
            : new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: detectedCurrency === '€' ? 'EUR' : detectedCurrency === '£' ? 'GBP' : 'USD',
                minimumFractionDigits: 2,
              }).format(val),
        columnName: headers[preferredEarningsColIdx] || 'Earnings',
        balance: r.cells[1]?.numericValue || undefined,
        rowIndex: r.rowIndex,
      };
    });

  // Timeline (e.g. Month by month if columns represent months/dates)
  const timelineColumns = headers
    .map((h, colIdx) => ({ header: h, colIdx }))
    .filter(({ header, colIdx }) => {
      if (colIdx === 0) return false;
      if (colIdx === grandTotalColIndex) return false;
      const lower = header.toLowerCase();
      return !lower.includes('total');
    });

  const monthlyTimeline = timelineColumns.map(({ header, colIdx }) => {
    let colTotal = 0;
    if (grandTotalRow && grandTotalRow.cells[colIdx]?.numericValue !== null) {
      colTotal = grandTotalRow.cells[colIdx]?.numericValue || 0;
    } else {
      colTotal = parsedRows.reduce((acc, r) => acc + (r.cells[colIdx]?.numericValue || 0), 0);
    }
    return {
      label: header,
      amount: colTotal,
    };
  });

  const topCategory = categoryBreakdown.length > 0 ? {
    name: categoryBreakdown[0].category,
    amount: categoryBreakdown[0].amount,
  } : null;

  const metrics: SavingsMetrics = {
    totalSavings: overallTotal,
    columnBTotal: colBTotal,
    currencySymbol: detectedCurrency,
    categoryBreakdown,
    accountEarnings,
    availableEarningsColumns,
    selectedEarningsColIndex: preferredEarningsColIdx,
    monthlyTimeline,
    topCategory,
    rowCount: parsedRows.length,
    colCount: headers.length,
  };

  const formattedTotalSavings = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: detectedCurrency === '€' ? 'EUR' : detectedCurrency === '£' ? 'GBP' : 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(overallTotal);

  const finalRange = appliedRange || `${sheetName}!A1:${colIndexToLetter(maxCols - 1)}${normalizedRows.length}`;

  return {
    spreadsheetId,
    spreadsheetTitle,
    sheetName,
    range: finalRange,
    rawValues,
    headers,
    rows: parsedRows,
    grandTotalRow,
    grandTotalColumnIndex: grandTotalColIndex,
    totalSavingsValue: overallTotal,
    formattedTotalSavings,
    currencySymbol: detectedCurrency,
    metrics,
    lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
};

// Fetch PivotTable data from Google Sheets (supports custom range)
export const fetchPivotTableData = async (
  token: string,
  spreadsheetId: string,
  preferredSheetName = 'PivotTable',
  customRange?: string,
): Promise<PivotTableData> => {
  // First, verify tab exists or find similar
  const metadata = await getSpreadsheetMetadata(token, spreadsheetId);
  let targetSheet = metadata.sheetNames.find(
    (name) => name.toLowerCase() === preferredSheetName.toLowerCase() || name.toLowerCase() === 'pivottable',
  );

  if (!targetSheet) {
    targetSheet = metadata.sheetNames.find((name) => name.toLowerCase().includes('pivot'));
  }

  if (!targetSheet) {
    if (metadata.sheetNames.length === 1) {
      targetSheet = metadata.sheetNames[0];
    } else {
      throw new Error(
        `Tab '${preferredSheetName}' not found in spreadsheet '${metadata.title}'. Available tabs: ${metadata.sheetNames.join(', ')}`,
      );
    }
  }

  let rangeToFetch = customRange ? customRange.trim() : `'${targetSheet}'!A1:ZZ300`;
  if (customRange && !customRange.includes('!')) {
    rangeToFetch = `'${targetSheet}'!${customRange.trim()}`;
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeToFetch)}?valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Sheets API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const rawValues: string[][] = data.values || [];

  if (rawValues.length === 0) {
    throw new Error(`The range '${rangeToFetch}' contains no data.`);
  }

  return parsePivotTable(rawValues, spreadsheetId, metadata.title, targetSheet, rangeToFetch);
};

// Update a specific cell in the spreadsheet
export const updateSpreadsheetCell = async (
  token: string,
  spreadsheetId: string,
  sheetName: string,
  cellCoordinate: string,
  newValue: string,
): Promise<{ updatedCells: number; updatedRange: string }> => {
  const range = `'${sheetName}'!${cellCoordinate}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [[newValue]],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to update cell ${cellCoordinate} (${res.status}): ${errorText}`);
  }

  const result = await res.json();
  return {
    updatedCells: result.updatedCells || 1,
    updatedRange: result.updatedRange || range,
  };
};

// Create a template 'Savings' spreadsheet if the user does not have one yet
export const createDefaultSavingsSpreadsheet = async (
  token: string,
): Promise<{ id: string; name: string; webViewLink: string }> => {
  const samplePivotValues = [
    ['Account', 'Balance', 'Total_Interest', 'AER (%)', 'Account Type'],
    ['Coop', '£3,000.00', '£120.00', '4.00%', 'Standard'],
    ['First Direct', '£3,500.00', '£140.00', '4.00%', 'Standard'],
    ['Lloyds Regular Saver', '£2,000.00', '£130.00', '6.50%', 'Regular Saver'],
    ['Monmouthshire BS', '£4,000.00', '£200.00', '5.00%', 'Building Society'],
    ['Nationwide Flex Regular', '£1,500.00', '£90.00', '6.00%', 'Regular Saver'],
    ['Natwest Digital regular saver', '£3,800.00', '£266.00', '7.00%', 'Regular Saver'],
    ['Principality 12 Xmas', '£1,000.00', '£70.00', '7.00%', 'Xmas Saver'],
    ['RBS Digital regular saver', '£3,800.00', '£266.00', '7.00%', 'Regular Saver'],
    ['Zopa', '£800.00', '£38.00', '4.75%', 'Easy Access'],
    ['eToro (Cash ISA)', '£22,000.00', '£1,210.00', '5.50%', 'Cash ISA'],
    ['Grand Total', '£45,400.00', '£2,530.00', '5.57%', 'Total'],
  ];

  const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: 'Savings',
      },
      sheets: [
        {
          properties: {
            title: 'PivotTable',
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Failed to create spreadsheet (${createRes.status}): ${errorText}`);
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;
  const webViewLink = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Populate PivotTable tab
  const populateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'PivotTable'!A1:F8?valueInputOption=USER_ENTERED`;
  await fetch(populateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: samplePivotValues,
    }),
  });

  return {
    id: spreadsheetId,
    name: 'Savings',
    webViewLink,
  };
};

// Add 'PivotTable' tab to an existing spreadsheet if missing
export const addPivotTableTab = async (
  token: string,
  spreadsheetId: string,
): Promise<void> => {
  const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const addSheetRes = await fetch(batchUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: {
              title: 'PivotTable',
            },
          },
        },
      ],
    }),
  });

  if (!addSheetRes.ok) {
    const err = await addSheetRes.text();
    throw new Error(`Could not add 'PivotTable' tab: ${err}`);
  }

  // Populate with starting structure
  const samplePivotValues = [
    ['Account', 'Balance', 'Total_Interest', 'AER (%)', 'Account Type'],
    ['Coop', '£3,000.00', '£120.00', '4.00%', 'Standard'],
    ['First Direct', '£3,500.00', '£140.00', '4.00%', 'Standard'],
    ['Lloyds Regular Saver', '£2,000.00', '£130.00', '6.50%', 'Regular Saver'],
    ['Monmouthshire BS', '£4,000.00', '£200.00', '5.00%', 'Building Society'],
    ['Nationwide Flex Regular', '£1,500.00', '£90.00', '6.00%', 'Regular Saver'],
    ['Natwest Digital regular saver', '£3,800.00', '£266.00', '7.00%', 'Regular Saver'],
    ['Principality 12 Xmas', '£1,000.00', '£70.00', '7.00%', 'Xmas Saver'],
    ['RBS Digital regular saver', '£3,800.00', '£266.00', '7.00%', 'Regular Saver'],
    ['Zopa', '£800.00', '£38.00', '4.75%', 'Easy Access'],
    ['eToro (Cash ISA)', '£22,000.00', '£1,210.00', '5.50%', 'Cash ISA'],
    ['Grand Total', '£45,400.00', '£2,530.00', '5.57%', 'Total'],
  ];

  const populateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'PivotTable'!A1:E12?valueInputOption=USER_ENTERED`;
  await fetch(populateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: samplePivotValues,
    }),
  });
};

// Parse UK or ISO dates (e.g. "26/10/2026", "2026-10-26")
export const parseOutgoingDate = (dateStr?: string | null): Date | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (
    !trimmed ||
    trimmed.toLowerCase().includes('update') ||
    trimmed.toLowerCase().includes('tbd') ||
    trimmed.toLowerCase().includes('n/a')
  ) {
    return null;
  }

  // DD/MM/YYYY or DD-MM-YYYY format
  const ukMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ukMatch) {
    const day = parseInt(ukMatch[1], 10);
    const month = parseInt(ukMatch[2], 10) - 1;
    const year = parseInt(ukMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // YYYY-MM-DD format
  const isoMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  const standardParsed = new Date(trimmed);
  return isNaN(standardParsed.getTime()) ? null : standardParsed;
};

// Parse raw 2D values from 'Outgoings' tab
export const parseOutgoingsSheet = (
  rawValues: string[][],
  spreadsheetId: string,
  sheetName: string,
  defaultCurrency = '£',
): OutgoingsData => {
  if (!rawValues || rawValues.length === 0) {
    return {
      spreadsheetId,
      sheetName,
      headers: [],
      items: [],
      totalMonthlyCost: 0,
      formattedTotalMonthlyCost: `${defaultCurrency}0.00`,
      totalUntilSettled: 0,
      formattedTotalUntilSettled: `${defaultCurrency}0.00`,
      ongoingMonthlyCost: 0,
      untilSettledMonthlyCost: 0,
      currencySymbol: defaultCurrency,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }

  // Header detection (find first row with at least 2 non-empty columns)
  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(4, rawValues.length); r++) {
    const row = rawValues[r] || [];
    const nonEmpties = row.filter((c) => c && c.trim() !== '');
    if (nonEmpties.length >= 2) {
      headerRowIndex = r;
      break;
    }
  }

  const headerRow = rawValues[headerRowIndex] || [];
  const headers = headerRow.map((h, i) => (h && h.trim()) || `Col ${colIndexToLetter(i)}`);

  // Detect column indices based on header names
  let nameColIdx = 0;
  let costColIdx = 1;
  let untilSettledColIdx = 2;
  let typeColIdx = 3;
  let freqColIdx = 4;
  let methodColIdx = 5;
  let nextDateColIdx = 6;
  let instalmentsColIdx = 7;

  headers.forEach((h, idx) => {
    const lower = h.toLowerCase().trim();
    if (lower === 'name' || lower.includes('expense') || lower.includes('outgoing') || lower.includes('description')) {
      nameColIdx = idx;
    } else if (lower.includes('cost') || lower === 'cost/month' || lower.includes('per month')) {
      costColIdx = idx;
    } else if (
      lower.includes('settled') ||
      lower.includes('amount until') ||
      lower.includes('ammount until') ||
      lower.includes('balance')
    ) {
      untilSettledColIdx = idx;
    } else if (lower === 'type' || lower.includes('status')) {
      typeColIdx = idx;
    } else if (lower.includes('freq') || lower.includes('cadence')) {
      freqColIdx = idx;
    } else if (
      lower.includes('method') ||
      lower.includes('channel') ||
      lower.includes('payment') && !lower.includes('date')
    ) {
      methodColIdx = idx;
    } else if (lower.includes('date') || lower.includes('next payment') || lower.includes('due')) {
      nextDateColIdx = idx;
    } else if (
      lower.includes('instalment') ||
      lower.includes('installment') ||
      lower.includes('remaining')
    ) {
      instalmentsColIdx = idx;
    }
  });

  let currencySymbol = defaultCurrency;
  const items: OutgoingItem[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let r = headerRowIndex + 1; r < rawValues.length; r++) {
    const row = rawValues[r] || [];
    const name = (row[nameColIdx] || '').trim();

    // Skip blank rows or total rows
    if (!name || name.toLowerCase().includes('total') || name.toLowerCase().includes('sum')) {
      continue;
    }

    const rawCost = row[costColIdx] || '';
    const cost = parseCleanNumber(rawCost) || 0;

    // Detect currency symbol if present
    if (typeof rawCost === 'string' && rawCost.trim()) {
      const sym = extractCurrencySymbol(rawCost);
      if (sym !== '$' || defaultCurrency === '$') {
        currencySymbol = sym;
      }
    }

    const rawUntilSettled = row[untilSettledColIdx] || '';
    const amountUntilSettled = parseCleanNumber(rawUntilSettled);

    const type = (row[typeColIdx] || '').trim() || (amountUntilSettled !== null ? 'Until settled' : 'Ongoing');
    const frequency = (row[freqColIdx] || '').trim() || 'Monthly';
    const paymentMethod = (row[methodColIdx] || '').trim() || 'Direct Debit';
    const nextPaymentDate = (row[nextDateColIdx] || '').trim();

    const parsedDate = parseOutgoingDate(nextPaymentDate);
    let daysUntilDue: number | null = null;
    if (parsedDate) {
      const diffTime = parsedDate.getTime() - today.getTime();
      daysUntilDue = Math.round(diffTime / (1000 * 60 * 60 * 24));
    }

    const rawInstalments = row[instalmentsColIdx] || '';
    const parsedInstalments = parseInt(rawInstalments, 10);
    const remainingInstalments = isNaN(parsedInstalments) ? null : parsedInstalments;

    const formattedCost = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currencySymbol === '€' ? 'EUR' : currencySymbol === '$' ? 'USD' : 'GBP',
      minimumFractionDigits: 2,
    }).format(cost);

    const formattedUntilSettled =
      amountUntilSettled !== null
        ? new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: currencySymbol === '€' ? 'EUR' : currencySymbol === '$' ? 'USD' : 'GBP',
            minimumFractionDigits: 2,
          }).format(amountUntilSettled)
        : null;

    items.push({
      rowIndex: r + 1, // 1-based row index for Google Sheets
      name,
      costPerMonth: cost,
      formattedCost,
      amountUntilSettled,
      formattedUntilSettled,
      amountUntilSettledRaw: rawUntilSettled.trim(),
      type,
      frequency,
      paymentMethod,
      nextPaymentDate,
      parsedNextDate: parsedDate,
      daysUntilDue,
      remainingInstalments,
      rawRow: row,
    });
  }

  // Calculate totals
  const totalMonthlyCost = items.reduce((sum, item) => {
    // If frequency is yearly, convert to monthly equivalent or treat as monthly
    if (item.frequency.toLowerCase().includes('year')) {
      return sum + item.costPerMonth / 12;
    }
    return sum + item.costPerMonth;
  }, 0);

  const ongoingMonthlyCost = items
    .filter((i) => i.type.toLowerCase().includes('ongoing'))
    .reduce((sum, i) => sum + (i.frequency.toLowerCase().includes('year') ? i.costPerMonth / 12 : i.costPerMonth), 0);

  const untilSettledMonthlyCost = items
    .filter((i) => i.type.toLowerCase().includes('settled'))
    .reduce((sum, i) => sum + i.costPerMonth, 0);

  const totalUntilSettled = items.reduce((sum, item) => sum + (item.amountUntilSettled || 0), 0);

  const fmt = (val: number) =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currencySymbol === '€' ? 'EUR' : currencySymbol === '$' ? 'USD' : 'GBP',
      minimumFractionDigits: 2,
    }).format(val);

  return {
    spreadsheetId,
    sheetName,
    headers,
    items,
    totalMonthlyCost,
    formattedTotalMonthlyCost: fmt(totalMonthlyCost),
    totalUntilSettled,
    formattedTotalUntilSettled: fmt(totalUntilSettled),
    ongoingMonthlyCost,
    untilSettledMonthlyCost,
    currencySymbol,
    lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
};

// Fetch Outgoings data from Google Sheets
export const fetchOutgoingsData = async (
  token: string,
  spreadsheetId: string,
  preferredSheetName = 'Outgoings',
  currencySymbol = '£',
): Promise<OutgoingsData> => {
  // Check if Outgoings tab exists
  const metadata = await getSpreadsheetMetadata(token, spreadsheetId);
  const targetSheet = metadata.sheetNames.find(
    (name) =>
      name.toLowerCase() === preferredSheetName.toLowerCase() ||
      name.toLowerCase().includes('outgoing') ||
      name.toLowerCase().includes('expense') ||
      name.toLowerCase().includes('bill'),
  );

  if (!targetSheet) {
    throw new Error(
      `Tab '${preferredSheetName}' not found in spreadsheet '${metadata.title}'. Available tabs: ${metadata.sheetNames.join(', ')}`,
    );
  }

  const rangeToFetch = `'${targetSheet}'!A1:Z100`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeToFetch)}?valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Sheets API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const rawValues: string[][] = data.values || [];

  return parseOutgoingsSheet(rawValues, spreadsheetId, targetSheet, currencySymbol);
};
