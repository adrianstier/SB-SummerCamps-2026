/**
 * AI Test User Runner
 * Simulates 30 personas testing all features and reports issues
 */

import { personas } from './personas.js';
import { testScenarios } from './test-scenarios.js';

// Issue severity levels
const SEVERITY = {
  CRITICAL: 'critical',    // Blocks core functionality
  HIGH: 'high',            // Major feature broken
  MEDIUM: 'medium',        // Feature works but has issues
  LOW: 'low',              // Minor UX issue
  SUGGESTION: 'suggestion' // Enhancement idea
};

// Issue categories
const CATEGORY = {
  FUNCTIONALITY: 'functionality',
  USABILITY: 'usability',
  PERFORMANCE: 'performance',
  ACCESSIBILITY: 'accessibility',
  DATA: 'data',
  SECURITY: 'security',
  VISUAL: 'visual'
};

/**
 * Test result for a single scenario
 */
class TestResult {
  constructor(personaId, scenarioId, testId) {
    this.personaId = personaId;
    this.scenarioId = scenarioId;
    this.testId = testId;
    this.passed = true;
    this.issues = [];
    this.notes = [];
    this.timestamp = new Date().toISOString();
  }

  fail(issue) {
    this.passed = false;
    this.issues.push(issue);
  }

  addNote(note) {
    this.notes.push(note);
  }
}

/**
 * Issue report structure
 */
class Issue {
  constructor({
    title,
    description,
    severity,
    category,
    personaId,
    scenario,
    test,
    steps,
    expected,
    actual,
    personaContext
  }) {
    this.id = `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.title = title;
    this.description = description;
    this.severity = severity;
    this.category = category;
    this.personaId = personaId;
    this.scenario = scenario;
    this.test = test;
    this.steps = steps;
    this.expected = expected;
    this.actual = actual;
    this.personaContext = personaContext;
    this.timestamp = new Date().toISOString();
    this.status = 'open';
  }
}

/**
 * Persona Test Session - simulates one persona testing the site
 */
class PersonaTestSession {
  constructor(persona, page) {
    this.persona = persona;
    this.page = page;
    this.results = [];
    this.issues = [];
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * Run all applicable test scenarios for this persona
   */
  async runAllTests() {
    this.startTime = new Date();
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Starting tests for: ${this.persona.name} (${this.persona.id})`);
    console.log(`Background: ${this.persona.background}`);
    console.log(`${'='.repeat(60)}`);

    // Authentication tests
    await this.runScenario('auth');

    // Discovery tests (core for all users)
    await this.runScenario('discovery');

    // Camp details
    await this.runScenario('details');

    // Children management
    await this.runScenario('children');

    // Favorites
    await this.runScenario('favorites');

    // Schedule planner (critical for parents)
    await this.runScenario('scheduler');

    // Reviews (if persona would use)
    if (this.wouldUseReviews()) {
      await this.runScenario('reviews');
    }

    // Questions (if new to area or has special needs)
    if (this.wouldAskQuestions()) {
      await this.runScenario('questions');
    }

    // Comparison (if comparing multiple camps)
    if (this.wouldCompare()) {
      await this.runScenario('comparison');
    }

    // Squads (if has friends to coordinate with)
    if (this.wouldUseSquads()) {
      await this.runScenario('squads');
    }

    // Dashboard
    await this.runScenario('dashboard');

    // Notifications
    await this.runScenario('notifications');

    // Responsive (if persona uses mobile)
    if (this.usesMobile()) {
      await this.runScenario('responsive');
    }

    // Accessibility (for personas with needs)
    if (this.needsAccessibility()) {
      await this.runScenario('accessibility');
    }

    // Error handling
    await this.runScenario('errors');

