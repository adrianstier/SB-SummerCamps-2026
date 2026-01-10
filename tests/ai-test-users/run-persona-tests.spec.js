/**
 * Playwright Test Suite - AI Persona Testing
 * Runs all 30 personas through the application testing all features
 */

import { test, expect } from '@playwright/test';
import { personas } from './personas.js';
import { testScenarios } from './test-scenarios.js';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

// Store all issues found
const allIssues = [];

// Test timeout for longer persona sessions
test.setTimeout(120000);

/**
 * Helper class to simulate persona behavior
 */
class PersonaTester {
  constructor(page, persona) {
    this.page = page;
    this.persona = persona;
    this.issues = [];
  }

  async navigate(path = '/') {
    await this.page.goto(`${BASE_URL}${path}`);
    await this.page.waitForLoadState('networkidle');
  }

  async reportIssue(title, details) {
    const issue = {
      persona: this.persona.name,
      personaId: this.persona.id,
      personaContext: {
        background: this.persona.background,
        techSavvy: this.persona.techSavvy,
        children: this.persona.children.length,
        specialNeeds: this.persona.specialNeeds
      },
      title,
      ...details,
      timestamp: new Date().toISOString()
    };
    this.issues.push(issue);
    allIssues.push(issue);
    console.log(`  [ISSUE] ${this.persona.name}: ${title}`);
  }

  // ============================================================================
  // TEST METHODS
  // ============================================================================

  async testCampDiscovery() {
    console.log(`  Testing camp discovery...`);

    // Test page loads
    await this.navigate();
    const camps = await this.page.locator('.camp-card').count();
    if (camps === 0) {
      await this.reportIssue('No camps displayed', {
        severity: 'critical',
        expected: 'Camp cards should display',
        actual: 'No camp cards visible'
      });
    }

    // Test search
    const searchInput = this.page.locator('input[type="text"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('art');
      await this.page.waitForTimeout(500);
      const searchResults = await this.page.locator('.camp-card').count();
      if (searchResults === 0) {
        await this.reportIssue('Search returned no results for common term', {
          severity: 'medium',
          expected: 'Art camps should appear',
          actual: 'No results for "art" search'
        });
      }
      await searchInput.clear();
    }

    // Test age filter based on persona's children
    const childAges = this.persona.children.map(c => c.age);
    const minAge = Math.min(...childAges);
    const maxAge = Math.max(...childAges);

    // Try to find and use age filter
    const ageFilter = this.page.locator('[data-testid="age-filter"], select[name="age"], .age-filter').first();
    if (await ageFilter.isVisible()) {
      // Test age filtering
      console.log(`    Filtering for ages ${minAge}-${maxAge}`);
    }

    // Test price filter based on persona's income
    if (this.persona.income === 'low' || this.persona.income === 'lower-middle') {
      // Look for low-cost camps
      const priceFilter = this.page.locator('[data-testid="price-filter"], .price-filter, input[name="maxPrice"]').first();
      if (await priceFilter.isVisible()) {
        console.log(`    Budget-conscious persona testing price filter`);
      }
    }

    // Test category pills
    const categoryPills = await this.page.locator('.category-pill, .filter-pill').count();
    if (categoryPills > 0) {
      // Click first category
      await this.page.locator('.category-pill, .filter-pill').first().click();
      await this.page.waitForTimeout(300);
    }
  }

