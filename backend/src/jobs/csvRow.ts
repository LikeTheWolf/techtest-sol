export type ParsedCsvRow = {
  name: string;
  email: string;
};

export function parseCsvRow(row: unknown): ParsedCsvRow {
  const source = row && typeof row === "object" ? (row as Record<string, unknown>) : {};

  return {
    name: String(source.name ?? "").trim(),
    email: String(source.email ?? "").trim(),
  };
}