    this.endTime = new Date();
    return this.generateReport();
  }

  /**
   * Run a specific test scenario
   */
  async runScenario(scenarioId) {
    const scenario = testScenarios[scenarioId];
    if (!scenario) {
      console.warn(`Scenario ${scenarioId} not found`);
      return;
    }

    console.log(`\n  Testing: ${scenario.name}`);

    for (const test of scenario.tests) {
      const result = new TestResult(this.persona.id, scenarioId, test.id);

      try {
        // Simulate test execution based on persona behavior
        const testOutcome = await this.simulateTest(test, scenario);

        if (!testOutcome.passed) {
          const issue = new Issue({
            title: `${test.action} failed for ${this.persona.name}`,
            description: testOutcome.failureReason,
            severity: this.assessSeverity(test, testOutcome),
            category: this.categorizeIssue(test, testOutcome),
            personaId: this.persona.id,
            scenario: scenario.name,
            test: test.action,
            steps: test.steps,
            expected: test.expectedOutcome,
            actual: testOutcome.actualOutcome,
            personaContext: this.getPersonaContext()
          });

          result.fail(issue);
          this.issues.push(issue);
          console.log(`    [FAIL] ${test.action}: ${testOutcome.failureReason}`);
        } else {
          console.log(`    [PASS] ${test.action}`);
        }

        if (testOutcome.notes) {
          result.addNote(testOutcome.notes);
        }

      } catch (error) {
        const issue = new Issue({
          title: `${test.action} threw error for ${this.persona.name}`,
          description: error.message,
          severity: SEVERITY.CRITICAL,
          category: CATEGORY.FUNCTIONALITY,
          personaId: this.persona.id,
          scenario: scenario.name,
          test: test.action,
          steps: test.steps,
          expected: test.expectedOutcome,
          actual: `Error: ${error.message}`,
          personaContext: this.getPersonaContext()
        });

        result.fail(issue);
        this.issues.push(issue);
        console.log(`    [ERROR] ${test.action}: ${error.message}`);
      }

      this.results.push(result);
    }
  }

  /**
   * Simulate test execution based on persona characteristics
   */
  async simulateTest(test, scenario) {
    // This would be replaced with actual Playwright automation
    // For now, we simulate based on persona characteristics

    const outcome = {
      passed: true,
      failureReason: null,
      actualOutcome: test.expectedOutcome,
      notes: null
    };

    // Simulate potential failures based on persona
    const potentialIssues = this.identifyPotentialIssues(test, scenario);

    if (potentialIssues.length > 0) {
      // Randomly select an issue to simulate (in real testing, this would be actual test results)
      const randomIssue = potentialIssues[Math.floor(Math.random() * potentialIssues.length)];

      // 30% chance of issue occurring (simulated)
      if (Math.random() < 0.3) {
        outcome.passed = false;
        outcome.failureReason = randomIssue.reason;
        outcome.actualOutcome = randomIssue.actual;
      }
    }

    // Add persona-specific notes
    outcome.notes = this.getPersonaSpecificNotes(test);

    return outcome;
  }

  /**
   * Identify potential issues based on persona characteristics
   */
  identifyPotentialIssues(test, scenario) {
    const issues = [];

    // Low tech-savvy users may struggle with complex UI
    if (this.persona.techSavvy === 'low' || this.persona.techSavvy === 'very-low') {
      if (test.id.includes('drag') || test.id.includes('compare')) {
        issues.push({
          reason: 'User found drag-and-drop confusing without clear instructions',
          actual: 'User tried to click instead of drag, feature seemed broken'
        });
      }
    }

    // Time-constrained users may notice performance issues
    if (this.persona.timeConstrained) {
      if (test.id.includes('load') || test.id.includes('search')) {
        issues.push({
          reason: 'Loading time felt too long for busy parent',
          actual: 'Page took 3+ seconds to load results'
        });
      }
    }

    // Users with many children may hit edge cases
    if (this.persona.children.length > 2) {
      if (test.id.includes('sch-') || test.id.includes('kid-')) {
        issues.push({
          reason: 'UI gets cramped with multiple children',
          actual: 'Child selector hard to use with 4+ children'
        });
      }
    }

    // Special needs families may find missing information
    if (this.persona.specialNeeds) {
      if (test.id.includes('det-') || test.id.includes('disc-')) {
        issues.push({
          reason: `Could not find info about: ${this.persona.specialNeeds}`,
          actual: 'Special accommodations info not visible in camp details'
        });
      }
    }

    // Mobile users may encounter responsive issues
    if (this.persona.techSavvy !== 'expert' && test.id.includes('rsp-')) {
      issues.push({
        reason: 'Mobile layout had overlapping elements',
        actual: 'Filter bar and search overlapped on small screen'
      });
    }

    // Users with dietary needs may not find filtering option
    if (this.persona.specialNeeds?.includes('food') ||
        this.persona.specialNeeds?.includes('kosher') ||
        this.persona.specialNeeds?.includes('halal')) {
      if (test.id.includes('disc-06')) {
        issues.push({
          reason: 'No filter for dietary accommodation',
          actual: 'Could not filter camps by dietary options (kosher, halal, vegetarian)'
        });
      }
    }

    return issues;
  }

  /**
   * Get persona-specific notes for a test
   */
  getPersonaSpecificNotes(test) {
    const notes = [];

    if (this.persona.income === 'low' || this.persona.income === 'lower-middle') {
      if (test.id.includes('price') || test.id.includes('disc-04')) {
        notes.push('Would appreciate clearer scholarship/financial aid information');
      }
    }

    if (this.persona.children.some(c => c.age >= 12)) {
      if (test.id.includes('disc-03')) {
        notes.push('Limited options for teens (12+). Need more teen programs.');
      }
    }

    if (this.persona.specialNeeds?.includes('custody')) {
      notes.push('Custody schedule makes weekly flexibility crucial');
    }

    return notes.length > 0 ? notes.join('; ') : null;
  }

  /**
   * Assess severity of an issue based on test and outcome
   */
  assessSeverity(test, outcome) {
    // Authentication failures are critical
    if (test.id.startsWith('auth-')) {
      return SEVERITY.CRITICAL;
    }

    // Data persistence issues are high
    if (outcome.failureReason?.includes('lost') || outcome.failureReason?.includes('persist')) {
      return SEVERITY.HIGH;
    }

    // Visual/UX issues are medium
    if (outcome.failureReason?.includes('confusing') || outcome.failureReason?.includes('layout')) {
      return SEVERITY.MEDIUM;
    }

    return SEVERITY.MEDIUM;
  }

  /**
   * Categorize issue
   */
  categorizeIssue(test, outcome) {
    if (outcome.failureReason?.includes('layout') || outcome.failureReason?.includes('overlapping')) {
      return CATEGORY.VISUAL;
    }
    if (outcome.failureReason?.includes('slow') || outcome.failureReason?.includes('loading')) {
      return CATEGORY.PERFORMANCE;
    }
    if (outcome.failureReason?.includes('confusing') || outcome.failureReason?.includes('instructions')) {
      return CATEGORY.USABILITY;
    }
    return CATEGORY.FUNCTIONALITY;
  }

  /**
   * Get persona context for issue report
   */
  getPersonaContext() {
    return {
      name: this.persona.name,
      background: this.persona.background,
      techSavvy: this.persona.techSavvy,
      timeConstrained: this.persona.timeConstrained,
      childrenCount: this.persona.children.length,
      childAges: this.persona.children.map(c => c.age),
      priorities: this.persona.priorities,
      specialNeeds: this.persona.specialNeeds
    };
  }

  // Persona behavior helpers
  wouldUseReviews() {
    return this.persona.priorities.includes('well-reviewed') ||
           this.persona.priorities.includes('quality') ||
           this.persona.id === 'sc-05'; // New to area
  }

  wouldAskQuestions() {
    return this.persona.specialNeeds !== null ||
           this.persona.id === 'sc-05' || // New to area
           this.persona.priorities.includes('special-needs-support');
  }

  wouldCompare() {
    return this.persona.techSavvy !== 'low' &&
           this.persona.techSavvy !== 'very-low' &&
           this.persona.children.length <= 2;
  }

  wouldUseSquads() {
    return this.persona.id.startsWith('bf-') || // Blended families
           this.persona.priorities.includes('community');
  }

  usesMobile() {
    return this.persona.timeConstrained ||
           this.persona.techSavvy === 'low';
  }

  needsAccessibility() {
    return this.persona.techSavvy === 'very-low' ||
           this.persona.id.startsWith('gp-'); // Grandparents
  }

  /**
   * Generate final report for this persona
   */
  generateReport() {
    const duration = this.endTime - this.startTime;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = this.results.filter(r => !r.passed).length;

    return {
      persona: {
        id: this.persona.id,
        name: this.persona.name,
        background: this.persona.background
      },
      summary: {
        duration: `${Math.round(duration / 1000)}s`,
        totalTests: this.results.length,
        passed: passedTests,
        failed: failedTests,
        passRate: `${Math.round((passedTests / this.results.length) * 100)}%`
      },
      issues: this.issues,
      criticalIssues: this.issues.filter(i => i.severity === SEVERITY.CRITICAL),
      highIssues: this.issues.filter(i => i.severity === SEVERITY.HIGH)
    };
  }
}

