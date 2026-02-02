/**
 * Playwright Test Suite - AI Persona Testing
 * Runs all 30 personas through the application testing all features
 */

import { test, expect } from '@playwright/test';
import { personas } from './personas.js';

const BASE_URL = 'http://localhost:5173';

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
    // Wait for camps to load from Supabase
    await this.page.waitForSelector('.camp-card-button', { timeout: 15000 }).catch(() => null);
  }

  async reportIssue(title, details) {
    const issue = {
      persona: this.persona.name,
      personaId: this.persona.id,
      personaContext: {
        background: this.persona.background,
        techSavvy: this.persona.techSavvy,
        income: this.persona.income,
        children: this.persona.children.length,
        childAges: this.persona.children.map(c => c.age),
        priorities: this.persona.priorities,
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
    await this.navigate();

    // Test page loads with camps
    const campCount = await this.page.locator('.camp-card').count();
    if (campCount === 0) {
      await this.reportIssue('No camps displayed on page load', {
        severity: 'critical',
        category: 'data-loading',
        expected: 'Camp cards should display',
        actual: 'No camp cards visible after waiting for load'
      });
      return; // Can't test further without camps
    }

    // Test search functionality
    const searchInput = this.page.locator('input[placeholder*="Search"], input[type="search"], input[type="text"]').first();
    if (await searchInput.isVisible()) {
      // Search by a child's interest
      const interest = this.persona.children[0]?.interests?.[0] || 'camp';
      await searchInput.fill(interest);
      await this.page.waitForTimeout(400); // debounce
      const searchResults = await this.page.locator('.camp-card').count();
      if (searchResults === 0 && ['art', 'sports', 'swim', 'dance', 'music', 'nature', 'science'].includes(interest)) {
        await this.reportIssue(`Search for "${interest}" returned no results`, {
          severity: 'medium',
          category: 'search',
          expected: `Results for common activity "${interest}"`,
          actual: 'No matching camps found'
        });
      }
      await searchInput.clear();
      await this.page.waitForTimeout(400);
    } else {
      await this.reportIssue('Search input not visible', {
        severity: 'medium',
        category: 'navigation',
        expected: 'Search input visible on main page',
        actual: 'Could not locate search input'
      });
    }

    // Test category filtering
    const categoryPills = this.page.locator('.category-browse-card, .category-pill, [class*="category"]').first();
    if (await categoryPills.isVisible()) {
      await categoryPills.click();
      await this.page.waitForTimeout(400);
      const filteredCount = await this.page.locator('.camp-card').count();
      // Category filter should change results
      if (filteredCount === campCount && campCount > 5) {
        await this.reportIssue('Category filter did not change results', {
          severity: 'low',
          category: 'filters',
          expected: 'Filtering by category reduces results',
          actual: `Same count (${campCount}) before and after filter`
        });
      }
    }

    // Test price filter for budget-conscious personas
    if (['low', 'lower-middle'].includes(this.persona.income)) {
      const priceSlider = this.page.locator('input[type="range"], [class*="price"], [data-testid="price"]').first();
      if (!(await priceSlider.isVisible())) {
        await this.reportIssue('Price filter not easily accessible for budget users', {
          severity: 'medium',
          category: 'filters',
          expected: 'Price filter visible without extra clicks',
          actual: 'Price filter not immediately visible',
          recommendation: 'Budget-conscious users need price filtering front and center'
        });
      }
    }

    // Test for scholarship info for low-income personas
    if (this.persona.income === 'low') {
      const pageContent = await this.page.content();
      if (!pageContent.toLowerCase().includes('scholarship')) {
        await this.reportIssue('No scholarship information visible', {
          severity: 'medium',
          category: 'content',
          expected: 'Scholarship/financial aid info accessible',
          actual: 'No mention of scholarships on main page',
          recommendation: 'Add scholarship filter or badge for camps offering financial aid'
        });
      }
    }
  }

  async testCampDetails() {
    console.log(`  Testing camp details modal...`);
    await this.navigate();

    // Click first camp card button to open modal
    const firstButton = this.page.locator('.camp-card-button').first();
    if (!(await firstButton.isVisible())) {
      await this.reportIssue('Camp cards not clickable', {
        severity: 'high',
        category: 'interaction',
        expected: 'Camp card buttons visible and clickable',
        actual: 'No camp-card-button found'
      });
      return;
    }

    await firstButton.click();

    // Wait for modal to appear
    const modal = this.page.locator('[role="dialog"], .modal-overlay');
    try {
      await modal.waitFor({ state: 'visible', timeout: 3000 });
    } catch {
      await this.reportIssue('Camp detail modal did not open', {
        severity: 'high',
        category: 'interaction',
        expected: 'Modal opens on card click',
        actual: 'No modal appeared after clicking camp card'
      });
      return;
    }

    // Check modal content quality
    const modalText = await modal.textContent();

    // Price visibility check
    const hasPrice = /\$\d+/.test(modalText);
    if (!hasPrice) {
      await this.reportIssue('Price not visible in camp detail modal', {
        severity: this.persona.income === 'high' ? 'low' : 'high',
        category: 'content',
        expected: 'Price clearly shown in modal',
        actual: 'No dollar amount found in modal text',
        recommendation: 'Price is critical info - should be prominent'
      });
    }

    // Age range check
    const hasAges = /\d+\s*[-–]\s*\d+/.test(modalText) || /ages?\s*\d+/i.test(modalText);
    if (!hasAges) {
      await this.reportIssue('Age range not visible in camp detail modal', {
        severity: 'medium',
        category: 'content',
        expected: 'Age range shown in modal',
        actual: 'Could not find age information'
      });
    }

    // Hours/schedule check for time-constrained parents
    if (this.persona.timeConstrained) {
      const hasHours = /\d+:\d+|am|pm|hours/i.test(modalText);
      if (!hasHours) {
        await this.reportIssue('Schedule/hours not visible for time-constrained user', {
          severity: 'medium',
          category: 'content',
          expected: 'Drop-off/pick-up times visible',
          actual: 'No time information found',
          recommendation: 'Hours critical for working parents scheduling childcare'
        });
      }
    }

    // Extended care check for users who need it
    if (this.persona.priorities.includes('extended-care')) {
      const hasExtended = /extended\s*care|before.*after|early\s*drop/i.test(modalText);
      if (!hasExtended) {
        await this.reportIssue('Extended care info not visible', {
          severity: 'medium',
          category: 'content',
          expected: 'Extended care details in modal',
          actual: 'No extended care information found',
          recommendation: 'Working parents need to quickly assess extended care options'
        });
      }
    }

    // Food/allergy info check
    if (this.persona.specialNeeds?.toLowerCase().includes('allergy') ||
        this.persona.specialNeeds?.toLowerCase().includes('dietary') ||
        this.persona.priorities.includes('allergy-aware')) {
      const hasFoodInfo = /food|meal|snack|allergy|dietary/i.test(modalText);
      if (!hasFoodInfo) {
        await this.reportIssue('Food/allergy info not visible for allergy-aware parent', {
          severity: 'high',
          category: 'content',
          expected: 'Food policies and allergy info visible',
          actual: 'No food/allergy information found',
          recommendation: 'Parents with food-allergic children need this info prominently'
        });
      }
    }

    // Check for website link
    const websiteLink = modal.locator('a[target="_blank"]');
    if ((await websiteLink.count()) === 0) {
      await this.reportIssue('No external website link in modal', {
        severity: 'low',
        category: 'content',
        expected: 'Link to camp website',
        actual: 'No external links found'
      });
    }

    // Check for Add to Schedule button
    const scheduleBtn = modal.locator('button:has-text("Schedule"), button:has-text("Add")');
    if ((await scheduleBtn.count()) === 0) {
      await this.reportIssue('No "Add to Schedule" action in modal', {
        severity: 'medium',
        category: 'interaction',
        expected: 'Button to add camp to schedule',
        actual: 'No schedule action found'
      });
    }

    // Close modal
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
  }

  async testMultipleCampComparison() {
    console.log(`  Testing camp comparison...`);

    // Families with multiple kids benefit most from comparison
    if (this.persona.children.length < 2 && !this.persona.priorities.includes('quality')) return;

    await this.navigate();

    // Look for compare functionality
    const compareButtons = this.page.locator('[aria-label*="compare"], [title*="compare"]');
    const compareCount = await compareButtons.count();

    if (compareCount === 0) {
      await this.reportIssue('Compare feature not discoverable', {
        severity: 'low',
        category: 'feature-discovery',
        expected: 'Compare buttons visible on camp cards',
        actual: 'No compare buttons found',
        recommendation: 'Multi-child families need side-by-side comparison'
      });
      return;
    }

    // Click compare on first two camps
    if (compareCount >= 2) {
      await compareButtons.nth(0).click();
      await this.page.waitForTimeout(200);
      await compareButtons.nth(1).click();
      await this.page.waitForTimeout(500);

      // Check if comparison view appeared
      const comparisonView = this.page.locator('[class*="compare"], [class*="comparison"]');
      if ((await comparisonView.count()) === 0) {
        await this.reportIssue('No comparison view appeared after selecting camps', {
          severity: 'low',
          category: 'interaction',
          expected: 'Side-by-side comparison view',
          actual: 'No comparison UI appeared'
        });
      }
    }
  }

  async testResponsive() {
    console.log(`  Testing responsive/mobile...`);

    // Set mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.navigate();

    // Check camps are visible on mobile
    const mobileCards = await this.page.locator('.camp-card').count();
    if (mobileCards === 0) {
      await this.reportIssue('Camps not visible on mobile viewport', {
        severity: 'high',
        category: 'responsive',
        expected: 'Camps display on 375px viewport',
        actual: 'No camps visible on mobile'
      });
    }

    // Check if filters are accessible on mobile
    const filtersVisible = await this.page.locator('input[type="text"], [class*="filter"]').first().isVisible();
    if (!filtersVisible) {
      await this.reportIssue('Filters not accessible on mobile', {
        severity: 'medium',
        category: 'responsive',
        expected: 'Search/filter accessible on mobile',
        actual: 'Cannot find filter controls on mobile viewport'
      });
    }

    // Check for horizontal overflow (content wider than viewport)
    const bodyWidth = await this.page.evaluate(() => document.body.scrollWidth);
    if (bodyWidth > 375) {
      await this.reportIssue('Horizontal scroll on mobile', {
        severity: 'medium',
        category: 'responsive',
        expected: 'No horizontal scroll on mobile',
        actual: `Body width ${bodyWidth}px exceeds 375px viewport`,
        recommendation: 'Content overflows on mobile causing awkward horizontal scrolling'
      });
    }

    // Test card click opens inline expansion on mobile (not modal)
    const mobileButton = this.page.locator('.camp-card-button').first();
    if (await mobileButton.isVisible()) {
      await mobileButton.click();
      await this.page.waitForTimeout(500);

      // On mobile, should expand inline not open modal
      const expandedDetails = this.page.locator('.expanded-details');
      const modal = this.page.locator('[role="dialog"]');
      const hasExpanded = await expandedDetails.isVisible();
      const hasModal = await modal.isVisible();

      if (hasModal && !hasExpanded) {
        await this.reportIssue('Modal opens on mobile instead of inline expand', {
          severity: 'medium',
          category: 'responsive',
          expected: 'Inline card expansion on mobile',
          actual: 'Full modal opened on small screen'
        });
      }
    }

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

    const focusedElement = await this.page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const style = window.getComputedStyle(el);
      return {
        tag: el.tagName,
        hasVisibleFocus: style.outlineStyle !== 'none' || style.boxShadow !== 'none'
      };
    });

    if (!focusedElement) {
      await this.reportIssue('Keyboard focus not working', {
        severity: 'high',
        category: 'accessibility',
        expected: 'Focus moves through interactive elements',
        actual: 'No element focused after tabbing'
      });
    }

    // Check for sufficient color contrast on key elements
    const lowContrastElements = await this.page.evaluate(() => {
      const labels = document.querySelectorAll('.camp-quick-info-label, .category-badge, .feature-badge');
      let lowContrast = 0;
      labels.forEach(el => {
        const style = window.getComputedStyle(el);
        const color = style.color;
        // Simple check: very light text on white
        if (color.includes('rgb') && !color.includes('rgba')) {
          const rgb = color.match(/\d+/g).map(Number);
          const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
          if (brightness > 200) lowContrast++;
        }
      });
      return lowContrast;
    });

    if (lowContrastElements > 3) {
      await this.reportIssue(`${lowContrastElements} elements may have low contrast`, {
        severity: 'medium',
        category: 'accessibility',
        expected: 'All text meets WCAG contrast requirements',
        actual: `${lowContrastElements} labels appear very light`,
        recommendation: 'Grandparents and users with vision issues need higher contrast'
      });
    }

    // Check font sizes for low-tech users
    const smallText = await this.page.evaluate(() => {
      const els = document.querySelectorAll('p, span, dd, dt');
      let tooSmall = 0;
      els.forEach(el => {
        const size = parseFloat(window.getComputedStyle(el).fontSize);
        if (size < 12 && el.textContent.trim().length > 0) tooSmall++;
      });
      return tooSmall;
    });

    if (smallText > 5) {
      await this.reportIssue(`${smallText} text elements below 12px`, {
        severity: 'low',
        category: 'accessibility',
        expected: 'Text readable for older users',
        actual: `${smallText} elements with small font size`,
        recommendation: 'Increase minimum font size for readability'
      });
    }
  }

  async testSchedulePlanner() {
    console.log(`  Testing schedule planner...`);

    // Look for planner navigation
    const plannerNav = this.page.locator('button:has-text("Schedule"), button:has-text("Planner"), a:has-text("Schedule"), [class*="planner"]');
    if ((await plannerNav.count()) === 0) {
      await this.reportIssue('Schedule planner not discoverable from main page', {
        severity: 'medium',
        category: 'navigation',
        expected: 'Clear navigation to schedule planner',
        actual: 'No planner link/button found',
        recommendation: 'Planner is a core feature - needs prominent nav'
      });
      return;
    }

    // Don't test further since planner requires auth
  }

  async testDataQuality() {
    console.log(`  Testing data quality...`);
    await this.navigate();

    // Check camp cards have essential info
    const cards = this.page.locator('.camp-card');
    const cardCount = await cards.count();
    let missingPrice = 0;
    let missingAges = 0;
    let missingImages = 0;

    const checkCount = Math.min(cardCount, 10);
    for (let i = 0; i < checkCount; i++) {
      const card = cards.nth(i);
      const cardText = await card.textContent();

      if (!/\$\d+|Free|TBD/i.test(cardText)) missingPrice++;
      if (!/\d+\s*[-–]\s*\d+|all\s*ages/i.test(cardText)) missingAges++;

      const hasImage = await card.locator('.camp-card-image img').count() > 0;
      if (!hasImage) missingImages++;
    }

    if (missingPrice > checkCount * 0.5) {
      await this.reportIssue(`${missingPrice}/${checkCount} camps missing price on cards`, {
        severity: 'medium',
        category: 'data-quality',
        expected: 'All cards show price',
        actual: `${missingPrice} of ${checkCount} checked cards missing price`,
        recommendation: 'Price is top decision factor - should always be visible'
      });
    }

    if (missingImages > checkCount * 0.5) {
      await this.reportIssue(`${missingImages}/${checkCount} camps missing hero images`, {
        severity: 'low',
        category: 'data-quality',
        expected: 'Most camps have visual images',
        actual: `${missingImages} of ${checkCount} camps using fallback gradient`,
        recommendation: 'Images build trust and help visual scanning'
      });
    }
  }

  async testPersonaSpecific() {
    console.log(`  Testing persona-specific scenarios...`);
    await this.navigate();

    // Multi-child families: check if age filter handles ranges well
    if (this.persona.children.length >= 3) {
      const ages = this.persona.children.map(c => c.age);
      const ageSpread = Math.max(...ages) - Math.min(...ages);
      if (ageSpread > 5) {
        // Wide age range - can they find camps for all kids?
        await this.reportIssue('Wide age range family - no multi-child filtering', {
          severity: 'low',
          category: 'feature-gap',
          expected: 'Filter or view showing camps per child',
          actual: 'Single age filter cannot represent multiple children simultaneously',
          recommendation: 'Allow per-child filtering or show age-match indicators per child'
        });
      }
    }

    // Transport-dependent users
    if (this.persona.priorities.includes('reliable-transport') ||
        this.persona.specialNeeds?.includes('transport')) {
      const pageContent = await this.page.content();
      const hasTransportFilter = pageContent.includes('transport') || pageContent.includes('Transport');
      if (!hasTransportFilter) {
        await this.reportIssue('Transport filter not visible for transport-dependent user', {
          severity: 'medium',
          category: 'filters',
          expected: 'Transport filter easily accessible',
          actual: 'Transport filtering requires finding the checkbox',
          recommendation: 'Transport-dependent families need this filter prominent'
        });
      }
    }

    // Special needs families
    if (this.persona.specialNeeds &&
        (this.persona.specialNeeds.includes('Autism') || this.persona.specialNeeds.includes('special'))) {
      const pageContent = await this.page.content();
      const hasSpecialNeeds = /special.needs|inclusion|accommodation|sensory/i.test(pageContent);
      if (!hasSpecialNeeds) {
        await this.reportIssue('No special needs filtering or information', {
          severity: 'medium',
          category: 'feature-gap',
          expected: 'Filter or tags for inclusive/special-needs camps',
          actual: 'No special needs information on main browse',
          recommendation: 'Add inclusion/special-needs badges and filter'
        });
      }
    }

    // Half-day seekers
    if (this.persona.priorities.includes('half-day')) {
      const pageContent = await this.page.content();
      if (!/half.day|morning|afternoon|part.time/i.test(pageContent)) {
        await this.reportIssue('No half-day filter for flexible schedule user', {
          severity: 'low',
          category: 'feature-gap',
          expected: 'Filter for half-day vs full-day camps',
          actual: 'No schedule-type filter available',
          recommendation: 'Allow filtering by half-day/full-day/flexible'
        });
      }
    }
  }

  async runAllTests() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing as: ${this.persona.name}`);
    console.log(`Background: ${this.persona.background}`);
    console.log(`Tech: ${this.persona.techSavvy} | Income: ${this.persona.income} | Children: ${this.persona.children.length} (ages ${this.persona.children.map(c => c.age).join(', ')})`);
    console.log(`Priorities: ${this.persona.priorities.join(', ')}`);
    if (this.persona.specialNeeds) console.log(`Special needs: ${this.persona.specialNeeds}`);
    console.log(`${'='.repeat(60)}`);

    await this.testCampDiscovery();
    await this.testCampDetails();
    await this.testDataQuality();
    await this.testPersonaSpecific();

    // Only test comparison for multi-child or quality-focused
    if (this.persona.children.length >= 2 || this.persona.priorities.includes('quality')) {
      await this.testMultipleCampComparison();
    }

    // Test responsive for mobile-likely users (time-constrained, low-tech)
    if (this.persona.timeConstrained || this.persona.techSavvy === 'low') {
      await this.testResponsive();
    }

    // Test accessibility for users who need it most
    if (['very-low', 'low'].includes(this.persona.techSavvy) || this.persona.id.startsWith('gp-')) {
      await this.testAccessibility();
    }

    // Test planner discoverability
    await this.testSchedulePlanner();

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

      if (issues.length > 0) {
        console.log(`\n  Issues found for ${persona.name}:`);
        issues.forEach(issue => {
          console.log(`    - [${issue.severity}] ${issue.title}${issue.recommendation ? ` → ${issue.recommendation}` : ''}`);
        });
      }
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
        issueGroups[issue.title] = { count: 0, personas: [], severity: issue.severity, category: issue.category, recommendation: issue.recommendation };
      }
      issueGroups[issue.title].count++;
      issueGroups[issue.title].personas.push(issue.persona);
    });

    console.log('\n--- MOST COMMON ISSUES ---');
    Object.entries(issueGroups)
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([title, data]) => {
        console.log(`\n  [${data.severity.toUpperCase()}] "${title}" (${data.count} personas)`);
        console.log(`    Category: ${data.category}`);
        if (data.recommendation) console.log(`    Recommendation: ${data.recommendation}`);
        if (data.count <= 5) console.log(`    Affected: ${data.personas.join(', ')}`);
      });

    // Group by category
    const categories = {};
    allIssues.forEach(issue => {
      if (!categories[issue.category]) categories[issue.category] = [];
      categories[issue.category].push(issue);
    });

    console.log('\n--- ISSUES BY CATEGORY ---');
    Object.entries(categories)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([category, issues]) => {
        console.log(`  ${category}: ${issues.length} issues`);
      });

    // Personas with most issues (most underserved users)
    const personaIssueCounts = {};
    allIssues.forEach(issue => {
      if (!personaIssueCounts[issue.persona]) personaIssueCounts[issue.persona] = { count: 0, highCount: 0 };
      personaIssueCounts[issue.persona].count++;
      if (issue.severity === 'high' || issue.severity === 'critical') personaIssueCounts[issue.persona].highCount++;
    });

    console.log('\n--- MOST UNDERSERVED PERSONAS ---');
    Object.entries(personaIssueCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .forEach(([persona, data]) => {
        console.log(`  ${persona}: ${data.count} total (${data.highCount} high/critical)`);
      });

    // Feature gap analysis
    const featureGaps = allIssues.filter(i => i.category === 'feature-gap');
    if (featureGaps.length > 0) {
      console.log('\n--- FEATURE GAPS ---');
      const gapTitles = [...new Set(featureGaps.map(i => i.title))];
      gapTitles.forEach(title => {
        const gap = featureGaps.find(i => i.title === title);
        console.log(`  - ${title}`);
        if (gap.recommendation) console.log(`    → ${gap.recommendation}`);
      });
    }

    // Recommendations summary
    const recommendations = [...new Set(allIssues.filter(i => i.recommendation).map(i => i.recommendation))];
    if (recommendations.length > 0) {
      console.log('\n--- ALL RECOMMENDATIONS ---');
      recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    }

    console.log('\n' + '='.repeat(80));
  });
});
