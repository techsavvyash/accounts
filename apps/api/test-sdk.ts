#!/usr/bin/env bun
import { HeimdallClient } from '@accounts/heimdall';

async function testSDK() {
  console.log('🧪 Testing Heimdall Node.js SDK\n');

  const client = new HeimdallClient({
    apiUrl: 'http://localhost:8080',
    autoRefresh: false
  });

  try {
    console.log('📝 Test 1: Registration with firstName and lastName');
    const user = await client.auth.register({
      email: 'sdktest@example.com',
      password: 'SecurePassword123!',
      firstName: 'SDK',
      lastName: 'Tester'
    });
    console.log('✅ Registration successful!');
    console.log('User:', JSON.stringify(user, null, 2));
  } catch (error: any) {
    console.error('❌ Registration failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('Status:', error.statusCode);
  }

  console.log('\n📝 Test 2: Registration with metadata (will it work?)');
  try {
    const user2 = await client.auth.register({
      email: 'sdktest2@example.com',
      password: 'SecurePassword123!',
      firstName: 'SDK',
      lastName: 'Tester2',
      metadata: {
        platform: 'test',
        source: 'sdk-test'
      }
    });
    console.log('✅ Registration with metadata successful!');
    console.log('User:', JSON.stringify(user2, null, 2));
  } catch (error: any) {
    console.error('❌ Registration with metadata failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
  }

  console.log('\n📝 Test 3: Registration without firstName (should fail)');
  try {
    const user3 = await client.auth.register({
      email: 'sdktest3@example.com',
      password: 'SecurePassword123!',
      lastName: 'OnlyLastName'
    } as any);
    console.log('✅ Registration without firstName worked (unexpected!)');
    console.log('User:', JSON.stringify(user3, null, 2));
  } catch (error: any) {
    console.error('❌ Registration without firstName failed (expected):');
    console.error('Error:', error.message);
  }
}

testSDK().then(() => {
  console.log('\n✅ SDK tests complete');
  process.exit(0);
}).catch(err => {
  console.error('\n💥 SDK test crashed:', err);
  process.exit(1);
});