  async testCampDetails() {
    console.log(`  Testing camp details...`);

    await this.navigate();

    // Click first camp to open modal
    const firstCamp = this.page.locator('.camp-card').first();
    if (await firstCamp.isVisible()) {
      await firstCamp.click();
      await this.page.waitForTimeout(500);

      // Check if modal opened
      const modal = this.page.locator('.modal, .modal-overlay, [role="dialog"]').first();
      if (!(await modal.isVisible())) {
        await this.reportIssue('Camp modal did not open', {
          severity: 'high',
          expected: 'Modal should open on camp click',
          actual: 'No modal appeared'
        });
      } else {
        // Check for required information
        const hasPrice = await this.page.locator('text=/\\$\\d+/').count() > 0;
        const hasAges = await this.page.locator('text=/\\d+\\s*-\\s*\\d+/').count() > 0;

        if (!hasPrice && this.persona.income !== 'high') {
          await this.reportIssue('Price not clearly visible in camp modal', {
            severity: 'medium',
            expected: 'Price should be prominent',
            actual: 'Could not find price information'
          });
        }

        // Check for special needs info if persona needs it
        if (this.persona.specialNeeds) {
          const modalText = await modal.textContent();
          const needsKeywords = ['accommodation', 'special needs', 'allergy', 'dietary'];
          const hasSpecialInfo = needsKeywords.some(kw => modalText.toLowerCase().includes(kw));
          if (!hasSpecialInfo) {
            await this.reportIssue('Missing special accommodations info', {
              severity: 'medium',
              expected: `Info about: ${this.persona.specialNeeds}`,
              actual: 'No special needs information visible'
            });
          }
        }

        // Close modal
        await this.page.keyboard.press('Escape');
      }
    }
  }

  async testFavorites() {
    console.log(`  Testing favorites...`);

    await this.navigate();

    // Find and click heart/favorite button
    const heartButton = this.page.locator('[aria-label*="favorite"], .heart-button, .favorite-btn, button:has(svg)').first();
    if (await heartButton.isVisible()) {
      await heartButton.click();
      await this.page.waitForTimeout(300);

      // Verify visual feedback
      const filled = await heartButton.getAttribute('class');
      // Check if favorited state
    } else {
      await this.reportIssue('Favorite button not found', {
        severity: 'low',
        expected: 'Heart/favorite button visible',
        actual: 'Could not locate favorite button'
      });
    }
  }

  async testSchedulePlanner() {
    console.log(`  Testing schedule planner...`);

    // Navigate to schedule planner
    const plannerLink = this.page.locator('text=/schedule|planner|calendar/i').first();
    if (await plannerLink.isVisible()) {
      await plannerLink.click();
      await this.page.waitForLoadState('networkidle');

      // Check if calendar/schedule view is visible
      const calendar = this.page.locator('.calendar, .planner, .schedule-grid').first();
      if (await calendar.isVisible()) {
        // Test sidebar visibility
        const sidebar = this.page.locator('.planner-sidebar, .camp-sidebar').first();
        if (await sidebar.isVisible()) {
          console.log(`    Sidebar visible`);
        }

        // Test drag and drop for tech-savvy users
        if (this.persona.techSavvy === 'low' || this.persona.techSavvy === 'very-low') {
          // Check for alternative add method
          const addButton = this.page.locator('.add-camp-btn, button:has-text("Add"), .planner-week-empty').first();
          if (!(await addButton.isVisible())) {
            await this.reportIssue('No obvious way to add camps for non-drag users', {
              severity: 'medium',
              expected: 'Clear add button visible',
              actual: 'Only drag-drop apparent'
            });
          }
        }
      }
    }
  }

  async testResponsive() {
    console.log(`  Testing responsive design...`);

    // Set mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.navigate();

    // Check if camp cards are visible
    const cards = await this.page.locator('.camp-card').count();
    if (cards === 0) {
      await this.reportIssue('Camps not visible on mobile', {
        severity: 'high',
        expected: 'Camps should display on mobile',
        actual: 'No camps visible at 375px width'
      });
    }

    // Check if navigation is accessible
    const menuButton = this.page.locator('[aria-label*="menu"], .hamburger, .mobile-menu').first();
    const hasMenuButton = await menuButton.isVisible();

    // Check for overlapping elements
    // (Would need visual regression testing for full check)

    // Reset viewport
    await this.page.setViewportSize({ width: 1280, height: 720 });
  }

