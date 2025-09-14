#!/usr/bin/env bun

/**
 * Test runner for the Business Accounts Management API
 * 
 * This script runs all integration tests in the correct order
 * and provides comprehensive test reporting.
 */

import { spawn } from 'bun'
import { existsSync } from 'fs'
import path from 'path'

const testFiles = [
  'tests/e2e/auth.test.ts',
  'tests/e2e/inventory.test.ts', 
  'tests/e2e/invoice.test.ts',
  'tests/e2e/gst.test.ts',
  'tests/e2e/webhooks.test.ts',
  'tests/e2e/analytics.test.ts'
]

interface TestResult {
  file: string
  passed: boolean
  output: string
  duration: number
}

class TestRunner {
  private results: TestResult[] = []
  private totalStartTime = Date.now()
  
  async runAllTests() {
    console.log('🧪 Running Business Accounts Management API Tests')
    console.log('=' .repeat(60))
    
    // Check if all test files exist
    const missingFiles = testFiles.filter(file => !existsSync(file))
    if (missingFiles.length > 0) {
      console.error('❌ Missing test files:', missingFiles)
      process.exit(1)
    }
    
    // Run database setup check
    console.log('📋 Checking test environment...')
    await this.checkTestEnvironment()
    
    // Run each test file
    for (const testFile of testFiles) {
      await this.runTestFile(testFile)
    }
    
    // Generate summary report
    this.generateSummaryReport()
  }
  
  private async checkTestEnvironment() {
    try {
      // Check if DATABASE_URL is set for testing
      if (!process.env.DATABASE_URL) {
        console.warn('⚠️  DATABASE_URL not set, using default test database')
        process.env.DATABASE_URL = 'postgresql://localhost:5432/accounts_test'
      }
      
      // Check if PostHog is disabled for tests
      if (process.env.POSTHOG_API_KEY) {
        console.log('📊 PostHog API key found - events will be tracked during tests')
      } else {
        console.log('📊 PostHog disabled for tests (no API key)')
      }
      
      console.log('✅ Test environment ready')
      console.log('')
    } catch (error) {
      console.error('❌ Failed to setup test environment:', error)
      process.exit(1)
    }
  }
  
  private async runTestFile(testFile: string) {
    const filename = path.basename(testFile, '.test.ts')
    const startTime = Date.now()
    
    console.log(`🧪 Running ${filename} tests...`)
    
    try {
      const proc = spawn({
        cmd: ['bun', 'test', testFile],
        stdout: 'pipe',
        stderr: 'pipe'
      })
      
      const output = await new Response(proc.stdout).text()
      const errors = await new Response(proc.stderr).text()
      
      await proc.exited
      
      const duration = Date.now() - startTime
      const passed = proc.exitCode === 0
      
      const result: TestResult = {
        file: testFile,
        passed,
        output: output + errors,
        duration
      }
      
      this.results.push(result)
      
      if (passed) {
        console.log(`✅ ${filename} tests passed (${duration}ms)`)
      } else {
        console.log(`❌ ${filename} tests failed (${duration}ms)`)
        console.log('Error output:')
        console.log(errors || output)
      }
      
      console.log('')
      
    } catch (error) {
      console.error(`❌ Failed to run ${filename}:`, error)
      
      this.results.push({
        file: testFile,
        passed: false,
        output: `Error: ${error}`,
        duration: Date.now() - startTime
      })
    }
  }
  
  private generateSummaryReport() {
    const totalDuration = Date.now() - this.totalStartTime
    const passedTests = this.results.filter(r => r.passed).length
    const failedTests = this.results.filter(r => !r.passed).length
    const totalTests = this.results.length
    
    console.log('📊 Test Summary Report')
    console.log('=' .repeat(60))
    console.log(`Total Test Files: ${totalTests}`)
    console.log(`Passed: ${passedTests}`)
    console.log(`Failed: ${failedTests}`)
    console.log(`Total Duration: ${totalDuration}ms`)
    console.log('')
    
    // Detailed results
    console.log('📋 Detailed Results:')
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌'
      const filename = path.basename(result.file, '.test.ts')
      console.log(`${status} ${filename.padEnd(20)} ${result.duration}ms`)
    })
    
    console.log('')
    
    // Failed tests details
    const failedResults = this.results.filter(r => !r.passed)
    if (failedResults.length > 0) {
      console.log('❌ Failed Tests Details:')
      console.log('-' .repeat(40))
      
      failedResults.forEach(result => {
        const filename = path.basename(result.file, '.test.ts')
        console.log(`\n📋 ${filename}:`)
        console.log(result.output.slice(0, 1000)) // Limit output length
        if (result.output.length > 1000) {
          console.log('... (output truncated)')
        }
      })
    }
    
    // Final status
    console.log('')
    if (failedTests === 0) {
      console.log('🎉 All tests passed! The API is working correctly.')
      process.exit(0)
    } else {
      console.log(`❌ ${failedTests} test file(s) failed. Please check the errors above.`)
      process.exit(1)
    }
  }
}

// Check if running as main module
if (import.meta.main) {
  const runner = new TestRunner()
  runner.runAllTests().catch(error => {
    console.error('❌ Test runner failed:', error)
    process.exit(1)
  })
}

export default TestRunner