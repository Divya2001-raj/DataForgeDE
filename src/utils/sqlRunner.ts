import initSqlJs, { SqlJsStatic } from 'sql.js';
import { DATASETS } from '../data/datasets';
import { IdeTestCase } from '../types/platform';

let sqlPromise: Promise<SqlJsStatic> | null = null;

async function getSqlEngine(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      locateFile: () => '/sql-wasm.wasm',
    });
  }
  return sqlPromise;
}

export interface SqlExecutionResult {
  success: boolean;
  columns: string[];
  rows: Array<Array<string | number | null>>;
  executionMs: number;
  error?: string;
  testResults: Array<{
    name: string;
    description: string;
    passed: boolean;
    detail: string;
  }>;
}

export async function runSqlInBrowser(
  sqlQuery: string,
  datasetId: string = 'ecommerce_orders',
  testCases: IdeTestCase[] = []
): Promise<SqlExecutionResult> {
  const start = performance.now();
  try {
    const SQL = await getSqlEngine();
    const db = new SQL.Database();
    const dataset = DATASETS[datasetId] || DATASETS.ecommerce_orders;

    db.run(dataset.ddl);
    db.run(dataset.seedSql);

    const execResults = db.exec(sqlQuery);
    const executionMs = Math.max(1, Math.round(performance.now() - start));

    const firstSet = execResults[0];
    const columns = firstSet ? firstSet.columns : [];
    const rows = firstSet ? (firstSet.values as Array<Array<string | number | null>>) : [];

    const normalizedSql = sqlQuery.toUpperCase();
    const evaluatedTests = (testCases.length > 0
      ? testCases
      : [{ name: 'Query returns result rows', description: 'Non-empty relational projection' }]
    ).map((tc) => {
      if (tc.checkSqlContains && tc.checkSqlContains.length > 0) {
        const missing = tc.checkSqlContains.filter((kw) => !normalizedSql.includes(kw.toUpperCase()));
        if (missing.length > 0) {
          return {
            name: tc.name,
            description: tc.description,
            passed: false,
            detail: `Expected SQL construct missing: ${missing.join(', ')}`,
          };
        }
      }
      if (typeof tc.expectedRowCount === 'number') {
        const passed = rows.length === tc.expectedRowCount;
        return {
          name: tc.name,
          description: tc.description,
          passed,
          detail: passed
            ? `Matched ${rows.length} rows`
            : `Expected ${tc.expectedRowCount} rows, got ${rows.length}`,
        };
      }
      const passed = rows.length > 0;
      return {
        name: tc.name,
        description: tc.description,
        passed,
        detail: passed ? `Returned ${rows.length} rows in ${executionMs}ms` : 'Query returned 0 rows',
      };
    });

    db.close();

    return {
      success: true,
      columns,
      rows,
      executionMs,
      testResults: evaluatedTests,
    };
  } catch (err: unknown) {
    const executionMs = Math.max(1, Math.round(performance.now() - start));
    return {
      success: false,
      columns: [],
      rows: [],
      executionMs,
      error: err instanceof Error ? err.message : String(err),
      testResults: testCases.map((tc) => ({
        name: tc.name,
        description: tc.description,
        passed: false,
        detail: 'SQL execution failed',
      })),
    };
  }
}

export async function getDatasetPreview(datasetId: string) {
  const dataset = DATASETS[datasetId] || DATASETS.ecommerce_orders;
  const SQL = await getSqlEngine();
  const db = new SQL.Database();
  db.run(dataset.ddl);
  db.run(dataset.seedSql);

  const previews = dataset.tablePreviewNames.map((table) => {
    const res = db.exec(`SELECT * FROM ${table} LIMIT 5;`);
    return {
      tableName: table,
      columns: res[0]?.columns || [],
      rows: (res[0]?.values || []) as Array<Array<string | number | null>>,
    };
  });

  db.close();
  return previews;
}

export interface SqlExplainStep {
  id: number;
  parent: number;
  detail: string;
}

export async function runSqlExplainPlan(
  sqlQuery: string,
  datasetId: string = 'ecommerce_orders'
): Promise<{ steps: SqlExplainStep[]; error?: string }> {
  try {
    const SQL = await getSqlEngine();
    const db = new SQL.Database();
    const dataset = DATASETS[datasetId] || DATASETS.ecommerce_orders;
    db.run(dataset.ddl);
    db.run(dataset.seedSql);

    const trimmed = sqlQuery.trim().replace(/;+$/, '');
    const execResults = db.exec(`EXPLAIN QUERY PLAN ${trimmed};`);
    const rows = execResults[0]?.values || [];
    const steps: SqlExplainStep[] = rows.map((r) => ({
      id: Number(r[0] ?? 0),
      parent: Number(r[1] ?? 0),
      detail: String(r[3] ?? r[2] ?? ''),
    }));
    db.close();
    return { steps };
  } catch (err: unknown) {
    return {
      steps: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

