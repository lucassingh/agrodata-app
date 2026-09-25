import * as XLSX from "xlsx";

/** Día de calendario (YYYY-MM-DD). Se escribe como fecha de Excel, sin hora. */
export interface CalendarDay {
  day: string;
}

export type Cell = string | number | boolean | CalendarDay | null;

export interface Sheet {
  name: string;
  rows: Record<string, Cell>[];
  /** Encabezados en orden; sirven también cuando no hay filas. */
  columns: string[];
}

function isCalendarDay(value: Cell | undefined): value is CalendarDay {
  return typeof value === "object" && value !== null && "day" in value;
}

/** Número de serie de Excel para un día (días desde el 30/12/1899). Se calcula a
 *  mano: el conversor de fechas de SheetJS corre el día según el huso del servidor. */
function excelSerial(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  return (Date.UTC(year!, month! - 1, date!) - Date.UTC(1899, 11, 30)) / 86_400_000;
}

/** Ancho de columna aproximado según el contenido, con tope. */
function columnWidths(sheet: Sheet) {
  return sheet.columns.map((column) => {
    const longest = sheet.rows.reduce((max, row) => {
      const value = row[column];
      const length = isCalendarDay(value) ? 10 : value === null || value === undefined ? 0 : String(value).length;
      return Math.max(max, length);
    }, column.length);
    return { wch: Math.min(Math.max(longest + 2, 10), 60) };
  });
}

/** Arma un .xlsx con una hoja por entrada. Los días salen como fechas de Excel. */
export function buildWorkbook(sheets: Sheet[]): Buffer {
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const rows = sheet.rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, isCalendarDay(value) ? excelSerial(value.day) : value]),
      ),
    );
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: sheet.columns });

    sheet.rows.forEach((row, rowIndex) => {
      sheet.columns.forEach((column, columnIndex) => {
        if (!isCalendarDay(row[column])) return;
        const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex + 1, c: columnIndex })];
        if (cell) cell.z = "dd/mm/yyyy";
      });
    });

    worksheet["!cols"] = columnWidths(sheet);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/** Campos de solo fecha (gastos, vencimientos): se guardan a medianoche UTC o al
 *  mediodía de Argentina; en los dos casos el día UTC es el correcto. */
export function dateOnly(date: Date): CalendarDay {
  return { day: date.toISOString().slice(0, 10) };
}

/** Momentos reales (movimientos, registros): el día en Argentina. */
export function argentinaDay(date: Date): CalendarDay {
  return { day: new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(date) };
}
