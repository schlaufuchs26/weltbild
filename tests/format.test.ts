import { describe, expect, test } from "bun:test";
import { formatValue, formatYear } from "../src/format";

describe("formatValue", () => {
  test("people in billions and millions", () => {
    expect(formatValue(2_493_092_852, "people")).toBe("2.49 billion");
    expect(formatValue(8_091_734_933, "people")).toBe("8.09 billion");
    expect(formatValue(24_000_000, "people")).toBe("24.0 million");
    expect(formatValue(9_500, "people")).toBe("9,500");
  });

  test("percent, years and ppm keep one decimal", () => {
    expect(formatValue(57.3536, "percent")).toBe("57.4 %");
    expect(formatValue(3.83, "percent")).toBe("3.8 %");
    expect(formatValue(46.3944, "years")).toBe("46.4 years");
    expect(formatValue(315.98, "ppm")).toBe("316 ppm");
  });

  test("temperature carries an explicit sign", () => {
    expect(formatValue(0.12, "celsius")).toBe("+0.12 \u00b0C");
    expect(formatValue(-0.31, "celsius")).toBe("\u22120.31 \u00b0C");
    expect(formatValue(0, "celsius")).toBe("0.00 \u00b0C");
  });

  test("energy is grouped, small shares keep three significant digits", () => {
    expect(formatValue(3666.1284, "kwh")).toBe("3,666 kWh");
    expect(formatValue(4.852, "children")).toBe("4.85");
    expect(formatValue(0.000532, "per100")).toBe("0.000532 per 100");
    expect(formatValue(109.8, "per100")).toBe("110 per 100");
    expect(formatValue(22.951145, "kg")).toBe("23.0 kg");
    expect(formatValue(24.7, "per1000")).toBe("24.7 per 1,000");
    expect(formatValue(828.4, "meters")).toBe("828 m");
  });

  test("zero does not divide by zero in sig()", () => {
    expect(formatValue(0, "per100")).toBe("0 per 100");
    expect(formatValue(0, "people")).toBe("0");
  });
});

describe("formatYear", () => {
  test("prints the year as an integer", () => {
    expect(formatYear(1974.4)).toBe("1974");
  });
});