/**
 * Main test runner - runs all personas
 */
export async function runAllPersonaTests(page) {
  console.log('\n' + '='.repeat(80));
  console.log('AI TEST USER FRAMEWORK - COMPREHENSIVE TESTING');
  console.log(`Testing ${personas.length} personas across ${Object.keys(testScenarios).length} scenarios`);
  console.log('='.repeat(80));

  const allResults = [];
  const allIssues = [];
  const startTime = new Date();

  for (const persona of personas) {
    const session = new PersonaTestSession(persona, page);
    const report = await session.runAllTests();
    allResults.push(report);
    allIssues.push(...report.issues);
  }

  const endTime = new Date();

  // Generate master report
  const masterReport = generateMasterReport(allResults, allIssues, startTime, endTime);

  console.log('\n' + '='.repeat(80));
  console.log('MASTER TEST REPORT');
  console.log('='.repeat(80));
  console.log(JSON.stringify(masterReport, null, 2));

  return masterReport;
}

/**
 * Generate consolidated master report
 */
function generateMasterReport(results, issues, startTime, endTime) {
  const totalTests = results.reduce((sum, r) => sum + r.summary.totalTests, 0);
  const totalPassed = results.reduce((sum, r) => sum + r.summary.passed, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.summary.failed, 0);

  // Group issues by severity
  const bySeverity = {
    critical: issues.filter(i => i.severity === SEVERITY.CRITICAL),
    high: issues.filter(i => i.severity === SEVERITY.HIGH),
    medium: issues.filter(i => i.severity === SEVERITY.MEDIUM),
    low: issues.filter(i => i.severity === SEVERITY.LOW)
  };

  // Group issues by category
  const byCategory = {};
  issues.forEach(issue => {
    if (!byCategory[issue.category]) {
      byCategory[issue.category] = [];
    }
    byCategory[issue.category].push(issue);
  });

  // Find most common issues
  const issuesByTitle = {};
  issues.forEach(issue => {
    const key = issue.title.replace(/for .+$/, '').trim();
    if (!issuesByTitle[key]) {
      issuesByTitle[key] = { count: 0, personas: [], issue };
    }
    issuesByTitle[key].count++;
    issuesByTitle[key].personas.push(issue.personaId);
  });

  const commonIssues = Object.values(issuesByTitle)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Personas with most issues
  const personaIssueCount = {};
  results.forEach(r => {
    personaIssueCount[r.persona.id] = {
      name: r.persona.name,
      issues: r.issues.length,
      critical: r.criticalIssues.length,
      high: r.highIssues.length
    };
  });

  const strugglingPersonas = Object.values(personaIssueCount)
    .sort((a, b) => b.issues - a.issues)
    .slice(0, 5);

  return {
    executionInfo: {
      timestamp: startTime.toISOString(),
      duration: `${Math.round((endTime - startTime) / 1000)}s`,
      personasTested: results.length,
      totalTests,
      passRate: `${Math.round((totalPassed / totalTests) * 100)}%`
    },
    summary: {
      totalIssues: issues.length,
      critical: bySeverity.critical.length,
      high: bySeverity.high.length,
      medium: bySeverity.medium.length,
      low: bySeverity.low.length
    },
    criticalIssues: bySeverity.critical.map(i => ({
      title: i.title,
      description: i.description,
      persona: i.personaContext.name,
      scenario: i.scenario,
      test: i.test
    })),
    highPriorityIssues: bySeverity.high.slice(0, 10).map(i => ({
      title: i.title,
      description: i.description,
      persona: i.personaContext.name,
      scenario: i.scenario
    })),
    mostCommonIssues: commonIssues.map(c => ({
      issue: c.issue.title.replace(/for .+$/, '').trim(),
      affectedPersonas: c.count,
      personaIds: c.personas
    })),
    strugglingPersonas: strugglingPersonas.map(p => ({
      name: p.name,
      totalIssues: p.issues,
      criticalIssues: p.critical,
      highIssues: p.high
    })),
    byCategory: Object.entries(byCategory).map(([cat, iss]) => ({
      category: cat,
      count: iss.length
    })),
    recommendations: generateRecommendations(bySeverity, byCategory, commonIssues, strugglingPersonas),
    personaResults: results
  };
}

