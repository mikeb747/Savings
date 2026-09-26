export interface GoogleSheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface PivotTableData {
  spreadsheetId: string;
  spreadsheetTitle: string;
  sheetName: string;
  range: string;
  rawValues: string[][];
  headers: string[];
  rows: PivotTableRow[];
  grandTotalRow?: PivotTableRow;
  grandTotalColumnIndex?: number;
  totalSavingsValue: number;
  formattedTotalSavings: string;
  currencySymbol: string;
  metrics: SavingsMetrics;
  lastUpdated: string;
}

export interface PivotTableRow {
  rowIndex: number; // 0-indexed in rawValues (or sheet row)
  label: string;
  cells: PivotTableCell[];
  totalValue?: number;
  isTotalRow: boolean;
}

export interface PivotTableCell {
  colIndex: number;
  sheetCell: string; // e.g. "B3"
  rawValue: string;
  numericValue: number | null;
  formattedValue: string;
  isHeader: boolean;
  isTotal: boolean;
}

export interface AccountEarningsItem {
  accountName: string;
  accountType: string;
  earnings: number;
  formattedEarnings: string;
  columnName: string;
  balance?: number;
  rowIndex: number;
}

export interface SavingsMetrics {
  totalSavings: number;
  columnBTotal: number;
  currencySymbol: string;
  categoryBreakdown: {
    category: string;
    amount: number;
    percentage: number;
    color: string;
  }[];
  accountEarnings: AccountEarningsItem[];
  availableEarningsColumns: {
    colIndex: number;
    name: string;
  }[];
  selectedEarningsColIndex: number;
  monthlyTimeline: {
    label: string;
    amount: number;
  }[];
  topCategory: {
    name: string;
    amount: number;
  } | null;
  rowCount: number;
  colCount: number;
}

export type AutoRefreshInterval = 0 | 10 | 30 | 60; // 0 = manual, in seconds