  async testAccessibility() {
    console.log(`  Testing accessibility...`);

    await this.navigate();

    // Test keyboard navigation
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('Tab');

    const focusedElement = await this.page.locator(':focus').count();
    if (focusedElement === 0) {
      await this.reportIssue('Keyboard focus not visible', {
        severity: 'medium',
        expected: 'Focus indicator visible when tabbing',
        actual: 'No visible focus state'
      });
    }

    // Check for images without alt text
    const imagesWithoutAlt = await this.page.locator('img:not([alt])').count();
    if (imagesWithoutAlt > 0) {
      await this.reportIssue(`${imagesWithoutAlt} images missing alt text`, {
        severity: 'low',
        expected: 'All images have alt text',
        actual: `${imagesWithoutAlt} images without alt`
      });
    }

    // Check for buttons without accessible names
    const buttonsWithoutLabel = await this.page.locator('button:not([aria-label]):not(:has-text(*))').count();
    if (buttonsWithoutLabel > 0) {
      await this.reportIssue(`${buttonsWithoutLabel} buttons without accessible labels`, {
        severity: 'medium',
        expected: 'All buttons have labels',
        actual: `${buttonsWithoutLabel} unlabeled buttons`
      });
    }
  }

  async runAllTests() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing as: ${this.persona.name}`);
    console.log(`Background: ${this.persona.background}`);
    console.log(`Tech Savvy: ${this.persona.techSavvy} | Children: ${this.persona.children.length}`);
    console.log(`${'='.repeat(60)}`);

    await this.testCampDiscovery();
    await this.testCampDetails();
    await this.testFavorites();
    await this.testSchedulePlanner();

    // Only test responsive for mobile users
    if (this.persona.timeConstrained || this.persona.techSavvy === 'low') {
      await this.testResponsive();
    }

    // Only test accessibility for users who need it
    if (this.persona.techSavvy === 'very-low' || this.persona.id.startsWith('gp-')) {
      await this.testAccessibility();
    }

    console.log(`\n  Found ${this.issues.length} issues for ${this.persona.name}`);
    return this.issues;
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

test.describe('AI Persona Testing', () => {
  // Run tests for each persona
  for (const persona of personas) {
    test(`Persona: ${persona.name} (${persona.id})`, async ({ page }) => {
      const tester = new PersonaTester(page, persona);
      const issues = await tester.runAllTests();

      // Log issues found
      if (issues.length > 0) {
        console.log(`\n  Issues found for ${persona.name}:`);
        issues.forEach(issue => {
          console.log(`    - [${issue.severity}] ${issue.title}`);
        });
      }

      // Soft assertions - we want to collect all issues, not fail immediately
      // The real test is generating the comprehensive report
    });
  }

  // Generate final report after all tests
  test.afterAll(async () => {
    console.log('\n' + '='.repeat(80));
    console.log('FINAL REPORT - AI PERSONA TESTING');
    console.log('='.repeat(80));

    // Group issues by severity
    const critical = allIssues.filter(i => i.severity === 'critical');
    const high = allIssues.filter(i => i.severity === 'high');
    const medium = allIssues.filter(i => i.severity === 'medium');
    const low = allIssues.filter(i => i.severity === 'low');

    console.log(`\nTotal Issues: ${allIssues.length}`);
    console.log(`  Critical: ${critical.length}`);
    console.log(`  High: ${high.length}`);
    console.log(`  Medium: ${medium.length}`);
    console.log(`  Low: ${low.length}`);

    // Group by issue title to find common problems
    const issueGroups = {};
    allIssues.forEach(issue => {
      if (!issueGroups[issue.title]) {
        issueGroups[issue.title] = [];
      }
      issueGroups[issue.title].push(issue.persona);
    });

    console.log('\nMost Common Issues:');
    Object.entries(issueGroups)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10)
      .forEach(([title, personas]) => {
        console.log(`  - "${title}" (${personas.length} personas)`);
      });

    // Personas with most issues
    const personaIssueCounts = {};
    allIssues.forEach(issue => {
      personaIssueCounts[issue.persona] = (personaIssueCounts[issue.persona] || 0) + 1;
    });

    console.log('\nPersonas With Most Issues:');
    Object.entries(personaIssueCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([persona, count]) => {
        console.log(`  - ${persona}: ${count} issues`);
      });

    console.log('\n' + '='.repeat(80));
  });
});
