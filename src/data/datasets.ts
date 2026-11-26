import { DatasetSpec } from '../types/platform';

export const DATASETS: Record<string, DatasetSpec> = {
  ecommerce_orders: {
    id: 'ecommerce_orders',
    name: 'E-Commerce Orders & SCD2 Customers',
    tablePreviewNames: ['orders', 'customers', 'products'],
    ddl: `
CREATE TABLE customers (
  customer_id INT,
  full_name TEXT,
  tier TEXT,
  country TEXT,
  effective_from TEXT,
  effective_to TEXT,
  is_current INT
);
CREATE TABLE products (
  product_id INT,
  category TEXT,
  product_name TEXT,
  unit_price REAL
);
CREATE TABLE orders (
  order_id INT,
  customer_id INT,
  product_id INT,
  order_ts TEXT,
  status TEXT,
  quantity INT,
  amount REAL
);`,
    seedSql: `
INSERT INTO customers VALUES
(101, 'Aarav Mehta', 'Gold', 'IN', '2025-01-01', '2026-03-14', 0),
(101, 'Aarav Mehta', 'Platinum', 'IN', '2026-03-15', '9999-12-31', 1),
(102, 'Maya Lin', 'Silver', 'SG', '2025-06-01', '9999-12-31', 1),
(103, 'Liam Chen', 'Gold', 'US', '2025-02-10', '9999-12-31', 1),
(104, 'Priya Nair', 'Bronze', 'IN', '2025-09-01', '2026-05-31', 0),
(104, 'Priya Nair', 'Gold', 'IN', '2026-06-01', '9999-12-31', 1),
(105, 'Sofia Rossi', 'Platinum', 'DE', '2025-01-15', '9999-12-31', 1);

INSERT INTO products VALUES
(1, 'Compute', 'Cloud GPU Node', 450.0),
(2, 'Storage', 'NVMe Block 4TB', 180.0),
(3, 'Analytics', 'Warehouse Slot Pack', 320.0),
(4, 'Networking', 'Cross-Region Egress', 95.0),
(5, 'AI', 'Vector Index Pod', 520.0);

INSERT INTO orders VALUES
(1001, 101, 1, '2026-02-10 09:15:00', 'COMPLETED', 2, 900.0),
(1002, 101, 3, '2026-03-20 14:30:00', 'COMPLETED', 1, 320.0),
(1003, 101, 5, '2026-03-22 18:05:00', 'COMPLETED', 2, 1040.0),
(1004, 102, 2, '2026-04-01 11:00:00', 'COMPLETED', 3, 540.0),
(1005, 102, 4, '2026-04-03 16:40:00', 'CANCELLED', 1, 95.0),
(1006, 103, 1, '2026-04-10 08:20:00', 'COMPLETED', 1, 450.0),
(1007, 103, 5, '2026-04-11 10:15:00', 'COMPLETED', 1, 520.0),
(1008, 104, 2, '2026-05-18 19:50:00', 'COMPLETED', 2, 360.0),
(1009, 104, 3, '2026-06-15 09:05:00', 'COMPLETED', 4, 1280.0),
(1010, 105, 5, '2026-07-02 12:00:00', 'COMPLETED', 3, 1560.0),
(1011, 105, 1, '2026-07-03 12:15:00', 'COMPLETED', 1, 450.0),
(1012, 101, 2, '2026-07-05 15:45:00', 'COMPLETED', 2, 360.0);`,
  },

  ad_events_stream: {
    id: 'ad_events_stream',
    name: 'Google Ads Impressions, Clicks & Sessions',
    tablePreviewNames: ['ad_impressions', 'ad_clicks', 'campaigns'],
    ddl: `
CREATE TABLE campaigns (
  campaign_id INT,
  advertiser TEXT,
  channel TEXT,
  daily_budget REAL
);
CREATE TABLE ad_impressions (
  event_id TEXT,
  user_id TEXT,
  campaign_id INT,
  event_ts TEXT,
  device TEXT,
  cost_micros INT
);
CREATE TABLE ad_clicks (
  click_id TEXT,
  event_id TEXT,
  user_id TEXT,
  click_ts TEXT,
  conversion_value REAL
);`,
    seedSql: `
INSERT INTO campaigns VALUES
(501, 'VertexCloud', 'Search', 12000.0),
(502, 'QuickPay IN', 'YouTube', 8500.0),
(503, 'UrbanMobility', 'Maps', 6400.0);

INSERT INTO ad_impressions VALUES
('imp-1', 'u-01', 501, '2026-10-01 10:00:00', 'mobile', 150000),
('imp-2', 'u-01', 501, '2026-10-01 10:12:00', 'mobile', 140000),
('imp-3', 'u-01', 502, '2026-10-01 11:05:00', 'desktop', 220000),
('imp-4', 'u-02', 502, '2026-10-01 09:30:00', 'mobile', 180000),
('imp-5', 'u-02', 502, '2026-10-01 09:30:00', 'mobile', 180000),
('imp-6', 'u-03', 503, '2026-10-01 14:00:00', 'mobile', 120000),
('imp-7', 'u-03', 501, '2026-10-01 14:20:00', 'desktop', 260000),
('imp-8', 'u-04', 503, '2026-10-01 16:00:00', 'mobile', 110000);

INSERT INTO ad_clicks VALUES
('clk-1', 'imp-2', 'u-01', '2026-10-01 10:13:10', 120.0),
('clk-2', 'imp-3', 'u-01', '2026-10-01 11:06:00', 0.0),
('clk-3', 'imp-4', 'u-02', '2026-10-01 09:31:00', 85.0),
('clk-4', 'imp-7', 'u-03', '2026-10-01 14:22:30', 310.0);`,
  },

  rideshare_trips: {
    id: 'rideshare_trips',
    name: 'Mobility Trips, Drivers & H3 Zones',
    tablePreviewNames: ['trips', 'drivers', 'zones'],
    ddl: `
CREATE TABLE zones (
  h3_index TEXT,
  city TEXT,
  zone_name TEXT,
  base_surge REAL
);
CREATE TABLE drivers (
  driver_id INT,
  city TEXT,
  vehicle_type TEXT,
  rating REAL
);
CREATE TABLE trips (
  trip_id INT,
  driver_id INT,
  rider_id INT,
  h3_index TEXT,
  pickup_ts TEXT,
  dropoff_ts TEXT,
  fare_usd REAL,
  distance_km REAL,
  status TEXT
);`,
    seedSql: `
INSERT INTO zones VALUES
('8860145b03fffff', 'Bengaluru', 'Koramangala', 1.25),
('8860145b07fffff', 'Bengaluru', 'Indiranagar', 1.40),
('8860145b11fffff', 'Bengaluru', 'Whitefield', 1.15),
('8828308281fffff', 'San Francisco', 'SoMa', 1.50);

INSERT INTO drivers VALUES
(1, 'Bengaluru', 'EV Sedan', 4.92),
(2, 'Bengaluru', 'Auto', 4.78),
(3, 'Bengaluru', 'EV Sedan', 4.85),
(4, 'San Francisco', 'SUV', 4.95);

INSERT INTO trips VALUES
(9001, 1, 301, '8860145b03fffff', '2026-11-01 08:10:00', '2026-11-01 08:32:00', 11.5, 6.2, 'COMPLETED'),
(9002, 1, 302, '8860145b07fffff', '2026-11-01 09:00:00', '2026-11-01 09:25:00', 14.0, 7.8, 'COMPLETED'),
(9003, 2, 303, '8860145b03fffff', '2026-11-01 09:15:00', '2026-11-01 09:30:00', 5.2, 3.1, 'COMPLETED'),
(9004, 3, 304, '8860145b11fffff', '2026-11-01 10:05:00', '2026-11-01 10:40:00', 19.8, 12.4, 'COMPLETED'),
(9005, 1, 305, '8860145b07fffff', '2026-11-01 11:00:00', '2026-11-01 11:02:00', 0.0, 0.0, 'CANCELLED'),
(9006, 4, 306, '8828308281fffff', '2026-11-01 12:10:00', '2026-11-01 12:34:00', 28.5, 8.9, 'COMPLETED');`,
  },

  cloud_billing_usage: {
    id: 'cloud_billing_usage',
    name: 'BigQuery Slot & Cloud FinOps Telemetry',
    tablePreviewNames: ['gcp_billing_export', 'projects'],
    ddl: `
CREATE TABLE projects (
  project_id TEXT,
  team TEXT,
  environment TEXT
);
CREATE TABLE gcp_billing_export (
  usage_date TEXT,
  project_id TEXT,
  service TEXT,
  sku TEXT,
  bytes_billed INT,
  cost_usd REAL
);`,
    seedSql: `
INSERT INTO projects VALUES
('de-prod-analytics', 'Core Data', 'PROD'),
('genai-rag-platform', 'Applied AI', 'PROD'),
('sandbox-ml-exp', 'Data Science', 'DEV');

INSERT INTO gcp_billing_export VALUES
('2026-11-01', 'de-prod-analytics', 'BigQuery', 'Analysis Slots', 540000000000, 142.5),
('2026-11-01', 'genai-rag-platform', 'Vertex AI', 'Vector Index', 120000000000, 210.0),
('2026-11-02', 'de-prod-analytics', 'BigQuery', 'Analysis Slots', 610000000000, 160.2),
('2026-11-02', 'sandbox-ml-exp', 'Dataflow', 'Streaming vCPU', 90000000000, 95.4),
('2026-11-03', 'de-prod-analytics', 'BigQuery', 'Storage Active', 2400000000000, 48.0),
('2026-11-03', 'genai-rag-platform', 'BigQuery', 'Cortex / ML Eval', 310000000000, 88.6);`,
  },

  rag_telemetry: {
    id: 'rag_telemetry',
    name: 'GenAI RAG Chunking & Retrieval Quality Logs',
    tablePreviewNames: ['doc_chunks', 'retrieval_logs'],
    ddl: `
CREATE TABLE doc_chunks (
  chunk_id TEXT,
  doc_id TEXT,
  source_system TEXT,
  token_count INT,
  updated_at TEXT
);
CREATE TABLE retrieval_logs (
  query_id TEXT,
  chunk_id TEXT,
  rank_pos INT,
  cosine_score REAL,
  bm25_score REAL,
  grounded_pass INT,
  latency_ms INT
);`,
    seedSql: `
INSERT INTO doc_chunks VALUES
('chk-1', 'doc-a', 'Confluence', 380, '2026-10-20 10:00:00'),
('chk-2', 'doc-a', 'Confluence', 410, '2026-10-20 10:00:00'),
('chk-3', 'doc-b', 'BigQuery Docs', 512, '2026-10-22 14:00:00'),
('chk-4', 'doc-c', 'Runbooks', 290, '2026-10-25 09:00:00');

INSERT INTO retrieval_logs VALUES
('q-101', 'chk-1', 1, 0.89, 14.2, 1, 42),
('q-101', 'chk-3', 2, 0.81, 11.8, 1, 42),
('q-102', 'chk-2', 1, 0.74, 8.5, 0, 68),
('q-103', 'chk-4', 1, 0.93, 18.4, 1, 35),
('q-104', 'chk-3', 1, 0.68, 6.2, 0, 91);`,
  },

  imagery_ops_telemetry: {
    id: 'imagery_ops_telemetry',
    name: 'Overhead Imagery & Pipeline Operational SLA Telemetry',
    tablePreviewNames: ['pipeline_sla_targets', 'tile_ingestion_runs', 'bi_query_audit'],
    ddl: `
CREATE TABLE pipeline_sla_targets (
  pipeline_id TEXT,
  pipeline_name TEXT,
  region TEXT,
  max_lag_minutes INT,
  target_completeness_pct REAL,
  max_anomaly_rate_pct REAL
);
CREATE TABLE tile_ingestion_runs (
  run_id TEXT,
  pipeline_id TEXT,
  s2_region TEXT,
  window_start TEXT,
  ingested_at TEXT,
  freshness_lag_min REAL,
  expected_tiles INT,
  valid_tiles INT,
  corrupt_tiles INT,
  bytes_ingested INT,
  duration_sec INT
);
CREATE TABLE bi_query_audit (
  query_id TEXT,
  dashboard_name TEXT,
  used_bi_engine INT,
  used_mv INT,
  bytes_scanned INT,
  duration_ms INT,
  query_ts TEXT
);`,
    seedSql: `
INSERT INTO pipeline_sla_targets VALUES
('pipe-sat-apac', 'APAC Overhead Imagery Tiles', 'asia-south1', 15, 99.5, 0.5),
('pipe-street-eu', 'EU Street-Level COG Ingestion', 'europe-west1', 20, 99.0, 1.0),
('pipe-lidar-us', 'US Aerial LiDAR Mesh', 'us-central1', 30, 98.5, 1.0);

INSERT INTO tile_ingestion_runs VALUES
('run-01', 'pipe-sat-apac', 's2-blr-north', '2026-11-20 08:00:00', '2026-11-20 08:09:00', 9.0, 12000, 11988, 12, 48000000000, 240),
('run-02', 'pipe-sat-apac', 's2-blr-south', '2026-11-20 09:00:00', '2026-11-20 09:24:00', 24.0, 12000, 11640, 180, 46500000000, 360),
('run-03', 'pipe-street-eu', 's2-ber-central', '2026-11-20 08:00:00', '2026-11-20 08:14:00', 14.0, 8500, 8460, 25, 31000000000, 210),
('run-04', 'pipe-street-eu', 's2-par-west', '2026-11-20 09:00:00', '2026-11-20 09:16:00', 16.0, 8500, 8449, 42, 30800000000, 200),
('run-05', 'pipe-lidar-us', 's2-sfo-bay', '2026-11-20 08:00:00', '2026-11-20 08:21:00', 21.0, 5000, 4960, 15, 72000000000, 300),
('run-06', 'pipe-lidar-us', 's2-nyc-metro', '2026-11-20 09:00:00', '2026-11-20 09:42:00', 42.0, 5000, 4720, 110, 68000000000, 450);

INSERT INTO bi_query_audit VALUES
('bq-101', 'Executive Imagery SLA Overview', 1, 1, 18000000, 180, '2026-11-20 09:05:00'),
('bq-102', 'Executive Imagery SLA Overview', 1, 1, 22000000, 210, '2026-11-20 09:10:00'),
('bq-103', 'Tile Anomaly Deep Dive', 0, 0, 84000000000, 6400, '2026-11-20 09:15:00'),
('bq-104', 'Tile Anomaly Deep Dive', 0, 1, 4100000000, 1150, '2026-11-20 09:20:00'),
('bq-105', 'Regional Freshness Scorecard', 1, 1, 15000000, 145, '2026-11-20 09:25:00'),
('bq-106', 'Regional Freshness Scorecard', 0, 0, 52000000000, 4800, '2026-11-20 09:30:00');`,
  },
};
