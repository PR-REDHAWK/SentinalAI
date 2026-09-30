const testGroundTruthIsolation = require('./groundTruthIsolation.test');
const testSimulatorEngine = require('./simulatorEngine.test');

console.log('======================================================');
console.log('🧪 Starting ShopDemo Automated Verification Test Suite');
console.log('======================================================\n');

try {
  testSimulatorEngine();
  testGroundTruthIsolation();
  console.log('======================================================');
  console.log('🎉 ALL SHOPDEMO TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================');
  process.exit(0);
} catch (err) {
  console.error('\n❌ TEST FAILURE:', err.message);
  console.error(err.stack);
  process.exit(1);
}
