#!/usr/bin/env node

/**
 * Search Feature Integration Test Script
 * 
 * Tests the search API with various filter combinations
 * Usage: npm run test:search
 */

const API_URL = "http://0.0.0.0:3001/api/search";

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  try {
    await testFn();
    results.push({ name, passed: true, message: "✓" });
    console.log(`✓ ${name}`);
  } catch (error) {
    results.push({
      name,
      passed: false,
      message: "✗",
      error: error instanceof Error ? error.message : String(error),
    });
    console.error(`✗ ${name}`);
    console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function testKeywordSearch(): Promise<void> {
  const response = await fetch(`${API_URL}?query=note`);
  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}`);
  }
  const results = await response.json();
  if (!Array.isArray(results)) {
    throw new Error("Expected array response");
  }
}

async function testDateRangeFilter(): Promise<void> {
  const from = "2025-01-01";
  const to = "2025-12-31";
  const response = await fetch(`${API_URL}?dateFrom=${from}&dateTo=${to}`);
  const results = await response.json();
  for (const note of results) {
    const createdAt = new Date(note.createdAt);
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (createdAt < fromDate || createdAt > toDate) {
      throw new Error(`Date ${createdAt} outside range [${fromDate}, ${toDate}]`);
    }
  }
}

async function testConfidenceFilter(): Promise<void> {
  const response = await fetch(`${API_URL}?confidenceMin=0.7&confidenceMax=0.95`);
  const results = await response.json();
  for (const note of results) {
    if (note.confidence !== null) {
      if (note.confidence < 0.7 || note.confidence > 0.95) {
        throw new Error(`Confidence ${note.confidence} outside range [0.7, 0.95]`);
      }
    }
  }
}

async function testStatusFilter(): Promise<void> {
  const response = await fetch(`${API_URL}?status=COMPLETED`);
  const results = await response.json();
  for (const note of results) {
    if (note.status !== "COMPLETED") {
      throw new Error(`Expected status COMPLETED, got ${note.status}`);
    }
  }
}

async function testCombinedFilters(): Promise<void> {
  const response = await fetch(`${API_URL}?query=note&status=COMPLETED&confidenceMin=0.5`);
  const results = await response.json();
  for (const note of results) {
    if (note.status !== "COMPLETED") {
      throw new Error(`Status filter failed: expected COMPLETED, got ${note.status}`);
    }
    if (note.confidence !== null && note.confidence < 0.5) {
      throw new Error(`Confidence filter failed: ${note.confidence} < 0.5`);
    }
  }
}

async function testResultFormat(): Promise<void> {
  const response = await fetch(`${API_URL}?query=a`);
  const results = await response.json();
  if (!Array.isArray(results)) {
    throw new Error("Response is not an array");
  }
  if (results.length > 0) {
    const note = results[0];
    const requiredFields = ["id", "imageUrl", "status", "createdAt"];
    for (const field of requiredFields) {
      if (!(field in note)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }
}

async function testMaxResults(): Promise<void> {
  const response = await fetch(`${API_URL}?query=a`);
  const results = await response.json();
  if (results.length > 100) {
    throw new Error(`Expected max 100 results, got ${results.length}`);
  }
}

async function testSortOrder(): Promise<void> {
  const response = await fetch(`${API_URL}?query=a`);
  const results = await response.json();
  for (let i = 1; i < results.length; i++) {
    const prevDate = new Date(results[i - 1].createdAt).getTime();
    const currDate = new Date(results[i].createdAt).getTime();
    if (prevDate < currDate) {
      throw new Error(`Sort order incorrect: ${prevDate} < ${currDate}`);
    }
  }
}

async function main(): Promise<void> {
  console.log("🔍 Search API Integration Tests\n");

  await runTest("Keyword search", testKeywordSearch);
  await runTest("Date range filter", testDateRangeFilter);
  await runTest("Confidence filter", testConfidenceFilter);
  await runTest("Status filter", testStatusFilter);
  await runTest("Combined filters", testCombinedFilters);
  await runTest("Result format", testResultFormat);
  await runTest("Max 100 results", testMaxResults);
  await runTest("Sort order (descending by date)", testSortOrder);

  console.log("\n📊 Test Summary");
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total}`);

  if (passed === total) {
    console.log("\n✓ All tests passed!");
    process.exit(0);
  } else {
    console.log("\n✗ Some tests failed");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Test runner error:", error);
  process.exit(1);
});
