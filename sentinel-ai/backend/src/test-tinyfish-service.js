/**
 * Automated Unit Test Suite: TinyFish Service (Phase 4.5 External Web Intelligence)
 */

require('dotenv').config();
const {
  sanitizeQueryTerm,
  shouldEnrichIncident,
  constructInvestigationQuery,
  normalizeExternalEvidence,
  investigateExternalEvidence,
  AUTHORITATIVE_DOMAINS
} = require('./services/tinyFishService');

const runTinyFishTests = async () => {
  console.log('🧪 Starting TinyFish External Intelligence Service Tests...\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  };

  // ---------------------------------------------------------
  // 1. Sanitization & Token Leak Prevention
  // ---------------------------------------------------------
  console.log('--- Test 1: Query Sanitization & Secret Leak Prevention ---');
  const dirtyTerm = 'Bearer secret-token-1234567890abcdef1234567890 192.168.1.100 a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d "payment-gateway"';
  const cleanTerm = sanitizeQueryTerm(dirtyTerm);
  assert(!cleanTerm.includes('192.168.1.100'), 'Stripped IPv4 addresses from query string');
  assert(!cleanTerm.includes('a1b2c3d4'), 'Stripped UUIDs from query string');
  assert(!cleanTerm.includes('Bearer'), 'Stripped Bearer auth tokens from query string');
  assert(cleanTerm.includes('payment-gateway'), 'Preserved service name');

  // ---------------------------------------------------------
  // 2. Query Construction from Incident Metadata
  // ---------------------------------------------------------
  console.log('\n--- Test 2: Targeted Query Construction ---');
  
  // Scenario A: External Dependency Degradation (Stripe)
  const stripeTelemetry = {
    service: 'checkout-service',
    region: 'us-east-1',
    dependencies: [
      { name: 'ext-stripe-api', type: 'external_api', status: 'degraded' }
    ]
  };
  const stripeQuery = constructInvestigationQuery(stripeTelemetry);
  assert(stripeQuery.query.includes('stripe-api') && stripeQuery.query.includes('status'), 
    `Stripe dependency query targeted dependency: "${stripeQuery.query}"`);

  // Scenario B: CloudWatch AWS Region Degradation
  const awsTelemetry = {
    source: 'cloudwatch',
    service: 'aws-rds-cluster',
    region: 'us-east-1'
  };
  const awsQuery = constructInvestigationQuery(awsTelemetry);
  assert(awsQuery.query.includes('AWS') && awsQuery.query.includes('us-east-1'),
    `CloudWatch AWS query targets provider & region: "${awsQuery.query}"`);

  // Scenario C: Kubernetes Lifecycle Degradation
  const k8sTelemetry = {
    source: 'kubernetes',
    service: 'auth-service',
    logs: [{ message: 'OOMKilled process 1024' }]
  };
  const k8sQuery = constructInvestigationQuery(k8sTelemetry);
  assert(k8sQuery.query.includes('Kubernetes') && k8sQuery.query.includes('OOMKilled'),
    `Kubernetes query incorporates container error: "${k8sQuery.query}"`);

  // ---------------------------------------------------------
  // 3. Selective Triggering Logic
  // ---------------------------------------------------------
  console.log('\n--- Test 3: Selective Enrichment Decision Gate ---');
  
  // Should enrich: Service Dependency Failure
  const depDecision = shouldEnrichIncident(
    { dependencies: [{ name: 'ext-stripe', type: 'external_api' }] },
    { primaryHypothesis: { incidentType: 'SERVICE_DEPENDENCY_FAILURE' } }
  );
  assert(depDecision.shouldEnrich === true, 'Enriches SERVICE_DEPENDENCY_FAILURE incidents');

  // Should enrich: Infrastructure candidate involving cloud/network
  const cloudDecision = shouldEnrichIncident(
    { service: 'payment-service' },
    { primaryHypothesis: { incidentType: 'HIGH_LATENCY' } },
    { primaryRootCause: { candidate: 'AWS Network Gateway Congestion' } }
  );
  assert(cloudDecision.shouldEnrich === true, 'Enriches incidents with Cloud/AWS root cause candidate');

  // Should skip: purely internal CPU anomaly with no cloud/external dependencies
  const internalDecision = shouldEnrichIncident(
    { service: 'internal-worker', dependencies: [] },
    { primaryHypothesis: { incidentType: 'CPU_SATURATION', severity: 'MEDIUM' } },
    { primaryRootCause: { candidate: 'Worker Thread Contention' } }
  );
  assert(internalDecision.shouldEnrich === false, 'Skips internal CPU contention anomaly');

  // ---------------------------------------------------------
  // 4. Response Normalization & External Evidence Contract
  // ---------------------------------------------------------
  console.log('\n--- Test 4: External Evidence Contract Normalization ---');
  const mockApiResults = [
    {
      position: 1,
      site_name: 'status.aws.amazon.com',
      title: 'AWS Service Health Dashboard - Oct 2026',
      snippet: 'Increased API error rates observed in US-EAST-1 region.',
      url: 'https://status.aws.amazon.com/incident-1092'
    },
    {
      position: 2,
      site_name: 'techblog.random-blog.com',
      title: 'How to fix RDS connection pool issues',
      snippet: 'A general guide on tuning database connections.',
      url: 'https://techblog.random-blog.com/rds-tuning'
    }
  ];

  const normalized = normalizeExternalEvidence(mockApiResults, 'AWS us-east-1 status');
  assert(normalized.length === 2, 'Normalized 2 external evidence records');
  assert(normalized[0].evidenceType === 'external_web', 'evidenceType is "external_web"');
  assert(normalized[0].isAuthoritative === true, 'Official AWS status page flagged as authoritative');
  assert(normalized[0].relevance === 'authoritative_candidate', 'Relevance marked as authoritative_candidate');
  assert(normalized[1].isAuthoritative === false, 'Third-party blog marked as non-authoritative');
  assert(normalized[1].relevance === 'candidate', 'Relevance marked as candidate');
  assert(Boolean(normalized[0].retrievedAt), 'Preserved retrieval timestamp');
  assert(Boolean(normalized[0].url), 'Preserved source URL');

  // ---------------------------------------------------------
  // 5. Graceful Degradation & Failure Modes
  // ---------------------------------------------------------
  console.log('\n--- Test 5: Graceful Degradation & Failure Modes ---');

  // Scenario A: Missing API Key
  const missingKeyRes = await investigateExternalEvidence(
    { service: 'payment-service' },
    {},
    { primaryHypothesis: { incidentType: 'SERVICE_DEPENDENCY_FAILURE' } },
    {},
    { apiKey: '' }
  );
  assert(missingKeyRes.status === 'SKIPPED', 'Missing API key returns status SKIPPED without throwing');
  assert(missingKeyRes.evidence.length === 0, 'Missing API key produces safe empty evidence array');

  // Scenario B: Feature Toggle Disabled
  process.env.TINYFISH_ENABLED = 'false';
  const disabledRes = await investigateExternalEvidence(
    { service: 'payment-service' },
    {},
    { primaryHypothesis: { incidentType: 'SERVICE_DEPENDENCY_FAILURE' } },
    {},
    { apiKey: 'dummy-key' }
  );
  assert(disabledRes.status === 'SKIPPED', 'TINYFISH_ENABLED=false gracefully skips enrichment');
  delete process.env.TINYFISH_ENABLED;

  // Scenario C: Mocked Investigation Success
  const mockRes = await investigateExternalEvidence(
    { dependencies: [{ name: 'ext-stripe-api', type: 'external_api' }] },
    {},
    { primaryHypothesis: { incidentType: 'SERVICE_DEPENDENCY_FAILURE' } },
    {},
    { mock: true, mockResults: mockApiResults }
  );
  assert(mockRes.status === 'COMPLETED', 'Mocked investigation returns status COMPLETED');
  assert(mockRes.evidence.length === 2, 'Mocked investigation includes 2 normalized evidence items');
  assert(mockRes.query.includes('stripe-api'), 'Generated appropriate dependency query');

  // Scenario D: Timeout Handling (Simulated with unroutable IP and 50ms timeout)
  const timeoutRes = await investigateExternalEvidence(
    { dependencies: [{ name: 'ext-stripe-api', type: 'external_api' }] },
    {},
    { primaryHypothesis: { incidentType: 'SERVICE_DEPENDENCY_FAILURE' } },
    {},
    { apiKey: 'dummy-key', searchUrl: 'https://10.255.255.1', timeoutMs: 50, force: true }
  );
  assert(timeoutRes.status === 'UNAVAILABLE' || timeoutRes.status === 'FAILED', 
    `Network timeout handled gracefully without crashing (status: ${timeoutRes.status})`);
  assert(Array.isArray(timeoutRes.evidence) && timeoutRes.evidence.length === 0, 'Timeout leaves evidence array safe and empty');

  // ---------------------------------------------------------
  // 6. Live API Smoke Test (Optional when TINYFISH_API_KEY is configured)
  // ---------------------------------------------------------
  if (process.env.TINYFISH_API_KEY) {
    console.log('\n--- Test 6: Live TinyFish Search API Smoke Test ---');
    try {
      const liveRes = await investigateExternalEvidence(
        { source: 'cloudwatch', service: 'aws-rds', region: 'us-east-1' },
        {},
        { primaryHypothesis: { incidentType: 'DATABASE_DEGRADATION' } },
        { primaryRootCause: { candidate: 'AWS Relational Database Service Latency' } },
        { force: true, timeoutMs: 12000 }
      );
      assert(liveRes.status === 'COMPLETED', `Live TinyFish query executed successfully (status: ${liveRes.status})`);
      assert(liveRes.evidence.length > 0, `Live search returned ${liveRes.evidence.length} external evidence items`);
      if (liveRes.evidence.length > 0) {
        console.log(`    ↳ Sample top result: "${liveRes.evidence[0].title}" [${liveRes.evidence[0].url}]`);
      }
    } catch (liveErr) {
      console.warn(`  ⚠ Live API call notice: ${liveErr.message}`);
    }
  }

  // ---------------------------------------------------------
  // Final Results
  // ---------------------------------------------------------
  console.log('\n==============================================');
  console.log(`TinyFish Service Tests: ${passed} Passed, ${failed} Failed`);
  console.log('==============================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runTinyFishTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
