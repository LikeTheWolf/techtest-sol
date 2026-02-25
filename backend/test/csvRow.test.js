const { parseCsvRow } = require("../dist/jobs/csvRow");

describe("CSV row parsing", () => {
  test("trims name and email", () => {
    const parsed = parseCsvRow({ name: " Jane Smith ", email: " jane@example.com " });

    expect(parsed).toEqual({
      name: "Jane Smith",
      email: "jane@example.com",
    });
  });

  test("returns empty strings when fields are missing", () => {
    const parsed = parseCsvRow({});

    expect(parsed).toEqual({
      name: "",
      email: "",
    });
  });
});
