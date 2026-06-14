"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { importEmployeesFromExcel } from "@/lib/actions/employee-import";
import {
  downloadImportCredentialsCsv,
  downloadImportTemplate,
  parseImportSheetRows,
  type ParsedImportRow,
} from "@/lib/employee-import";
import { toast } from "@/lib/toast";
import { Download, FileSpreadsheet, Upload, X } from "lucide-react";

export function EmployeeImportPanel() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<ParsedImportRow[]>([]);
  const [resultSummary, setResultSummary] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<
    { row: number; employee_id: string; message: string }[]
  >([]);

  function resetState() {
    setError(null);
    setFileName(null);
    setPreviewRows([]);
    setResultSummary(null);
    setImportErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function openPanel() {
    resetState();
    setIsOpen(true);
  }

  function closePanel() {
    setIsOpen(false);
    resetState();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResultSummary(null);
    setImportErrors([]);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        setError("The file has no worksheets.");
        setPreviewRows([]);
        return;
      }

      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
      const parsed = parseImportSheetRows(rows);

      if (!parsed.length) {
        setError("No employee rows found. Check your headers and data.");
      }

      setPreviewRows(parsed);
    } catch (err) {
      setPreviewRows([]);
      setError(err instanceof Error ? err.message : "Failed to read Excel file.");
    }
  }

  function handleImport() {
    if (!previewRows.length) {
      setError("Upload an Excel file with employee rows first.");
      return;
    }

    startTransition(async () => {
      setError(null);
      setResultSummary(null);
      setImportErrors([]);

      const result = await importEmployeesFromExcel(previewRows);

      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      const summary = `Imported ${result.imported} employee(s). Skipped ${result.skipped} row(s).`;
      setResultSummary(summary);
      toast.success(summary);
      setImportErrors(result.errors);

      if (result.credentials.length > 0) {
        downloadImportCredentialsCsv(result.credentials);
      }

      router.refresh();
    });
  }

  if (!isOpen) {
    return (
      <Button variant="outline" onClick={openPanel} className="gap-2">
        <FileSpreadsheet className="h-4 w-4" />
        Import from Excel
      </Button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={closePanel}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 p-5 border-b border-dswd-border">
          <div>
            <h2 className="text-lg font-bold text-dswd-navy">Import Employees from Excel</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Import basic details and auto-create portal accounts with generated passwords.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={closePanel} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Required columns</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p><strong className="text-foreground">DSWD Employee ID *</strong> — required</p>
              <p><strong className="text-foreground">Official Email Address</strong> — required for portal login</p>
              <p><strong className="text-foreground">Full Name</strong> — required (e.g. Santos, Maria Cruz)</p>
              <p><strong className="text-foreground">Specialization</strong> — must match library name</p>
              <p><strong className="text-foreground">Home Region</strong> — region name or code (e.g. Region XIII)</p>
              <p className="pt-2 text-xs">
                Other profile details (photo, team leader, deployment, etc.) can be completed by employees later.
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={downloadImportTemplate} className="gap-2">
              <Download className="h-4 w-4" />
              Download Template
            </Button>
            <div className="flex-1">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {fileName && (
            <p className="text-sm text-muted-foreground">
              Selected file: <span className="font-medium text-foreground">{fileName}</span>
              {previewRows.length > 0 && ` · ${previewRows.length} row(s) ready`}
            </p>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {resultSummary && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
              {resultSummary}
              {importErrors.length === 0
                ? " Generated passwords were downloaded as CSV."
                : " See skipped rows below. Credentials CSV downloaded for successful imports."}
            </div>
          )}

          {importErrors.length > 0 && (
            <div className="border border-amber-200 bg-amber-50 rounded-md p-4 space-y-2 max-h-40 overflow-y-auto">
              <p className="text-sm font-medium text-amber-900">Skipped rows</p>
              {importErrors.map((item, index) => (
                <p key={`${item.row}-${index}`} className="text-xs text-amber-800">
                  Row {item.row}
                  {item.employee_id ? ` (${item.employee_id})` : ""}: {item.message}
                </p>
              ))}
            </div>
          )}

          {previewRows.length > 0 && (
            <div className="border border-dswd-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-56">
                <table className="w-full text-xs">
                  <thead className="bg-dswd-light">
                    <tr>
                      <th className="text-left p-2">Employee ID</th>
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Full Name</th>
                      <th className="text-left p-2">Specialization</th>
                      <th className="text-left p-2">Home Region</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 10).map((row) => (
                      <tr key={row.rowNumber} className="border-t border-dswd-border">
                        <td className="p-2 font-mono">{row.employee_id || "—"}</td>
                        <td className="p-2">{row.email || "—"}</td>
                        <td className="p-2">{row.full_name || "—"}</td>
                        <td className="p-2">{row.specialization || "—"}</td>
                        <td className="p-2">{row.home_region || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewRows.length > 10 && (
                <p className="text-xs text-muted-foreground p-2 border-t border-dswd-border">
                  Showing first 10 of {previewRows.length} rows.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-dswd-border flex gap-2 justify-end">
          <Button variant="outline" onClick={closePanel} disabled={isPending}>
            Close
          </Button>
          <Button onClick={handleImport} disabled={isPending || previewRows.length === 0} className="gap-2">
            <Upload className="h-4 w-4" />
            {isPending ? "Importing..." : `Import ${previewRows.length} Employee(s)`}
          </Button>
        </div>
      </div>
    </div>
  );
}
