import type { LibraryRegion, LibrarySpecialization } from "@/lib/types";

export type EmployeeImportRow = {
  rowNumber?: number;
  employee_id: string;
  email: string;
  full_name: string;
  specialization: string;
  home_region: string;
};

export type ParsedImportRow = EmployeeImportRow & {
  rowNumber: number;
};

const HEADER_ALIASES: Record<
  Exclude<keyof EmployeeImportRow, "rowNumber">,
  string[]
> = {
  employee_id: ["dswd employee id", "employee id", "employee_id", "id"],
  email: ["official email address", "email address", "email", "official email"],
  full_name: ["full name", "name", "employee name"],
  specialization: ["specialization", "role", "position"],
  home_region: ["home region", "region", "assigned region"],
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\*/g, "").replace(/\s+/g, " ");
}

function cellValue(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

export function parseFullName(fullName: string): {
  first_name: string;
  last_name: string;
  middle_name: string | null;
} {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { first_name: "Employee", last_name: "User", middle_name: null };
  }

  if (trimmed.includes(",")) {
    const [lastPart, rest] = trimmed.split(",").map((s) => s.trim());
    const restParts = rest.split(/\s+/).filter(Boolean);
    return {
      first_name: restParts[0] || "Employee",
      middle_name: restParts.length > 1 ? restParts.slice(1).join(" ") : null,
      last_name: lastPart || "User",
    };
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: parts[0], middle_name: null };
  }
  if (parts.length === 2) {
    return { first_name: parts[0], last_name: parts[1], middle_name: null };
  }

  return {
    first_name: parts[0],
    last_name: parts[parts.length - 1],
    middle_name: parts.slice(1, -1).join(" ") || null,
  };
}

function mapHeaders(headers: string[]): Partial<Record<Exclude<keyof EmployeeImportRow, "rowNumber">, number>> {
  const mapping: Partial<Record<Exclude<keyof EmployeeImportRow, "rowNumber">, number>> = {};

  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [
      Exclude<keyof EmployeeImportRow, "rowNumber">,
      string[],
    ][]) {
      if (aliases.some((alias) => normalized === alias || normalized.includes(alias))) {
        if (mapping[field] === undefined) {
          mapping[field] = index;
        }
      }
    }
  });

  return mapping;
}

export function parseImportSheetRows(rows: unknown[][]): ParsedImportRow[] {
  if (rows.length < 2) return [];

  const headerRowIndex = rows.findIndex((row) =>
    row.some((cell) => cellValue(cell).length > 0)
  );
  if (headerRowIndex === -1) return [];

  const headers = (rows[headerRowIndex] ?? []).map(cellValue);
  const columnMap = mapHeaders(headers);

  if (columnMap.employee_id === undefined) {
    throw new Error(
      'Missing required column "DSWD Employee ID". Use the import template headers.'
    );
  }

  const parsed: ParsedImportRow[] = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const get = (field: Exclude<keyof EmployeeImportRow, "rowNumber">) => {
      const index = columnMap[field];
      return index === undefined ? "" : cellValue(row[index]);
    };

    const employee_id = get("employee_id");
    const email = get("email");
    const full_name = get("full_name");
    const specialization = get("specialization");
    const home_region = get("home_region");

    if (!employee_id && !email && !full_name) continue;

    parsed.push({
      rowNumber: i + 1,
      employee_id,
      email,
      full_name,
      specialization,
      home_region,
    });
  }

  return parsed;
}

export function matchSpecialization(
  value: string,
  specializations: LibrarySpecialization[]
): LibrarySpecialization | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;

  return (
    specializations.find((s) => s.name.toLowerCase() === v) ??
    specializations.find((s) => s.name.toLowerCase().includes(v)) ??
    specializations.find((s) => v.includes(s.name.toLowerCase())) ??
    null
  );
}

export function matchRegion(
  value: string,
  regions: LibraryRegion[]
): LibraryRegion | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;

  return (
    regions.find((r) => r.code.toLowerCase() === v) ??
    regions.find((r) => r.name.toLowerCase() === v) ??
    regions.find((r) => r.name.toLowerCase().includes(v)) ??
    regions.find((r) => v.includes(r.code.toLowerCase())) ??
    null
  );
}

export function buildImportTemplateCsv(): string {
  const headers = [
    "DSWD Employee ID *",
    "Official Email Address",
    "Full Name",
    "Specialization",
    "Home Region",
  ];
  const sample = [
    "16-11661",
    "maria.santos@dswd.gov.ph",
    "Santos, Maria Cruz",
    "Social Worker",
    "Region XIII",
  ];
  return [headers, sample].map((row) => row.map((c) => `"${c}"`).join(",")).join("\r\n");
}

export function downloadImportCredentialsCsv(
  credentials: { employee_id: string; email: string; password: string; full_name: string }[]
) {
  const rows = [
    ["DSWD Employee ID", "Official Email Address", "Full Name", "Generated Password"],
    ...credentials.map((c) => [c.employee_id, c.email, c.full_name, c.password]),
  ];
  const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `dswd-imported-credentials-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadImportTemplate() {
  const csv = buildImportTemplateCsv();
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "qrt-employee-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}
