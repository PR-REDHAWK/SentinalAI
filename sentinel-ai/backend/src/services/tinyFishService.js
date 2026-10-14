/**
 * TinyFish External Web-Intelligence Service
 * 
 * Provides targeted external search enrichment for SentinelAI incidents:
 * - Derives safe, narrowly scoped queries from normalized incident metadata.
 * - Prevents sensitive telemetry, tokens, customer data, and IPs from leaking into queries.
 * - Evaluates relevance and identifies authoritative vendor status pages.
 * - Enforces bounded timeouts, rate limit awareness, and non-blocking failure degradation.
 * - Normalizes external findings into the SentinelAI external evidence contract.
 */

const https = require('https');

// Default service configuration
const DEFAULT_TIMEOUT_MS = parseInt(process.env.TINYFISH_TIMEOUT_MS || '7000', 10);
const DEFAULT_SEARCH_URL = process.env.TINYFISH_SEARCH_URL || 'https://api.search.tinyfish.ai';
const MAX_EXTERNAL_RESULTS = 4;

// Known authoritative status / advisory domains
const AUTHORITATIVE_DOMAINS = [
  'status.aws.amazon.com',
  'aws.amazon.com',
  'status.cloud.google.com',
  'status.azure.com',
  'status.stripe.com',
  'githubstatus.com',
  'status.datadoghq.com',
  'status.auth0.com',
  'status.openai.com',
  'cloudflarestatus.com',
  'status.twilio.com',
  'status.pagerduty.com',
  'status.mongodb.com'
];

/**
 * 1. Sanitization: Strip credentials, IPs, UUIDs, and sensitive tokens from query terms
 */
