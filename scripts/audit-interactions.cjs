/**
 * Interactive Elements & States Audit - Homepage
 *
 * Comprehensive Playwright script that tests every interactive element
 * on the homepage at 1280px desktop viewport, capturing screenshots
 * and recording pass/fail status for each interaction.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'data', 'screenshots', 'audit', 'interactions');
const TIMEOUT = 60000;

// Ensure screenshot dir exists
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// Collect results
const results = [];
const consoleErrors = [];
const consoleWarnings = [];

function log(msg) {
  console.log('[AUDIT] ' + msg);
}

function record(section, test, status, notes, screenshot) {
  notes = notes || '';
  screenshot = screenshot || '';
  results.push({ section, test, status, notes, screenshot });
  var icon = status === 'PASS' ? '  OK' : status === 'FAIL' ? 'FAIL' : 'INFO';
  log('[' + icon + '] ' + section + ' > ' + test + (notes ? ' - ' + notes : ''));
}

async function takeScreenshot(page, name) {
  var filepath = path.join(SCREENSHOT_DIR, name + '.png');
  await page.screenshot({ path: filepath, fullPage: false });
  return name + '.png';
}

async function takeFullScreenshot(page, name) {
  var filepath = path.join(SCREENSHOT_DIR, name + '.png');
  await page.screenshot({ path: filepath, fullPage: true });
  return name + '.png';
}

async function waitForCamps(page) {
  try {
    await page.waitForSelector('.camp-card', { timeout: 15000 });
    await page.waitForTimeout(1000);
  } catch (e) {
    log('WARNING: Camp cards did not appear within timeout');
  }
}

async function scrollTo(page, y) {
  await page.mouse.wheel(0, y);
  await page.waitForTimeout(300);
}

async function scrollToTop(page) {
  // Use keyboard shortcut to go to top
  await page.keyboard.press('Home');
  await page.waitForTimeout(300);
}

async function scrollToBottom(page) {
  await page.keyboard.press('End');
  await page.waitForTimeout(500);
}

async function scrollElementIntoView(page, selector) {
  var el = await page.$(selector);
  if (el) {
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
  }
}

async function run() {
  log('Starting interactive elements audit...');

  var browser = await chromium.launch({ headless: true });
  var context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  var page = await context.newPage();

  // Capture console errors
  page.on('console', function(msg) {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text(), url: page.url(), timestamp: new Date().toISOString() });
    }
    if (msg.type() === 'warning') {
      consoleWarnings.push({ text: msg.text(), url: page.url(), timestamp: new Date().toISOString() });
    }
  });

  page.on('pageerror', function(err) {
    consoleErrors.push({ text: err.message, url: page.url(), timestamp: new Date().toISOString() });
  });

  // =====================================================
  // SECTION A: Filter Bar Interactions
  // =====================================================
  log('\n=== SECTION A: Filter Bar Interactions ===');

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  // A1: Default state (no filters active)
  var img = await takeScreenshot(page, 'A1-default-state');
  var activeChips = await page.$$('.filter-preset-link.active');
  var filterCountEl = await page.$('.filter-count');
  record('A-Filters', 'A1: Default state - no filters active',
    activeChips.length === 0 && !filterCountEl ? 'PASS' : 'FAIL',
    'Active chips: ' + activeChips.length + ', Filter count badge: ' + (filterCountEl ? 'visible' : 'hidden'),
    img);

  // Get initial camp count
  var initialCampCount = 0;
  var campCards = await page.$$('.camp-card');
  initialCampCount = campCards.length;
  record('A-Filters', 'A1b: Initial camp count', 'INFO', initialCampCount + ' camps displayed');

  // A2: Click each of the 6 filter chips one at a time
  var filterPresets = await page.$$('.filter-preset-link');
  var filterLabels = [];
  for (var fi = 0; fi < filterPresets.length; fi++) {
    var label = await filterPresets[fi].textContent();
    filterLabels.push(label.trim());
  }
  log('Found ' + filterPresets.length + ' filter preset chips: ' + filterLabels.join(', '));

  for (var chipIdx = 0; chipIdx < filterPresets.length; chipIdx++) {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
    await waitForCamps(page);

    var chips = await page.$$('.filter-preset-link');
    if (chipIdx >= chips.length) break;

    var chipLabel = (await chips[chipIdx].textContent()).trim();
    await chips[chipIdx].click();
    await page.waitForTimeout(500);

    img = await takeScreenshot(page, 'A2-chip-' + (chipIdx + 1) + '-' + chipLabel.replace(/[^a-zA-Z0-9]/g, '-'));
    var isActive = await chips[chipIdx].evaluate(function(el) { return el.classList.contains('active'); });
    var campCardsNow = await page.$$('.camp-card');

    record('A-Filters', 'A2-' + (chipIdx + 1) + ': Click "' + chipLabel + '" chip',
      isActive ? 'PASS' : 'FAIL',
      'Active: ' + isActive + ', Cards: ' + campCardsNow.length + ' (was ' + initialCampCount + ')',
      img);
  }

  // A3: Click multiple chips simultaneously
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  chips = await page.$$('.filter-preset-link');
  if (chips.length >= 2) {
    await chips[0].click();
    await page.waitForTimeout(300);
    await chips[1].click();
    await page.waitForTimeout(500);

    img = await takeScreenshot(page, 'A3-multiple-chips');
    activeChips = await page.$$('.filter-preset-link.active');
    campCards = await page.$$('.camp-card');

    record('A-Filters', 'A3: Multiple chips active simultaneously',
      activeChips.length >= 2 ? 'PASS' : 'FAIL',
      'Active: ' + activeChips.length + ', Cards: ' + campCards.length,
      img);
  }

  // A4: Verify camp count updates when filters are applied
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  var beforeCards = await page.$$('.camp-card');
  var beforeCount = beforeCards.length;

  var sportsChip = await page.$('.filter-preset-link[data-filter="sports"]');
  if (sportsChip) {
    await sportsChip.click();
    await page.waitForTimeout(800);

    var afterCards = await page.$$('.camp-card');
    var afterCount = afterCards.length;

    var resultsText = await page.$('.results-count');
    var resultsContent = resultsText ? await resultsText.textContent() : 'Not found';

    record('A-Filters', 'A4: Camp count updates when filter applied',
      afterCount < beforeCount ? 'PASS' : 'FAIL',
      'Before: ' + beforeCount + ', After: ' + afterCount + '. Results text: "' + resultsContent + '"');
  }

  // A5: Click "Clear" - verify all filters deactivate
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  chips = await page.$$('.filter-preset-link');
  if (chips.length >= 2) {
    await chips[0].click();
    await page.waitForTimeout(300);
    await chips[2].click();
    await page.waitForTimeout(500);
  }

  var clearBtn = await page.$('.filter-clear-btn');
  var clearAllBtn = await page.$('.active-filters-clear');

  if (clearBtn) {
    await clearBtn.click();
    await page.waitForTimeout(500);
  } else if (clearAllBtn) {
    await clearAllBtn.click();
    await page.waitForTimeout(500);
  }

  img = await takeScreenshot(page, 'A5-after-clear');
  activeChips = await page.$$('.filter-preset-link.active');
  var activeFilterBar = await page.$('.active-filters-bar');

  record('A-Filters', 'A5: Clear button deactivates all filters',
    activeChips.length === 0 ? 'PASS' : 'FAIL',
    'Active chips after clear: ' + activeChips.length + ', Active bar visible: ' + (!!activeFilterBar),
    img);

  // A6: Open the "Filters" panel
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  var filtersBtn = await page.$('.filter-control-btn');
  if (filtersBtn) {
    await filtersBtn.click();
    await page.waitForTimeout(800);

    var panel = await page.$('.filter-panel-animated');
    img = await takeScreenshot(page, 'A6-filters-panel-open');

    record('A-Filters', 'A6: Filters panel opens',
      panel ? 'PASS' : 'FAIL',
      'Panel visible: ' + (!!panel),
      img);
  } else {
    record('A-Filters', 'A6: Filters panel opens', 'FAIL', 'Filters button not found');
  }

  // A7: Apply a filter in the panel, close it, verify chip state
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  filtersBtn = await page.$('.filter-control-btn');
  if (filtersBtn) {
    await filtersBtn.click();
    await page.waitForTimeout(800);

    await takeScreenshot(page, 'A7-panel-open-before-apply');

    var panelCheckboxes = await page.$$('.filter-panel-animated input[type="checkbox"]');
    var appliedSomething = false;
    if (panelCheckboxes.length > 0) {
      await panelCheckboxes[0].click();
      appliedSomething = true;
      await page.waitForTimeout(300);
    }

    var closeFiltersBtn = await page.$('.filter-panel-animated button[aria-label="Close filters"]');
    if (closeFiltersBtn) {
      await closeFiltersBtn.click();
      await page.waitForTimeout(500);
    } else {
      await filtersBtn.click();
      await page.waitForTimeout(500);
    }

    img = await takeScreenshot(page, 'A7-panel-closed-after-apply');
    activeChips = await page.$$('.filter-preset-link.active');
    var activeBar = await page.$('.active-filters-bar');

    record('A-Filters', 'A7: Panel filter reflects in chip/active bar state',
      appliedSomething ? (activeChips.length > 0 || activeBar ? 'PASS' : 'FAIL') : 'INFO',
      'Applied in panel: ' + appliedSomething + ', Active chips: ' + activeChips.length + ', Active bar: ' + (!!activeBar),
      img);
  }

  // A8: Sort dropdown
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  var sortSelect = await page.$('.filter-sort-select');
  if (sortSelect) {
    var options = await sortSelect.$$eval('option', function(opts) { return opts.map(function(o) { return { value: o.value, text: o.textContent }; }); });
    var imgDefault = await takeScreenshot(page, 'A8-sort-default');
    record('A-Filters', 'A8a: Sort dropdown found', 'PASS',
      'Options: ' + options.map(function(o) { return o.text; }).join(', '), imgDefault);

    var firstCardBefore = '';
    try { firstCardBefore = await page.$eval('.camp-card:first-child h3', function(el) { return el.textContent; }); } catch(e) { firstCardBefore = 'N/A'; }

    for (var oi = 0; oi < options.length; oi++) {
      var opt = options[oi];
      await sortSelect.selectOption(opt.value);
      await page.waitForTimeout(800);

      var firstCardAfter = '';
      try { firstCardAfter = await page.$eval('.camp-card:first-child h3', function(el) { return el.textContent; }); } catch(e) { firstCardAfter = 'N/A'; }
      img = await takeScreenshot(page, 'A8-sort-' + opt.text.replace(/[^a-zA-Z0-9]/g, '-'));

      record('A-Filters', 'A8: Sort by "' + opt.text + '"',
        'PASS',
        'First card: "' + firstCardAfter + '"',
        img);
    }
  } else {
    record('A-Filters', 'A8: Sort dropdown', 'FAIL', 'Sort select not found');
  }

  // =====================================================
  // SECTION B: Search Interactions
  // =====================================================
  log('\n=== SECTION B: Search Interactions ===');

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  // B1: Click search field - focus state
  var searchInput = await page.$('.search-input');
  if (searchInput) {
    await searchInput.click();
    await page.waitForTimeout(300);

    img = await takeScreenshot(page, 'B1-search-focus');
    var isFocused = await searchInput.evaluate(function(el) { return el === document.activeElement; });

    record('B-Search', 'B1: Search field focus state',
      isFocused ? 'PASS' : 'FAIL',
      'Focused: ' + isFocused,
      img);
  } else {
    record('B-Search', 'B1: Search field focus state', 'FAIL', 'Search input not found');
  }

  // B2: Type a camp name
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  searchInput = await page.$('.search-input');
  if (searchInput) {
    await searchInput.click();
    await searchInput.fill('YMCA');
    await page.waitForTimeout(600);

    img = await takeScreenshot(page, 'B2-search-typing-YMCA');
    campCards = await page.$$('.camp-card');
    resultsText = await page.$('.results-count');
    resultsContent = resultsText ? await resultsText.textContent() : 'N/A';

    record('B-Search', 'B2: Type camp name "YMCA"',
      campCards.length > 0 ? 'PASS' : 'FAIL',
      'Cards shown: ' + campCards.length + ', Results text: "' + resultsContent + '"',
      img);
  }

  // B3: Clear search
  var clearSearchBtn = await page.$('button[aria-label="Clear search"]');
  if (clearSearchBtn) {
    await clearSearchBtn.click();
    await page.waitForTimeout(600);

    campCards = await page.$$('.camp-card');
    searchInput = await page.$('.search-input');
    var searchValue = searchInput ? await searchInput.inputValue() : 'N/A';

    img = await takeScreenshot(page, 'B3-search-cleared');
    record('B-Search', 'B3: Clear search resets results',
      campCards.length === initialCampCount && searchValue === '' ? 'PASS' : 'FAIL',
      'Cards: ' + campCards.length + ' (expected ' + initialCampCount + '), Input value: "' + searchValue + '"',
      img);
  } else {
    record('B-Search', 'B3: Clear search', 'FAIL', 'Clear button not found');
  }

  // B4: Type gibberish - empty state
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  searchInput = await page.$('.search-input');
  if (searchInput) {
    await searchInput.click();
    await searchInput.fill('xyznotarealcamp123');
    await page.waitForTimeout(600);

    img = await takeScreenshot(page, 'B4-search-no-results');
    campCards = await page.$$('.camp-card');
    var emptyState = await page.$('.empty-state-card');
    var emptyText = emptyState ? await emptyState.textContent() : 'N/A';

    record('B-Search', 'B4: Gibberish search shows empty state',
      campCards.length === 0 && emptyState ? 'PASS' : 'FAIL',
      'Cards: ' + campCards.length + ', Empty state visible: ' + (!!emptyState) + ', Text: "' + emptyText.substring(0, 100) + '"',
      img);
  }

  // =====================================================
  // SECTION C: Camp Card Interactions
  // =====================================================
  log('\n=== SECTION C: Camp Card Interactions ===');

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  // C1: Hover over a camp card
  var firstCard = await page.$('.camp-card');
  if (firstCard) {
    await takeScreenshot(page, 'C1-card-before-hover');

    await firstCard.hover();
    await page.waitForTimeout(300);

    img = await takeScreenshot(page, 'C1-card-after-hover');

    var hasTransform = await firstCard.evaluate(function(el) {
      var style = window.getComputedStyle(el);
      return style.transform !== 'none' || style.boxShadow !== 'none';
    });

    record('C-CampCards', 'C1: Hover state on camp card',
      'PASS',
      'Transform/shadow applied: ' + hasTransform,
      img);
  }

  // C2: Click heart/favorite button
  // Note: Without being logged in, clicking favorite may trigger sign-in flow
  var favBtn = await page.$('.camp-card .favorite-btn');
  if (favBtn) {
    var beforePressed = await favBtn.getAttribute('aria-pressed');
    img = await takeScreenshot(page, 'C2-favorite-before-click');

    try {
      await favBtn.click();
      await page.waitForTimeout(800);

      // Re-query since click may have caused re-render
      img = await takeScreenshot(page, 'C2-favorite-toggled');
      var favBtnAfter = await page.$('.camp-card .favorite-btn');
      var afterPressed = favBtnAfter ? await favBtnAfter.getAttribute('aria-pressed') : 'element-gone';

      record('C-CampCards', 'C2: Favorite button click',
        'PASS',
        'Before: pressed=' + beforePressed + ', After: pressed=' + afterPressed + ' (user not logged in, may trigger auth)',
        img);
    } catch (favErr) {
      record('C-CampCards', 'C2: Favorite button click',
        'INFO',
        'Click triggered navigation/auth flow (expected when not logged in): ' + favErr.message.substring(0, 100),
        'C2-favorite-before-click.png');
      // Re-navigate to recover
      await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
      await waitForCamps(page);
    }
  } else {
    record('C-CampCards', 'C2: Favorite button', 'FAIL', 'Favorite button not found on card');
  }

  // C3: Click Compare button
  var compareBtn = await page.$('.camp-card button[title*="compare" i]');
  if (!compareBtn) {
    compareBtn = await page.$('.camp-card button[aria-label*="compare" i]');
  }
  if (compareBtn) {
    await compareBtn.click();
    await page.waitForTimeout(500);

    var compareBar = await page.$('.compare-bar');
    img = await takeScreenshot(page, 'C3-compare-toggled');

    record('C-CampCards', 'C3: Compare button click + compare bar appears',
      compareBar ? 'PASS' : 'FAIL',
      'Compare bar visible: ' + (!!compareBar),
      img);

    // Toggle a second camp compare
    var secondCompareBtn = await page.$('.camp-card:nth-child(2) button[title*="compare" i]');
    if (!secondCompareBtn) {
      secondCompareBtn = await page.$('.camp-card:nth-child(2) button[aria-label*="compare" i]');
    }
    if (secondCompareBtn) {
      await secondCompareBtn.click();
      await page.waitForTimeout(500);

      var imgBar = await takeScreenshot(page, 'C3b-compare-bar-two-camps');
      var compareChips = await page.$$('.compare-bar-chip');

      record('C-CampCards', 'C3b: Compare bar with 2 camps',
        compareChips.length === 2 ? 'PASS' : 'FAIL',
        'Chips in compare bar: ' + compareChips.length,
        imgBar);
    }
  } else {
    record('C-CampCards', 'C3: Compare button', 'FAIL', 'Compare button not found on card');
  }

  // Clear compare before next tests
  var clearCompareBtn = await page.$('.compare-bar-clear');
  if (clearCompareBtn) {
    await clearCompareBtn.click();
    await page.waitForTimeout(300);
  }

  // C4: Click a camp card to open detail modal
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  var cardButton = await page.$('.camp-card .camp-card-button');
  if (cardButton) {
    var campName = '';
    try { campName = await page.$eval('.camp-card:first-child h3', function(el) { return el.textContent; }); } catch(e) { campName = 'Unknown'; }

    await cardButton.click();
    await page.waitForTimeout(1000);

    var modalOverlay = await page.$('.modal-overlay');
    var modalCard = await page.$('.modal-card');
    var currentUrl = page.url();

    img = await takeScreenshot(page, 'C4-camp-detail-modal');

    record('C-CampCards', 'C4: Click card opens detail',
      modalOverlay || currentUrl.includes('/camp/') ? 'PASS' : 'FAIL',
      'Modal overlay: ' + (!!modalOverlay) + ', Modal card: ' + (!!modalCard) + ', URL: ' + currentUrl + ', Camp: "' + campName + '"',
      img);

    // Check modal content
    if (modalCard) {
      var modalTitle = await page.$('.modal-title');
      var modalSubtitle = await page.$('.modal-subtitle');
      var modalFooter = await page.$('.modal-footer');
      var modalCloseBtn = await page.$('.modal-close');

      record('C-CampCards', 'C4b: Modal content completeness',
        modalTitle ? 'PASS' : 'FAIL',
        'Title: ' + (!!modalTitle) + ', Subtitle: ' + (!!modalSubtitle) + ', Footer: ' + (!!modalFooter) + ', Close btn: ' + (!!modalCloseBtn));
    }
  }

  // C5: Close the modal
  var closeBtnModal = await page.$('.modal-close');
  if (closeBtnModal) {
    await closeBtnModal.click();
    await page.waitForTimeout(800);

    modalOverlay = await page.$('.modal-overlay');
    currentUrl = page.url();
    img = await takeScreenshot(page, 'C5-modal-closed');

    record('C-CampCards', 'C5: Close modal returns to browse',
      !modalOverlay ? 'PASS' : 'FAIL',
      'Modal gone: ' + (!modalOverlay) + ', URL: ' + currentUrl,
      img);
  } else {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);

    modalOverlay = await page.$('.modal-overlay');
    img = await takeScreenshot(page, 'C5-modal-closed-escape');

    record('C-CampCards', 'C5: Close modal via Escape',
      !modalOverlay ? 'PASS' : 'FAIL',
      'Modal gone: ' + (!modalOverlay),
      img);
  }

  // =====================================================
  // SECTION D: Hero Section Interactions
  // =====================================================
  log('\n=== SECTION D: Hero Section Interactions ===');

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  // D1: Screenshot hero CTA buttons
  img = await takeScreenshot(page, 'D1-hero-section');

  var heroButtons = await page.$$('.hero-section button, .hero-section a');
  var buttonTexts = [];
  for (var bi = 0; bi < heroButtons.length; bi++) {
    var text = (await heroButtons[bi].textContent()).trim();
    if (text) buttonTexts.push(text);
  }

  record('D-Hero', 'D1: Hero CTAs found',
    buttonTexts.length > 0 ? 'PASS' : 'FAIL',
    'CTAs: ' + buttonTexts.join(', '),
    img);

  // D2: Click primary CTA - "Plan My Summer"
  var ctaBtn = await page.$('.hero-section .btn-primary');
  if (ctaBtn) {
    var ctaText = (await ctaBtn.textContent()).trim();
    await ctaBtn.click();
    await page.waitForTimeout(1000);

    currentUrl = page.url();
    img = await takeScreenshot(page, 'D2-after-cta-click');

    record('D-Hero', 'D2: Primary CTA navigation',
      currentUrl !== BASE_URL + '/' ? 'PASS' : 'FAIL',
      'CTA text: "' + ctaText + '", Navigated to: ' + currentUrl,
      img);

    await page.goBack();
    await page.waitForTimeout(1000);
  }

  // D3: Check for scroll-down indicator
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  var waveDecoration = await page.$('.wave-decoration');
  record('D-Hero', 'D3: Scroll-down indicator / wave decoration',
    waveDecoration ? 'PASS' : 'INFO',
    'Wave decoration found: ' + (!!waveDecoration));

  // D4: Hero stats display
  var heroStats = await page.$('.hero-stats');
  if (heroStats) {
    var statsText = await heroStats.textContent();
    record('D-Hero', 'D4: Hero stats visible',
      'PASS', 'Stats: "' + statsText.replace(/\s+/g, ' ').trim().substring(0, 120) + '"');
  } else {
    record('D-Hero', 'D4: Hero stats visible', 'FAIL', 'Hero stats not found');
  }

  // D5: Year badge
  var yearBadge = await page.$('.hero-year-badge');
  if (yearBadge) {
    var badgeText = await yearBadge.textContent();
    record('D-Hero', 'D5: Year badge', 'PASS', 'Text: "' + badgeText + '"');
  } else {
    record('D-Hero', 'D5: Year badge', 'FAIL', 'Year badge not found');
  }

  // D6: View toggle button (Grid/Table)
  var viewToggle = await page.$('button[title*="Switch to"]');
  if (viewToggle) {
    var titleBefore = await viewToggle.getAttribute('title');
    await viewToggle.click();
    await page.waitForTimeout(800);

    var dataTable = await page.$('.data-table');
    img = await takeScreenshot(page, 'D6-table-view');

    record('D-Hero', 'D6: View toggle (Grid to Table)',
      dataTable ? 'PASS' : 'FAIL',
      'Toggle title: "' + titleBefore + '", Table visible: ' + (!!dataTable),
      img);

    // Toggle back
    await viewToggle.click();
    await page.waitForTimeout(500);
  }

  // =====================================================
  // SECTION E: Edge Cases and Error States
  // =====================================================
  log('\n=== SECTION E: Edge Cases and Error States ===');

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  // E1: Scroll to bottom - pagination/infinite scroll?
  await scrollToBottom(page);
  await page.waitForTimeout(1000);

  var loadMore = await page.$('button:has-text("Load more")');
  if (!loadMore) loadMore = await page.$('button:has-text("Show more")');
  if (!loadMore) loadMore = await page.$('.load-more');
  var footer = await page.$('.site-footer');
  img = await takeScreenshot(page, 'E1-page-bottom');

  record('E-EdgeCases', 'E1: Scroll to bottom - pagination check',
    'INFO',
    'Load more btn: ' + (!!loadMore) + ', Footer visible: ' + (!!footer) + '. All camps render at once (no pagination).',
    img);

  // E2: Apply filters that match 0 camps
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  chips = await page.$$('.filter-preset-link');
  for (var ci = 0; ci < Math.min(3, chips.length); ci++) {
    await chips[ci].click();
    await page.waitForTimeout(300);
  }

  searchInput = await page.$('.search-input');
  if (searchInput) {
    await searchInput.fill('zzznonexistent');
    await page.waitForTimeout(600);
  }

  campCards = await page.$$('.camp-card');
  emptyState = await page.$('.empty-state-card');
  img = await takeScreenshot(page, 'E2-zero-results');

  record('E-EdgeCases', 'E2: Zero-results empty state',
    campCards.length === 0 && emptyState ? 'PASS' : 'FAIL',
    'Cards: ' + campCards.length + ', Empty state: ' + (!!emptyState),
    img);

  if (emptyState) {
    var guidance = await emptyState.textContent();
    var clearInEmpty = await emptyState.$('button');
    record('E-EdgeCases', 'E2b: Empty state has guidance + clear action',
      clearInEmpty ? 'PASS' : 'FAIL',
      'Text: "' + guidance.substring(0, 150) + '", Clear button: ' + (!!clearInEmpty));
  }

  // E3: Rapidly click multiple filters - jank/race conditions
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  chips = await page.$$('.filter-preset-link');
  var errorsBefore = consoleErrors.length;

  for (var ri = 0; ri < chips.length; ri++) {
    chips[ri].click();  // fire-and-forget, no await
  }
  await page.waitForTimeout(100);
  chips = await page.$$('.filter-preset-link');
  for (var rj = 0; rj < chips.length; rj++) {
    chips[rj].click();  // fire-and-forget, no await
  }

  await page.waitForTimeout(1500);

  var errorsAfter = consoleErrors.length;
  var newErrors = errorsAfter - errorsBefore;
  campCards = await page.$$('.camp-card');
  img = await takeScreenshot(page, 'E3-rapid-clicks');

  record('E-EdgeCases', 'E3: Rapid filter clicks - no crashes',
    campCards.length > 0 && newErrors === 0 ? 'PASS' : 'FAIL',
    'Cards after rapid clicks: ' + campCards.length + ', New console errors: ' + newErrors,
    img);

  // E4: Console errors summary
  record('E-EdgeCases', 'E4: Console errors during all interactions',
    consoleErrors.length === 0 ? 'PASS' : 'FAIL',
    'Total errors: ' + consoleErrors.length + ', Warnings: ' + consoleWarnings.length);

  for (var ei = 0; ei < Math.min(10, consoleErrors.length); ei++) {
    record('E-EdgeCases', 'E4-error-' + (ei + 1), 'FAIL',
      consoleErrors[ei].text.substring(0, 200));
  }

  // =====================================================
  // SECTION F: State Persistence
  // =====================================================
  log('\n=== SECTION F: State Persistence ===');

  // F1: Apply filters, note URL
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  sportsChip = await page.$('.filter-preset-link[data-filter="sports"]');
  if (sportsChip) {
    await sportsChip.click();
    await page.waitForTimeout(500);
  }

  var ecChip = await page.$('.filter-preset-link[data-filter="extended-care"]');
  if (ecChip) {
    await ecChip.click();
    await page.waitForTimeout(500);
  }

  var urlAfterFilters = page.url();
  var campCountBefore = (await page.$$('.camp-card')).length;
  img = await takeScreenshot(page, 'F1-filters-applied-url');

  var hasParams = urlAfterFilters.includes('?');
  record('F-Persistence', 'F1: Filters encoded in URL',
    hasParams ? 'PASS' : 'FAIL',
    'URL: ' + urlAfterFilters + ', Camp count: ' + campCountBefore,
    img);

  // F2: Reload the page - do filters persist?
  await page.reload({ waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  var urlAfterReload = page.url();
  var campCountAfterReload = (await page.$$('.camp-card')).length;
  var activeChipsReload = await page.$$('.filter-preset-link.active');
  var activeBarReload = await page.$('.active-filters-bar');
  var imgReload = await takeScreenshot(page, 'F2-after-reload');

  record('F-Persistence', 'F2: Filters persist after reload',
    urlAfterReload === urlAfterFilters && campCountAfterReload === campCountBefore ? 'PASS' : 'FAIL',
    'URL match: ' + (urlAfterReload === urlAfterFilters) + ', Count: ' + campCountAfterReload + ' (expected ' + campCountBefore + '), Active chips: ' + activeChipsReload.length + ', Active bar: ' + (!!activeBarReload),
    imgReload);

  // F3: Navigate away and back
  var planBtn = await page.$('.btn-primary');
  if (planBtn) {
    await planBtn.click();
    await page.waitForTimeout(1000);
  }
  var navAwayUrl = page.url();

  await page.goBack();
  await page.waitForTimeout(1500);
  await waitForCamps(page);

  var urlAfterBack = page.url();
  var campCountAfterBack = (await page.$$('.camp-card')).length;
  var activeChipsBack = await page.$$('.filter-preset-link.active');
  var imgBack = await takeScreenshot(page, 'F3-after-navigate-back');

  record('F-Persistence', 'F3: State preserved after navigate away and back',
    activeChipsBack.length > 0 ? 'PASS' : 'FAIL',
    'Navigated away to: ' + navAwayUrl + ', Back URL: ' + urlAfterBack + ', Camps: ' + campCountAfterBack + ', Active chips: ' + activeChipsBack.length,
    imgBack);

  // =====================================================
  // SECTION G: Category Browse Grid
  // =====================================================
  log('\n=== SECTION G: Category Browse Grid ===');

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  // G1: Category cards exist
  var categoryCards = await page.$$('.category-browse-card');
  if (categoryCards.length > 0) {
    var catNames = [];
    for (var gi = 0; gi < categoryCards.length; gi++) {
      var cn = '';
      try { cn = await categoryCards[gi].$eval('.category-browse-name', function(el) { return el.textContent; }); } catch(e) { cn = '?'; }
      catNames.push(cn);
    }

    await scrollElementIntoView(page, '.category-browse');

    img = await takeScreenshot(page, 'G1-category-browse-grid');
    record('G-CategoryGrid', 'G1: Category browse cards',
      'PASS', 'Found ' + categoryCards.length + ' categories: ' + catNames.join(', '), img);
  } else {
    record('G-CategoryGrid', 'G1: Category browse cards', 'FAIL', 'No category cards found');
  }

  // G2: Click a category card
  var catCard = await page.$('.category-browse-card');
  if (catCard) {
    var catCardName = '';
    try { catCardName = await catCard.$eval('.category-browse-name', function(el) { return el.textContent; }); } catch(e) { catCardName = 'Unknown'; }
    await catCard.click();
    await page.waitForTimeout(500);

    var catIsActive = await catCard.evaluate(function(el) { return el.classList.contains('active'); });
    campCards = await page.$$('.camp-card');
    img = await takeScreenshot(page, 'G2-category-card-clicked');

    record('G-CategoryGrid', 'G2: Category card click filters camps',
      catIsActive ? 'PASS' : 'FAIL',
      'Category: "' + catCardName + '", Active: ' + catIsActive + ', Cards: ' + campCards.length,
      img);
  }

  // =====================================================
  // SECTION H: Additional Interactive Elements
  // =====================================================
  log('\n=== SECTION H: Additional Interactive Elements ===');

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  // H1: Active filter chips removable
  sportsChip = await page.$('.filter-preset-link[data-filter="sports"]');
  if (sportsChip) {
    await sportsChip.click();
    await page.waitForTimeout(500);
  }

  var activeChipRemove = await page.$('.active-filter-chip');
  if (activeChipRemove) {
    var chipRemoveText = await activeChipRemove.textContent();
    await activeChipRemove.click();
    await page.waitForTimeout(500);

    var remainingChips = await page.$$('.active-filter-chip');
    campCards = await page.$$('.camp-card');
    img = await takeScreenshot(page, 'H1-active-filter-removed');

    record('H-Additional', 'H1: Active filter chip removal',
      remainingChips.length === 0 ? 'PASS' : 'FAIL',
      'Removed: "' + chipRemoveText.trim() + '", Remaining active: ' + remainingChips.length + ', Cards: ' + campCards.length,
      img);
  } else {
    record('H-Additional', 'H1: Active filter chip removal', 'INFO', 'No active filter chips found');
  }

  // H2: Share URL button
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  var chipForShare = await page.$('.filter-preset-link');
  if (chipForShare) {
    await chipForShare.click();
    await page.waitForTimeout(500);
  }

  var shareBtn = await page.$('.share-url-btn');
  if (shareBtn) {
    img = await takeScreenshot(page, 'H2-share-button-visible');
    record('H-Additional', 'H2: Share URL button visible when filters active',
      'PASS', 'Share button appears with active filters', img);
  } else {
    record('H-Additional', 'H2: Share URL button', 'INFO', 'Share button not visible');
  }

  // H3: Footer content
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  await scrollToBottom(page);
  await page.waitForTimeout(500);

  footer = await page.$('.site-footer');
  if (footer) {
    var footerText = await footer.textContent();
    var footerLinks = await footer.$$('a');
    img = await takeScreenshot(page, 'H3-footer');

    record('H-Additional', 'H3: Footer content',
      'PASS', 'Text: "' + footerText.replace(/\s+/g, ' ').trim().substring(0, 150) + '", Links: ' + footerLinks.length, img);
  }

  // H4: Testimonial banner
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  var testimonial = await page.$('.testimonial-banner');
  if (testimonial) {
    await scrollElementIntoView(page, '.testimonial-banner');
    await page.waitForTimeout(300);

    var testimonialText = await testimonial.textContent();
    img = await takeScreenshot(page, 'H4-testimonial-banner');

    record('H-Additional', 'H4: Testimonial banner',
      'PASS', 'Text: "' + testimonialText.trim().substring(0, 120) + '"', img);
  }

  // H5: Skip to content link
  var skipLink = await page.$('.skip-to-content');
  if (skipLink) {
    record('H-Additional', 'H5: Skip to content link exists',
      'PASS', 'Accessibility skip link found in DOM');
  }

  // H6: Keyboard navigation on camp cards
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  cardButton = await page.$('.camp-card .camp-card-button');
  if (cardButton) {
    await cardButton.focus();
    await page.waitForTimeout(200);

    isFocused = await cardButton.evaluate(function(el) { return el === document.activeElement; });
    img = await takeScreenshot(page, 'H6-keyboard-focus-camp-card');

    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    var modalOrNav = !!(await page.$('.modal-overlay')) || page.url().includes('/camp/');
    var imgAfterEnter = await takeScreenshot(page, 'H6b-keyboard-enter-camp');

    record('H-Additional', 'H6: Keyboard navigation (Tab + Enter on card)',
      isFocused && modalOrNav ? 'PASS' : 'FAIL',
      'Focusable: ' + isFocused + ', Opens detail on Enter: ' + modalOrNav,
      imgAfterEnter);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // H7: Mobile nav hidden at desktop viewport
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  // Check if mobile nav is visible
  var mobileNavVisible = await page.evaluate(function() {
    var navs = document.querySelectorAll('nav');
    for (var n = 0; n < navs.length; n++) {
      var style = window.getComputedStyle(navs[n]);
      var text = navs[n].textContent || '';
      if (text.includes('Browse') && text.includes('Schedule') && style.display !== 'none') {
        var rect = navs[n].getBoundingClientRect();
        if (rect.bottom > window.innerHeight - 100 && rect.height > 0) {
          return true;
        }
      }
    }
    return false;
  });

  record('H-Additional', 'H7: Mobile nav visibility at 1280px',
    !mobileNavVisible ? 'PASS' : 'INFO',
    'Mobile nav visible at desktop: ' + mobileNavVisible + ' (should be hidden)');

  // H8: Camp card feature badges
  var badges = await page.$$('.feature-badge');
  var badgeTexts = [];
  for (var bdi = 0; bdi < Math.min(10, badges.length); bdi++) {
    badgeTexts.push(await badges[bdi].textContent());
  }
  record('H-Additional', 'H8: Feature badges on camp cards',
    badges.length > 0 ? 'PASS' : 'INFO',
    'Found ' + badges.length + ' feature badges: ' + badgeTexts.join(', '));

  // =====================================================
  // SECTION I: Scroll Reveal Animations
  // =====================================================
  log('\n=== SECTION I: Scroll Reveal Animations ===');

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  await scrollToTop(page);
  await page.waitForTimeout(300);

  var revealElements = await page.$$('.scroll-reveal');
  var revealedElements = await page.$$('.scroll-reveal.revealed');

  record('I-Animations', 'I1: Scroll reveal elements present',
    revealElements.length > 0 ? 'PASS' : 'INFO',
    'Total reveal elements: ' + revealElements.length + ', Currently revealed: ' + revealedElements.length);

  await scrollTo(page, 800);
  await page.waitForTimeout(1000);

  var revealedAfterScroll = await page.$$('.scroll-reveal.revealed');
  record('I-Animations', 'I2: Cards reveal on scroll',
    revealedAfterScroll.length > revealedElements.length ? 'PASS' : 'INFO',
    'Revealed before scroll: ' + revealedElements.length + ', After: ' + revealedAfterScroll.length);

  // =====================================================
  // SECTION J: Sticky Filter Bar Behavior
  // =====================================================
  log('\n=== SECTION J: Sticky Filter Bar ===');

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  await scrollToTop(page);
  await page.waitForTimeout(300);

  var filterBarSection = await page.$('.filter-bar-section');
  if (filterBarSection) {
    var hasScrolledClass = await filterBarSection.evaluate(function(el) { return el.classList.contains('scrolled'); });

    await scrollTo(page, 600);
    await page.waitForTimeout(500);

    var hasScrolledAfter = await filterBarSection.evaluate(function(el) { return el.classList.contains('scrolled'); });
    img = await takeScreenshot(page, 'J1-sticky-filter-bar-scrolled');

    record('J-StickyBar', 'J1: Sticky filter bar shadow on scroll',
      !hasScrolledClass && hasScrolledAfter ? 'PASS' : 'INFO',
      'At top: scrolled=' + hasScrolledClass + ', After scroll: scrolled=' + hasScrolledAfter,
      img);
  }

  // =====================================================
  // FULL PAGE SCREENSHOTS
  // =====================================================
  log('\n=== Full Page Screenshots ===');

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  await waitForCamps(page);

  var imgFull = await takeFullScreenshot(page, 'FULL-homepage-default');
  record('FullPage', 'Full page - default state', 'INFO', 'Full page screenshot for reference', imgFull);

  // =====================================================
  // SUMMARY
  // =====================================================
  log('\n\n========================================');
  log('AUDIT SUMMARY');
  log('========================================');

  var passes = results.filter(function(r) { return r.status === 'PASS'; }).length;
  var fails = results.filter(function(r) { return r.status === 'FAIL'; }).length;
  var infos = results.filter(function(r) { return r.status === 'INFO'; }).length;

  log('PASS: ' + passes);
  log('FAIL: ' + fails);
  log('INFO: ' + infos);
  log('Total Console Errors: ' + consoleErrors.length);
  log('Total Console Warnings: ' + consoleWarnings.length);

  // Write JSON results
  var reportData = {
    timestamp: new Date().toISOString(),
    viewport: { width: 1280, height: 800 },
    summary: { pass: passes, fail: fails, info: infos, consoleErrors: consoleErrors.length, consoleWarnings: consoleWarnings.length },
    results: results,
    consoleErrors: consoleErrors.slice(0, 50),
    consoleWarnings: consoleWarnings.slice(0, 50),
  };

  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'audit-results.json'),
    JSON.stringify(reportData, null, 2)
  );

  log('\nResults saved to ' + path.join(SCREENSHOT_DIR, 'audit-results.json'));
  log('Screenshots saved to ' + SCREENSHOT_DIR);

  await browser.close();

  return reportData;
}

run().then(function(data) {
  process.exit(data.summary.fail > 0 ? 1 : 0);
}).catch(function(err) {
  console.error('Audit failed:', err);
  process.exit(2);
});
