"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TablePaginationProps {
  page: number;
  rowsPerPage: number;
  rowsPerPageOptions: number[];
  count: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
}

/** Equivalente al `TablePagination` de MUI usado en el legacy. */
export function TablePagination({
  page,
  rowsPerPage,
  rowsPerPageOptions,
  count,
  onPageChange,
  onRowsPerPageChange,
}: TablePaginationProps) {
  const from = count === 0 ? 0 : page * rowsPerPage + 1;
  const to = Math.min(count, (page + 1) * rowsPerPage);

  return (
    <div className="flex flex-wrap items-center justify-end gap-4 px-2 py-3 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>Filas por página</span>
        <Select
          value={String(rowsPerPage)}
          onValueChange={(v: string | null) => v && onRowsPerPageChange(Number(v))}
        >
          <SelectTrigger className="h-7 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {rowsPerPageOptions.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <span>
        {from}–{to} de {count}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={to >= count}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