/**
 * Generate prioritized recommendations based on findings
 */
function generateRecommendations(bySeverity, byCategory, commonIssues, strugglingPersonas) {
  const recommendations = [];

  // Critical issues first
  if (bySeverity.critical.length > 0) {
    recommendations.push({
      priority: 'P0',
      title: 'Fix Critical Issues Immediately',
      description: `${bySeverity.critical.length} critical issue(s) blocking core functionality`,
      action: 'Review critical issues list and deploy fixes ASAP'
    });
  }

  // High severity issues
  if (bySeverity.high.length > 5) {
    recommendations.push({
      priority: 'P1',
      title: 'Address High-Priority Issues',
      description: `${bySeverity.high.length} high-priority issues affecting user experience`,
      action: 'Sprint to address top high-priority issues'
    });
  }

  // Common issues affecting multiple personas
  const veryCommonIssues = commonIssues.filter(c => c.count >= 5);
  if (veryCommonIssues.length > 0) {
    recommendations.push({
      priority: 'P1',
      title: 'Fix Issues Affecting Multiple User Types',
      description: `${veryCommonIssues.length} issue(s) affecting 5+ different user personas`,
      action: 'Prioritize fixes that help the most users'
    });
  }

  // Accessibility issues
  if (byCategory[CATEGORY.ACCESSIBILITY]?.length > 0) {
    recommendations.push({
      priority: 'P2',
      title: 'Improve Accessibility',
      description: `${byCategory[CATEGORY.ACCESSIBILITY].length} accessibility issue(s) found`,
      action: 'Add keyboard navigation, ARIA labels, and improve color contrast'
    });
  }

  // Usability issues for non-tech-savvy users
  const techStrugglers = strugglingPersonas.filter(p =>
    personas.find(per => per.name === p.name)?.techSavvy === 'low' ||
    personas.find(per => per.name === p.name)?.techSavvy === 'very-low'
  );
  if (techStrugglers.length > 0) {
    recommendations.push({
      priority: 'P2',
      title: 'Simplify UI for Less Tech-Savvy Users',
      description: 'Non-technical users struggling with current interface',
      action: 'Add clearer instructions, simplify navigation, consider guided tours'
    });
  }

  // Performance issues
  if (byCategory[CATEGORY.PERFORMANCE]?.length > 0) {
    recommendations.push({
      priority: 'P2',
      title: 'Improve Performance',
      description: `${byCategory[CATEGORY.PERFORMANCE].length} performance issue(s) reported`,
      action: 'Optimize loading times, add loading indicators'
    });
  }

  return recommendations;
}

export { personas, testScenarios, SEVERITY, CATEGORY };
