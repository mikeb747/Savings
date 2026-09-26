import { GoogleSheetFile, PivotTableCell, PivotTableData, PivotTableRow, SavingsMetrics } from '../types/savings';

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

// Parse raw 2D sheet values into structured PivotTableData
export const parsePivotTable = (
  rawValues: string[][],
  spreadsheetId: string,
  spreadsheetTitle: string,
  sheetName: string,
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
  const headers = headerRow.map((h, i) => (h && h.trim()) || (i === 0 ? 'Category / Account' : `Column ${colIndexToLetter(i)}`));

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

  // Category breakdown metrics
  const categoryBreakdown = parsedRows
    .filter((r) => !r.isTotalRow && (r.totalValue !== undefined && r.totalValue > 0))
    .map((r, i) => {
      const amt = r.totalValue || 0;
      return {
        category: r.label,
        amount: amt,
        percentage: overallTotal > 0 ? (amt / overallTotal) * 100 : 0,
        color: PALETTE[i % PALETTE.length],
      };
    })
    .sort((a, b) => b.amount - a.amount);

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
    // If grandTotalRow exists, get its value for this column
    let colTotal = 0;
    if (grandTotalRow && grandTotalRow.cells[colIdx]?.numericValue !== null) {
      colTotal = grandTotalRow.cells[colIdx]?.numericValue || 0;
    } else {
      // Sum row values in this column
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
    currencySymbol: detectedCurrency,
    categoryBreakdown,
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

  return {
    spreadsheetId,
    spreadsheetTitle,
    sheetName,
    range: `${sheetName}!A1:${colIndexToLetter(maxCols - 1)}${normalizedRows.length}`,
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

// Fetch PivotTable data from Google Sheets
export const fetchPivotTableData = async (
  token: string,
  spreadsheetId: string,
  preferredSheetName = 'PivotTable',
): Promise<PivotTableData> => {
  // First, verify tab exists or find similar
  const metadata = await getSpreadsheetMetadata(token, spreadsheetId);
  let targetSheet = metadata.sheetNames.find(
    (name) => name.toLowerCase() === preferredSheetName.toLowerCase() || name.toLowerCase() === 'pivottable',
  );

  // If exact PivotTable is not found, check for any sheet with 'pivot' in name
  if (!targetSheet) {
    targetSheet = metadata.sheetNames.find((name) => name.toLowerCase().includes('pivot'));
  }

  // If still not found, check if there's only 1 sheet or pick first
  if (!targetSheet) {
    if (metadata.sheetNames.length === 1) {
      targetSheet = metadata.sheetNames[0];
    } else {
      throw new Error(
        `Tab '${preferredSheetName}' not found in spreadsheet '${metadata.title}'. Available tabs: ${metadata.sheetNames.join(', ')}`,
      );
    }
  }

  const range = `'${targetSheet}'!A1:ZZ300`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;

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
    throw new Error(`The '${targetSheet}' tab contains no data yet.`);
  }

  return parsePivotTable(rawValues, spreadsheetId, metadata.title, targetSheet);
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
    ['Category / Account', 'Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)', 'Total Saved'],
    ['Emergency Fund', '$3,500.00', '$3,500.00', '$1,500.00', '$1,500.00', '$10,000.00'],
    ['High-Yield Savings (4.5%)', '$2,400.00', '$2,600.00', '$2,800.00', '$3,200.00', '$11,000.00'],
    ['Index Funds (S&P 500)', '$4,000.00', '$4,200.00', '$4,500.00', '$5,300.00', '$18,000.00'],
    ['Retirement / Roth IRA', '$1,750.00', '$1,750.00', '$1,750.00', '$1,750.00', '$7,000.00'],
    ['House Down Payment', '$2,000.00', '$2,500.00', '$3,000.00', '$3,500.00', '$11,000.00'],
    ['Travel & Holiday Fund', '$1,200.00', '$1,500.00', '$1,000.00', '$800.00', '$4,500.00'],
    ['Grand Total', '$14,850.00', '$16,050.00', '$14,550.00', '$16,050.00', '$61,500.00'],
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
    ['Category / Account', 'Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)', 'Total Saved'],
    ['Emergency Fund', '$3,500.00', '$3,500.00', '$1,500.00', '$1,500.00', '$10,000.00'],
    ['High-Yield Savings (4.5%)', '$2,400.00', '$2,600.00', '$2,800.00', '$3,200.00', '$11,000.00'],
    ['Index Funds (S&P 500)', '$4,000.00', '$4,200.00', '$4,500.00', '$5,300.00', '$18,000.00'],
    ['Retirement / Roth IRA', '$1,750.00', '$1,750.00', '$1,750.00', '$1,750.00', '$7,000.00'],
    ['House Down Payment', '$2,000.00', '$2,500.00', '$3,000.00', '$3,500.00', '$11,000.00'],
    ['Grand Total', '$13,650.00', '$14,550.00', '$13,550.00', '$15,250.00', '$57,000.00'],
  ];

  const populateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'PivotTable'!A1:F7?valueInputOption=USER_ENTERED`;
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