const sanitizeQueryTerm = (term = '') => {
  if (typeof term !== 'string') return '';
  return term
    .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '') // UUIDs
    .replace(/\b(?:Bearer\s+|Token\s+|[a-zA-Z0-9_-]{32,})\b/g, '') // Tokens/hashes
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '') // IPv4 addresses
    .replace(/["'{}[\]()<>]/g, ' ') // Special chars
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * 2. Selective Trigger: Decide if an incident warrants external public web enrichment
 */
const shouldEnrichIncident = (normalizedTelemetry = {}, incidentIdentification = {}, evidenceCorrelation = {}) => {
  // Check feature toggle
  if (process.env.TINYFISH_ENABLED === 'false') {
    return { shouldEnrich: false, reason: 'TinyFish disabled via TINYFISH_ENABLED=false' };
  }

  const incidentType = incidentIdentification?.primaryHypothesis?.incidentType || '';
  const severity = incidentIdentification?.primaryHypothesis?.severity || normalizedTelemetry?.severity || '';
  const candidate = evidenceCorrelation?.primaryRootCause?.candidate || '';
  const hasExternalDeps = Array.isArray(normalizedTelemetry?.dependencies) &&
    normalizedTelemetry.dependencies.some(d => d.type === 'external_api' || d.type === 'cloud_service' || /ext-|stripe|aws|azure|gcp|datadog|twilio|auth0/i.test(d.name || ''));

  // Scenarios that warrant external investigation:
  // 1. Explicit downstream dependency failure
  if (incidentType === 'SERVICE_DEPENDENCY_FAILURE' || /DEPENDENCY/i.test(incidentType)) {
    return { shouldEnrich: true, reason: 'Downstream service dependency failure detected' };
  }

  // 2. Incident candidate points to external cloud / network / database provider
  if (/AWS|Cloud|Network|Gateway|Kubernetes|Cluster|Database/i.test(candidate)) {
    return { shouldEnrich: true, reason: 'Infrastructure candidate associated with external/cloud platform' };
  }

  // 3. High severity incident with external dependencies present
  if ((severity === 'CRITICAL' || severity === 'Critical' || severity === 'HIGH') && hasExternalDeps) {
    return { shouldEnrich: true, reason: 'High-severity incident with active external cloud dependencies' };
  }

  // 4. CloudWatch / Kubernetes provider with critical threshold
  if (normalizedTelemetry.source === 'cloudwatch' || normalizedTelemetry.source === 'kubernetes') {
    return { shouldEnrich: true, reason: 'Cloud provider / Kubernetes infrastructure degradation' };
  }

  return {
    shouldEnrich: false,
    reason: 'Incident classified as internal application workload (external enrichment skipped)'
  };
};

/**
 * 3. Query Construction: Build narrow, targeted queries from normalized metadata
 */
const constructInvestigationQuery = (normalizedTelemetry = {}, incidentIdentification = {}, evidenceCorrelation = {}) => {
  const parts = [];

  // Check for specific external dependencies first
  const externalDep = (normalizedTelemetry.dependencies || []).find(d => 
    d.status === 'degraded' || d.type === 'external_api' || /stripe|aws|azure|gcp|twilio|auth0/i.test(d.name || '')
  );

  if (externalDep && externalDep.name) {
    const cleanDep = sanitizeQueryTerm(externalDep.name.replace(/^ext-/, ''));
    parts.push(cleanDep, 'service status outage');
    return {
      query: parts.join(' ').trim(),
      purpose: `Investigate external service outage for dependency ${cleanDep}`,
      targetEntity: cleanDep
    };
  }

  // Provider & Cloud Region Context
  const provider = normalizedTelemetry.source || '';
  const region = normalizedTelemetry.region && normalizedTelemetry.region !== 'Global' ? normalizedTelemetry.region : '';
  const service = normalizedTelemetry.service || '';

  if (provider === 'cloudwatch' || /aws/i.test(service)) {
    parts.push('AWS');
    if (region) parts.push(region);
    parts.push('service status degradation');
  } else if (/gcp|google/i.test(service)) {
    parts.push('Google Cloud');
    if (region) parts.push(region);
    parts.push('incident advisory');
  } else if (/azure/i.test(service)) {
    parts.push('Azure status advisory');
  } else if (provider === 'kubernetes') {
    const errorLog = (normalizedTelemetry.logs || []).find(l => /OOMKilled|CrashLoopBackOff|evicted/i.test(l.message || ''));
    if (errorLog) {
      const cleanMsg = sanitizeQueryTerm(errorLog.message).substring(0, 40);
      parts.push('Kubernetes', cleanMsg, 'known issue advisory');
    } else {
      parts.push('Kubernetes container lifecycle failure advisory');
    }
  } else {
    // General infrastructure anomaly
    const cleanService = sanitizeQueryTerm(service);
    parts.push(cleanService || 'service');
    if (region) parts.push(region);
    parts.push('status page outage report');
  }

  const query = parts.filter(Boolean).join(' ').trim();
  return {
    query,
    purpose: `Investigate public service status for ${service || 'infrastructure'} in ${region || 'region'}`,
    targetEntity: service
  };
};

/**
 * 4. Response Normalization: Map TinyFish API response into external evidence contract
 */
const normalizeExternalEvidence = (rawResults = [], queryExecuted = '') => {
  const now = new Date().toISOString();

  return (rawResults || []).slice(0, MAX_EXTERNAL_RESULTS).map((item, index) => {
    const siteName = (item.site_name || '').toLowerCase();
    const url = item.url || '';
    
    // Check if domain is an authoritative provider
    const isAuthoritative = AUTHORITATIVE_DOMAINS.some(domain => 
      siteName.includes(domain) || url.includes(domain)
    );

    return {
      title: item.title || 'Public Web Advisory',
      url: item.url || '',
      snippet: sanitizeQueryTerm(item.snippet || '').substring(0, 300),
      source: item.site_name || (item.url ? new URL(item.url).hostname : 'External Web'),
      retrievedAt: now,
      evidenceType: 'external_web',
      relevance: isAuthoritative ? 'authoritative_candidate' : 'candidate',
      isAuthoritative,
      position: item.position || (index + 1),
      query: queryExecuted
    };
  });
};

/**
 * 5. Low-level HTTP Client for TinyFish Search API
 */
const executeTinyFishSearch = (query, options = {}) => {
  const apiKey = options.apiKey !== undefined ? options.apiKey : process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error('TINYFISH_API_KEY is not configured'));
  }

  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const baseUrl = options.searchUrl || DEFAULT_SEARCH_URL;
  
  // Build URL with parameters
  const queryParams = new URLSearchParams({
    query: query,
    recency_minutes: options.recencyMinutes ? String(options.recencyMinutes) : '1440',
    domain_type: 'web'
  });

  if (options.purpose) {
    queryParams.append('purpose', options.purpose);
  }

  const fullUrl = `${baseUrl}?${queryParams.toString()}`;

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(fullUrl);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: `${parsedUrl.pathname}${parsedUrl.search}`,
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'User-Agent': 'SentinelAI-Incident-Intelligence/1.0',
        'Accept': 'application/json'
      },
      timeout: timeoutMs
    };

    const req = https.request(reqOptions, (res) => {
      let rawData = '';

      res.on('data', chunk => {
        rawData += chunk;
      });

      res.on('end', () => {
        const statusCode = res.statusCode || 200;

        if (statusCode === 429) {
          return reject(new Error('TinyFish rate limit exceeded (HTTP 429)'));
        }

        if (statusCode === 401 || statusCode === 403) {
          return reject(new Error(`TinyFish authentication failed (HTTP ${statusCode})`));
        }

        if (statusCode >= 400) {
          return reject(new Error(`TinyFish API returned HTTP ${statusCode}: ${rawData.substring(0, 150)}`));
        }

        try {
          const parsed = JSON.parse(rawData);
          resolve(parsed);
        } catch (parseErr) {
          reject(new Error(`Failed to parse TinyFish JSON response: ${parseErr.message}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`TinyFish request timed out after ${timeoutMs}ms`));
    });

    req.on('error', (netErr) => {
      reject(new Error(`TinyFish network error: ${netErr.message}`));
    });

    req.end();
  });
};

/**
 * 6. Main Orchestrated TinyFish Investigation Function
 * Guarantees graceful degradation: NEVER throws or fails the incident analysis pipeline.
 */
const investigateExternalEvidence = async (normalizedTelemetry = {}, anomalyReport = {}, incidentIdentification = {}, evidenceCorrelation = {}, options = {}) => {
  const startTime = Date.now();
  const apiKey = options.apiKey !== undefined ? options.apiKey : process.env.TINYFISH_API_KEY;

  // 1. Missing API Key check
  if (!apiKey && !options.mock) {
    return {
      status: 'SKIPPED',
      reason: 'TINYFISH_API_KEY is not configured',
      query: null,
      totalResults: 0,
      retrievedAt: new Date().toISOString(),
      evidence: [],
      durationMs: Date.now() - startTime
    };
  }

  // 2. Selective enrichment check
  const triggerDecision = shouldEnrichIncident(normalizedTelemetry, incidentIdentification, evidenceCorrelation);
  if (!triggerDecision.shouldEnrich && !options.force) {
    return {
      status: 'SKIPPED',
      reason: triggerDecision.reason,
      query: null,
      totalResults: 0,
      retrievedAt: new Date().toISOString(),
      evidence: [],
      durationMs: Date.now() - startTime
    };
  }

  // 3. Construct bounded query
  const queryInfo = constructInvestigationQuery(normalizedTelemetry, incidentIdentification, evidenceCorrelation);

  // 4. Handle Mock Mode (for unit tests)
  if (options.mock) {
    const mockResults = options.mockResults || [];
    const normalizedEvidence = normalizeExternalEvidence(mockResults, queryInfo.query);
    return {
      status: 'COMPLETED',
      query: queryInfo.query,
      purpose: queryInfo.purpose,
      totalResults: normalizedEvidence.length,
      retrievedAt: new Date().toISOString(),
      evidence: normalizedEvidence,
      durationMs: Date.now() - startTime
    };
  }

  // 5. Execute live search with graceful fallback
  try {
    const searchResponse = await executeTinyFishSearch(queryInfo.query, {
      apiKey,
      purpose: queryInfo.purpose,
      timeoutMs: options.timeoutMs || DEFAULT_TIMEOUT_MS,
      searchUrl: options.searchUrl || DEFAULT_SEARCH_URL,
      recencyMinutes: 1440
    });

    const normalizedEvidence = normalizeExternalEvidence(searchResponse.results || [], queryInfo.query);

    return {
      status: 'COMPLETED',
      query: queryInfo.query,
      purpose: queryInfo.purpose,
      totalResults: searchResponse.total_results || normalizedEvidence.length,
      retrievedAt: new Date().toISOString(),
      evidence: normalizedEvidence,
      durationMs: Date.now() - startTime
    };
  } catch (err) {
    // Graceful degradation: record the failure status and reason without throwing
    const isTimeout = /timed out/i.test(err.message);
    const isRateLimit = /429/i.test(err.message);

    console.warn(`[TinyFish] External investigation skipped/failed: ${err.message}`);

    return {
      status: isTimeout ? 'UNAVAILABLE' : isRateLimit ? 'RATE_LIMITED' : 'FAILED',
      error: err.message,
      reason: isTimeout ? 'Request timed out' : isRateLimit ? 'Rate limit reached' : 'Search service error',
      query: queryInfo.query,
      totalResults: 0,
      retrievedAt: new Date().toISOString(),
      evidence: [],
      durationMs: Date.now() - startTime
    };
  }
};

module.exports = {
  sanitizeQueryTerm,
  shouldEnrichIncident,
  constructInvestigationQuery,
  normalizeExternalEvidence,
  executeTinyFishSearch,
  investigateExternalEvidence,
  AUTHORITATIVE_DOMAINS,
  DEFAULT_TIMEOUT_MS,
  MAX_EXTERNAL_RESULTS
};
