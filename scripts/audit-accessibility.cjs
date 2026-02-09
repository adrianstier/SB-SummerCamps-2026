/**
 * Comprehensive Accessibility Audit Script
 *
 * Checks:
 * A. axe-core automated audit
 * B. Keyboard navigation audit
 * C. Color contrast audit
 * D. ARIA and semantics audit
 * E. Screen reader simulation (accessible tree)
 */

const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'data', 'screenshots', 'audit', 'a11y');
const REPORT_DIR = path.resolve(__dirname, '..', 'data', 'screenshots', 'audit');
const URL = 'http://localhost:5173';

// Ensure directories exist
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
fs.mkdirSync(REPORT_DIR, { recursive: true });

// Results accumulator
const results = {
  axeViolations: [],
  keyboardIssues: [],
  contrastIssues: [],
  ariaIssues: [],
  semanticIssues: [],
  accessibleTree: null,
  screenshots: [],
  timestamp: new Date().toISOString(),
};

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  results.screenshots.push(filePath);
  return filePath;
}

async function fullPageScreenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  results.screenshots.push(filePath);
  return filePath;
}

// ──────────────────────────────────────────────
// A. AXE-CORE AUTOMATED AUDIT
// ──────────────────────────────────────────────
async function runAxeAudit(page) {
  console.log('\n=== A. Running axe-core audit ===');

  try {
    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();

    results.axeViolations = axeResults.violations.map(v => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      tags: v.tags,
      nodes: v.nodes.map(n => ({
        html: n.html.substring(0, 300),
        target: n.target,
        failureSummary: n.failureSummary,
      })),
    }));

    const bySeverity = {};
    results.axeViolations.forEach(v => {
      bySeverity[v.impact] = (bySeverity[v.impact] || 0) + 1;
    });

    console.log(`  Found ${results.axeViolations.length} violations:`);
    Object.entries(bySeverity).forEach(([impact, count]) => {
      console.log(`    ${impact}: ${count}`);
    });

    // Full-page screenshot for reference
    await fullPageScreenshot(page, '00-full-page');
  } catch (err) {
    console.error('  axe-core error:', err.message);
  }
}

// ──────────────────────────────────────────────
// B. KEYBOARD NAVIGATION AUDIT
// ──────────────────────────────────────────────
async function runKeyboardAudit(page) {
  console.log('\n=== B. Running keyboard navigation audit ===');

  const focusStops = [];
  const keyboardIssues = [];

  // Start from the top of the page
  await page.keyboard.press('Tab');
  await page.waitForTimeout(200);

  // Tab through and capture each focused element
  for (let i = 0; i < 50; i++) {
    const focusInfo = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;

      const rect = el.getBoundingClientRect();
      const styles = window.getComputedStyle(el);
      const pseudoAfter = window.getComputedStyle(el, '::after');
      const pseudoBefore = window.getComputedStyle(el, '::before');

      // Check for visible focus indicator
      const hasOutline = styles.outlineStyle !== 'none' && styles.outlineWidth !== '0px';
      const hasBoxShadow = styles.boxShadow !== 'none';
      const hasBorderChange = styles.borderColor !== '';
      const hasRing = el.classList.toString().includes('ring') || el.classList.toString().includes('focus');

      // Check computed colors to detect focus ring
      const focusStyles = styles.outline || styles.boxShadow || '';
      const hasFocusIndicator = hasOutline || hasBoxShadow || hasRing;

      return {
        tag: el.tagName.toLowerCase(),
        type: el.type || null,
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label'),
        text: (el.textContent || '').trim().substring(0, 80),
        className: el.className?.toString?.()?.substring(0, 100) || '',
        id: el.id || null,
        href: el.href || null,
        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
        hasFocusIndicator,
        outlineStyle: styles.outlineStyle,
        outlineWidth: styles.outlineWidth,
        outlineColor: styles.outlineColor,
        boxShadow: styles.boxShadow?.substring(0, 100),
        tabIndex: el.tabIndex,
        isVisible: rect.width > 0 && rect.height > 0 && styles.visibility !== 'hidden' && styles.display !== 'none',
      };
    });

    if (!focusInfo) break;
    focusStops.push(focusInfo);

    // Take screenshot at key focus points
    const isKeyStop =
      focusInfo.tag === 'input' ||
      focusInfo.ariaLabel?.includes('Search') ||
      focusInfo.ariaLabel?.includes('Filter') ||
      focusInfo.text?.includes('Plan My Summer') ||
      focusInfo.className?.includes('camp-card') ||
      focusInfo.className?.includes('category-browse') ||
      focusInfo.className?.includes('filter-preset') ||
      focusInfo.className?.includes('filter-control') ||
      focusInfo.role === 'button' ||
      i < 8; // First several stops always

    if (isKeyStop && i < 25) {
      await screenshot(page, `01-focus-stop-${String(i).padStart(2, '0')}-${focusInfo.tag}`);
    }

    // Check for issues
    if (!focusInfo.hasFocusIndicator) {
      keyboardIssues.push({
        type: 'no-focus-indicator',
        element: `${focusInfo.tag}${focusInfo.className ? '.' + focusInfo.className.split(' ')[0] : ''}`,
        text: focusInfo.text,
        ariaLabel: focusInfo.ariaLabel,
        stopIndex: i,
      });
    }

    if (!focusInfo.isVisible) {
      keyboardIssues.push({
        type: 'invisible-focus',
        element: `${focusInfo.tag}${focusInfo.className ? '.' + focusInfo.className.split(' ')[0] : ''}`,
        text: focusInfo.text,
        stopIndex: i,
      });
    }

    await page.keyboard.press('Tab');
    await page.waitForTimeout(150);
  }

  // Check logical tab order (no large jumps)
  for (let i = 1; i < focusStops.length; i++) {
    const prev = focusStops[i - 1];
    const curr = focusStops[i];

    // Large vertical jump backwards might indicate tab order issue
    if (curr.rect.top < prev.rect.top - 200) {
      keyboardIssues.push({
        type: 'tab-order-jump',
        from: `${prev.tag} "${prev.text?.substring(0, 30)}" (y: ${Math.round(prev.rect.top)})`,
        to: `${curr.tag} "${curr.text?.substring(0, 30)}" (y: ${Math.round(curr.rect.top)})`,
        jumpDistance: Math.round(prev.rect.top - curr.rect.top),
        stopIndex: i,
      });
    }
  }

  results.keyboardIssues = keyboardIssues;
  results.focusStops = focusStops;

  console.log(`  Captured ${focusStops.length} focus stops`);
  console.log(`  Found ${keyboardIssues.length} keyboard issues:`);
  keyboardIssues.forEach(issue => {
    console.log(`    [${issue.type}] ${issue.element || issue.from} -> ${issue.to || ''}`);
  });
}

// ──────────────────────────────────────────────
// C. COLOR CONTRAST AUDIT
// ──────────────────────────────────────────────
async function runContrastAudit(page) {
  console.log('\n=== C. Running color contrast audit ===');

  const contrastIssues = await page.evaluate(() => {
    const issues = [];

    // Helper to compute relative luminance
    function getLuminance(r, g, b) {
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }

    // Helper to get contrast ratio
    function getContrastRatio(l1, l2) {
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    // Parse CSS color to RGB
    function parseColor(colorStr) {
      if (!colorStr || colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)') return null;
      const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
      return null;
    }

    // Get effective background color (walk up the DOM)
    function getEffectiveBackground(el) {
      let current = el;
      while (current && current !== document.documentElement) {
        const bg = window.getComputedStyle(current).backgroundColor;
        const parsed = parseColor(bg);
        if (parsed && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          return parsed;
        }
        current = current.parentElement;
      }
      return { r: 255, g: 255, b: 255 }; // Default white
    }

    // Check specific selectors
    const selectors = [
      // Filter chips
      { selector: '.filter-preset-link', description: 'Filter chip (inactive)' },
      { selector: '.filter-preset-link.active', description: 'Filter chip (active)' },
      { selector: '.filter-chip', description: 'Quick filter chip' },
      { selector: '.filter-chip--active', description: 'Quick filter chip (active)' },

      // Camp card text
      { selector: '.camp-card h3', description: 'Camp card title' },
      { selector: '.camp-quick-info-label', description: 'Camp card info label' },
      { selector: '.camp-quick-info-value', description: 'Camp card info value' },
      { selector: '.camp-quick-info-value.price', description: 'Camp card price' },
      { selector: '.category-badge', description: 'Category badge' },
      { selector: '.feature-badge', description: 'Feature badge' },

      // Header/hero
      { selector: '.hero-section h1', description: 'Hero heading' },
      { selector: '.hero-subtitle', description: 'Hero subtitle' },
      { selector: '.hero-year-badge', description: 'Year badge' },
      { selector: '.hero-stats span', description: 'Hero stats text' },

      // Buttons
      { selector: '.btn-primary', description: 'Primary button' },
      { selector: '.btn-secondary', description: 'Secondary button' },
      { selector: '.filter-control-btn', description: 'Filter control button' },

      // Links
      { selector: 'a', description: 'Link' },

      // Navigation
      { selector: 'nav a', description: 'Navigation link' },

      // Category browse
      { selector: '.category-browse-name', description: 'Category browse name' },
      { selector: '.category-browse-count', description: 'Category browse count' },

      // Active filter
      { selector: '.active-filter-chip', description: 'Active filter pill' },

      // Results count
      { selector: '.results-count', description: 'Results count text' },

      // Sort select
      { selector: '.filter-sort-select', description: 'Sort dropdown' },

      // Footer
      { selector: '.site-footer span', description: 'Footer text' },
      { selector: '.site-footer p', description: 'Footer paragraph' },

      // Testimonial
      { selector: '.testimonial-quote', description: 'Testimonial text' },
      { selector: '.testimonial-author', description: 'Testimonial author' },
    ];

    selectors.forEach(({ selector, description }) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el, idx) => {
        const styles = window.getComputedStyle(el);
        const fg = parseColor(styles.color);
        const bg = getEffectiveBackground(el);

        if (!fg || !bg) return;

        const fgLum = getLuminance(fg.r, fg.g, fg.b);
        const bgLum = getLuminance(bg.r, bg.g, bg.b);
        const ratio = getContrastRatio(fgLum, bgLum);

        const fontSize = parseFloat(styles.fontSize);
        const fontWeight = parseInt(styles.fontWeight) || 400;
        const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
        const requiredRatio = isLargeText ? 3 : 4.5;

        if (ratio < requiredRatio) {
          issues.push({
            selector,
            description: `${description}${elements.length > 1 ? ` [${idx}]` : ''}`,
            text: (el.textContent || '').trim().substring(0, 60),
            foreground: styles.color,
            background: styles.backgroundColor || 'inherited',
            effectiveBackground: `rgb(${bg.r}, ${bg.g}, ${bg.b})`,
            contrastRatio: Math.round(ratio * 100) / 100,
            requiredRatio,
            isLargeText,
            fontSize: `${fontSize}px`,
            fontWeight,
            wcagLevel: 'AA',
          });
        }
      });
    });

    return issues;
  });

  results.contrastIssues = contrastIssues;

  console.log(`  Found ${contrastIssues.length} contrast issues:`);
  contrastIssues.forEach(issue => {
    console.log(`    [${issue.contrastRatio}:1 < ${issue.requiredRatio}:1] ${issue.description}: "${issue.text?.substring(0, 40)}"`);
  });
}

// ──────────────────────────────────────────────
// D. ARIA AND SEMANTICS AUDIT
// ──────────────────────────────────────────────
async function runAriaAudit(page) {
  console.log('\n=== D. Running ARIA and semantics audit ===');

  const ariaIssues = await page.evaluate(() => {
    const issues = [];

    // 1. Check for accessible names on interactive elements
    const interactiveElements = document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [role="link"], [tabindex]');
    interactiveElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return; // Skip hidden elements

      const hasAriaLabel = el.getAttribute('aria-label');
      const hasAriaLabelledby = el.getAttribute('aria-labelledby');
      const hasTitle = el.getAttribute('title');
      const hasText = (el.textContent || '').trim();
      const hasPlaceholder = el.getAttribute('placeholder');
      const hasValue = el.getAttribute('value');
      const isInput = ['input', 'select', 'textarea'].includes(el.tagName.toLowerCase());
      const hasAssociatedLabel = isInput && el.id && document.querySelector(`label[for="${el.id}"]`);
      const hasWrappingLabel = isInput && el.closest('label');

      const hasAccessibleName = hasAriaLabel || hasAriaLabelledby || hasTitle || hasText || hasPlaceholder || hasValue || hasAssociatedLabel || hasWrappingLabel;

      if (!hasAccessibleName) {
        issues.push({
          type: 'missing-accessible-name',
          element: el.tagName.toLowerCase(),
          html: el.outerHTML.substring(0, 200),
          className: el.className?.toString?.()?.substring(0, 80) || '',
        });
      }
    });

    // 2. Check images for alt text
    const images = document.querySelectorAll('img');
    images.forEach((img) => {
      const rect = img.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const alt = img.getAttribute('alt');
      const ariaLabel = img.getAttribute('aria-label');
      const role = img.getAttribute('role');
      const isDecorativeExplicit = role === 'presentation' || role === 'none' || alt === '';

      if (alt === null && !ariaLabel && !isDecorativeExplicit) {
        issues.push({
          type: 'missing-alt-text',
          element: 'img',
          src: (img.src || '').substring(0, 100),
          html: img.outerHTML.substring(0, 200),
        });
      }
    });

    // 3. Check SVG icons for accessible names
    const svgs = document.querySelectorAll('svg');
    svgs.forEach((svg) => {
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const isHidden = svg.getAttribute('aria-hidden') === 'true';
      const parent = svg.parentElement;
      const parentIsInteractive = parent && (parent.tagName === 'BUTTON' || parent.tagName === 'A' || parent.getAttribute('role') === 'button');

      // SVGs should either be aria-hidden or have their own accessible name
      // Only flag standalone SVGs (not within labeled buttons/links)
      if (!isHidden && !parentIsInteractive && !svg.getAttribute('role') && !svg.getAttribute('aria-label')) {
        const title = svg.querySelector('title');
        if (!title) {
          // Check if it's purely decorative (small icons, etc.)
          const isLikelyDecorative = rect.width <= 24 && rect.height <= 24;
          if (!isLikelyDecorative) {
            issues.push({
              type: 'svg-missing-accessible-info',
              html: svg.outerHTML.substring(0, 150),
              context: parent?.tagName?.toLowerCase() || 'unknown',
            });
          }
        }
      }
    });

    // 4. Check landmark regions
    const landmarks = {
      main: document.querySelectorAll('main, [role="main"]').length,
      nav: document.querySelectorAll('nav, [role="navigation"]').length,
      header: document.querySelectorAll('header, [role="banner"]').length,
      footer: document.querySelectorAll('footer, [role="contentinfo"]').length,
      search: document.querySelectorAll('[role="search"]').length,
    };

    if (landmarks.main === 0) issues.push({ type: 'missing-landmark', landmark: 'main' });
    if (landmarks.nav === 0) issues.push({ type: 'missing-landmark', landmark: 'nav' });
    if (landmarks.header === 0) issues.push({ type: 'missing-landmark', landmark: 'header' });
    if (landmarks.footer === 0) issues.push({ type: 'missing-landmark', landmark: 'footer' });

    // 5. Check heading hierarchy
    const headings = [];
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
      const rect = h.getBoundingClientRect();
      const styles = window.getComputedStyle(h);
      const isVisible = rect.width > 0 && rect.height > 0 && styles.display !== 'none' && styles.visibility !== 'hidden';

      headings.push({
        level: parseInt(h.tagName[1]),
        text: (h.textContent || '').trim().substring(0, 80),
        isVisible,
      });
    });

    // Check for multiple h1s
    const visibleH1s = headings.filter(h => h.level === 1 && h.isVisible);
    if (visibleH1s.length > 1) {
      issues.push({
        type: 'multiple-h1',
        count: visibleH1s.length,
        texts: visibleH1s.map(h => h.text),
      });
    }
    if (visibleH1s.length === 0) {
      issues.push({ type: 'missing-h1' });
    }

    // Check for skipped heading levels
    const visibleHeadings = headings.filter(h => h.isVisible);
    for (let i = 1; i < visibleHeadings.length; i++) {
      const prev = visibleHeadings[i - 1].level;
      const curr = visibleHeadings[i].level;
      if (curr > prev + 1) {
        issues.push({
          type: 'skipped-heading-level',
          from: `h${prev}`,
          to: `h${curr}`,
          skipped: `h${prev + 1}`,
          headingText: visibleHeadings[i].text,
        });
      }
    }

    // 6. Check form inputs have labels
    const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
    inputs.forEach((input) => {
      const rect = input.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const hasLabel = input.id && document.querySelector(`label[for="${input.id}"]`);
      const hasWrappingLabel = input.closest('label');
      const hasAriaLabel = input.getAttribute('aria-label');
      const hasAriaLabelledby = input.getAttribute('aria-labelledby');
      const hasTitle = input.getAttribute('title');

      if (!hasLabel && !hasWrappingLabel && !hasAriaLabel && !hasAriaLabelledby && !hasTitle) {
        issues.push({
          type: 'input-missing-label',
          element: input.tagName.toLowerCase(),
          inputType: input.type || 'text',
          html: input.outerHTML.substring(0, 200),
          placeholder: input.placeholder || null,
        });
      }
    });

    // 7. Check buttons vs links usage
    const linksUsedAsButtons = document.querySelectorAll('a[href="#"], a[href="javascript:"], a:not([href])');
    linksUsedAsButtons.forEach((link) => {
      const rect = link.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      issues.push({
        type: 'link-used-as-button',
        html: link.outerHTML.substring(0, 200),
        text: (link.textContent || '').trim().substring(0, 60),
      });
    });

    // Check for divs/spans acting as buttons without proper roles
    const clickableNonButtons = document.querySelectorAll('[onclick]:not(button):not(a):not(input):not(select)');
    clickableNonButtons.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const hasRole = el.getAttribute('role');
      if (!hasRole) {
        issues.push({
          type: 'clickable-without-role',
          element: el.tagName.toLowerCase(),
          html: el.outerHTML.substring(0, 200),
        });
      }
    });

    // 8. Check touch targets (WCAG 2.5.5 - 44x44px minimum)
    const interactiveForSize = document.querySelectorAll('button, a[href], input, select, [role="button"], [tabindex="0"]');
    interactiveForSize.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      if (rect.width < 44 || rect.height < 44) {
        // Check min-width/min-height CSS
        const styles = window.getComputedStyle(el);
        const minW = parseFloat(styles.minWidth) || 0;
        const minH = parseFloat(styles.minHeight) || 0;

        // Only flag if neither min dimensions nor actual dimensions meet the target
        if ((rect.width < 44 && minW < 44) || (rect.height < 44 && minH < 44)) {
          issues.push({
            type: 'small-touch-target',
            element: el.tagName.toLowerCase(),
            text: (el.textContent || '').trim().substring(0, 50),
            ariaLabel: el.getAttribute('aria-label'),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
        }
      }
    });

    // Store landmarks and headings for the report
    return {
      issues,
      landmarks,
      headings: visibleHeadings,
    };
  });

  results.ariaIssues = ariaIssues.issues;
  results.landmarks = ariaIssues.landmarks;
  results.headings = ariaIssues.headings;

  console.log(`  Landmarks: main=${ariaIssues.landmarks.main}, nav=${ariaIssues.landmarks.nav}, header=${ariaIssues.landmarks.header}, footer=${ariaIssues.landmarks.footer}, search=${ariaIssues.landmarks.search}`);
  console.log(`  Headings: ${ariaIssues.headings.map(h => `h${h.level}:"${h.text.substring(0, 30)}"`).join(', ')}`);
  console.log(`  Found ${ariaIssues.issues.length} ARIA/semantics issues`);

  const typeCounts = {};
  ariaIssues.issues.forEach(i => { typeCounts[i.type] = (typeCounts[i.type] || 0) + 1; });
  Object.entries(typeCounts).forEach(([type, count]) => {
    console.log(`    ${type}: ${count}`);
  });
}

// ──────────────────────────────────────────────
// E. SCREEN READER SIMULATION
// ──────────────────────────────────────────────
async function runScreenReaderAudit(page) {
  console.log('\n=== E. Running screen reader simulation ===');

  try {
    // Get the accessible tree
    const snapshot = await page.accessibility.snapshot({ interestingOnly: true });
    results.accessibleTree = snapshot;

    // Save the tree to a file for review
    const treePath = path.join(SCREENSHOT_DIR, 'accessible-tree.json');
    fs.writeFileSync(treePath, JSON.stringify(snapshot, null, 2));

    // Analyze the tree
    const treeIssues = [];

    function analyzeNode(node, depth = 0) {
      if (!node) return;

      // Check for unlabeled interactive elements
      if (['button', 'link', 'textbox', 'combobox', 'checkbox', 'radio'].includes(node.role)) {
        if (!node.name && !node.description) {
          treeIssues.push({
            type: 'unlabeled-in-tree',
            role: node.role,
            depth,
          });
        }
      }

      // Check for generic text elements that might be important
      if (node.role === 'text' && node.name && node.name.includes('camp')) {
        // This is fine - camp content is present
      }

      if (node.children) {
        node.children.forEach(child => analyzeNode(child, depth + 1));
      }
    }

    analyzeNode(snapshot);

    // Check for aria-live regions
    const liveRegions = await page.evaluate(() => {
      const regions = [];
      document.querySelectorAll('[aria-live], [role="alert"], [role="status"], [role="log"]').forEach(el => {
        regions.push({
          role: el.getAttribute('role'),
          ariaLive: el.getAttribute('aria-live'),
          ariaAtomic: el.getAttribute('aria-atomic'),
          text: (el.textContent || '').trim().substring(0, 100),
          html: el.outerHTML.substring(0, 200),
        });
      });
      return regions;
    });

    results.liveRegions = liveRegions;
    results.screenReaderIssues = treeIssues;

    console.log(`  Accessible tree captured with ${treeIssues.length} issues`);
    console.log(`  Live regions found: ${liveRegions.length}`);
    liveRegions.forEach(r => {
      console.log(`    [${r.ariaLive || r.role}] "${r.text?.substring(0, 50)}"`);
    });

    // Check reading order - verify tree structure is logical
    function extractReadingOrder(node, order = []) {
      if (!node) return order;
      if (node.name) {
        order.push({ role: node.role, name: node.name.substring(0, 60) });
      }
      if (node.children) {
        node.children.forEach(child => extractReadingOrder(child, order));
      }
      return order;
    }

    const readingOrder = extractReadingOrder(snapshot);
    results.readingOrder = readingOrder.slice(0, 50); // First 50 items

    console.log(`  Reading order (first 15 items):`);
    readingOrder.slice(0, 15).forEach((item, i) => {
      console.log(`    ${i + 1}. [${item.role}] ${item.name}`);
    });

  } catch (err) {
    console.error('  Screen reader audit error:', err.message);
  }
}

// ──────────────────────────────────────────────
// GENERATE REPORT
// ──────────────────────────────────────────────
function generateReport() {
  console.log('\n=== Generating report ===');

  const lines = [];
  const add = (line = '') => lines.push(line);

  add('# Accessibility Audit Report');
  add(`**Date**: ${new Date().toISOString().split('T')[0]}`);
  add(`**URL**: ${URL}`);
  add(`**Page**: Homepage (Browse Camps)`);
  add(`**Standard**: WCAG 2.1 Level AA`);
  add('');
  add('---');
  add('');

  // ── Summary ──
  add('## Executive Summary');
  add('');
  const criticalAxe = results.axeViolations.filter(v => v.impact === 'critical').length;
  const seriousAxe = results.axeViolations.filter(v => v.impact === 'serious').length;
  const moderateAxe = results.axeViolations.filter(v => v.impact === 'moderate').length;
  const minorAxe = results.axeViolations.filter(v => v.impact === 'minor').length;

  add(`| Category | Issues Found |`);
  add(`|----------|-------------|`);
  add(`| axe-core violations (critical) | ${criticalAxe} |`);
  add(`| axe-core violations (serious) | ${seriousAxe} |`);
  add(`| axe-core violations (moderate) | ${moderateAxe} |`);
  add(`| axe-core violations (minor) | ${minorAxe} |`);
  add(`| Keyboard navigation issues | ${results.keyboardIssues.length} |`);
  add(`| Color contrast failures | ${results.contrastIssues.length} |`);
  add(`| ARIA/semantics issues | ${results.ariaIssues.length} |`);
  add(`| Screen reader issues | ${(results.screenReaderIssues || []).length} |`);
  add('');

  // ── A. Axe-core ──
  add('---');
  add('');
  add('## A. axe-core Automated Violations');
  add('');

  if (results.axeViolations.length === 0) {
    add('No violations found by axe-core.');
  } else {
    // Group by impact
    const impacts = ['critical', 'serious', 'moderate', 'minor'];
    impacts.forEach(impact => {
      const violations = results.axeViolations.filter(v => v.impact === impact);
      if (violations.length === 0) return;

      add(`### ${impact.charAt(0).toUpperCase() + impact.slice(1)} (${violations.length})`);
      add('');

      violations.forEach(v => {
        add(`#### ${v.id}: ${v.help}`);
        add(`- **Description**: ${v.description}`);
        add(`- **WCAG**: ${v.tags.filter(t => t.startsWith('wcag')).join(', ')}`);
        add(`- **Reference**: ${v.helpUrl}`);
        add(`- **Affected elements** (${v.nodes.length}):`);
        v.nodes.forEach(n => {
          add(`  - \`${n.target.join(' > ')}\``);
          add(`    - HTML: \`${n.html.substring(0, 150)}\``);
          if (n.failureSummary) {
            add(`    - Fix: ${n.failureSummary.replace(/\n/g, ' ')}`);
          }
        });
        add('');
      });
    });
  }

  // ── B. Keyboard ──
  add('---');
  add('');
  add('## B. Keyboard Navigation Audit');
  add('');

  add('### Tab Order');
  add('');
  add(`Total focus stops captured: ${(results.focusStops || []).length}`);
  add('');

  if (results.focusStops && results.focusStops.length > 0) {
    add('| # | Element | Text/Label | Has Focus Indicator |');
    add('|---|---------|-----------|-------------------|');
    results.focusStops.slice(0, 30).forEach((stop, i) => {
      const label = stop.ariaLabel || stop.text?.substring(0, 40) || '(none)';
      add(`| ${i + 1} | \`${stop.tag}${stop.role ? `[role="${stop.role}"]` : ''}\` | ${label.replace(/\|/g, '\\|')} | ${stop.hasFocusIndicator ? 'Yes' : '**NO**'} |`);
    });
    add('');
  }

  add('### Keyboard Issues');
  add('');

  if (results.keyboardIssues.length === 0) {
    add('No keyboard navigation issues found.');
  } else {
    results.keyboardIssues.forEach((issue, i) => {
      add(`${i + 1}. **${issue.type}**`);
      if (issue.type === 'no-focus-indicator') {
        add(`   - Element: \`${issue.element}\``);
        add(`   - Text: "${issue.text?.substring(0, 60) || issue.ariaLabel || '(none)'}"`);
        add(`   - WCAG: 2.4.7 Focus Visible (Level AA)`);
      } else if (issue.type === 'tab-order-jump') {
        add(`   - From: ${issue.from}`);
        add(`   - To: ${issue.to}`);
        add(`   - Jump: ${issue.jumpDistance}px backward`);
        add(`   - WCAG: 2.4.3 Focus Order (Level A)`);
      } else if (issue.type === 'invisible-focus') {
        add(`   - Element: \`${issue.element}\``);
        add(`   - WCAG: 2.4.7 Focus Visible (Level AA)`);
      }
      add('');
    });
  }

  // ── C. Color Contrast ──
  add('---');
  add('');
  add('## C. Color Contrast Audit');
  add('');
  add('WCAG 2.1 AA requires:');
  add('- Normal text: 4.5:1 contrast ratio minimum');
  add('- Large text (>= 24px or >= 18.66px bold): 3:1 contrast ratio minimum');
  add('');

  if (results.contrastIssues.length === 0) {
    add('No contrast issues found.');
  } else {
    add(`Found ${results.contrastIssues.length} contrast failures:`);
    add('');
    add('| Element | Text | Ratio | Required | FG Color | BG Color | Size |');
    add('|---------|------|-------|----------|----------|----------|------|');
    results.contrastIssues.forEach(issue => {
      add(`| ${issue.description} | ${(issue.text || '').substring(0, 30).replace(/\|/g, '\\|')} | ${issue.contrastRatio}:1 | ${issue.requiredRatio}:1 | \`${issue.foreground}\` | \`${issue.effectiveBackground}\` | ${issue.fontSize} |`);
    });
    add('');

    add('### Detailed Contrast Failures');
    add('');
    results.contrastIssues.forEach((issue, i) => {
      add(`${i + 1}. **${issue.description}**`);
      add(`   - Text: "${issue.text?.substring(0, 60) || '(empty)'}"`);
      add(`   - Contrast ratio: ${issue.contrastRatio}:1 (required: ${issue.requiredRatio}:1)`);
      add(`   - Foreground: \`${issue.foreground}\``);
      add(`   - Background: \`${issue.effectiveBackground}\``);
      add(`   - Font: ${issue.fontSize}, weight ${issue.fontWeight}`);
      add(`   - Selector: \`${issue.selector}\``);
      add(`   - WCAG: 1.4.3 Contrast (Minimum) (Level AA)`);
      add('');
    });
  }

  // ── D. ARIA and Semantics ──
  add('---');
  add('');
  add('## D. ARIA and Semantics Audit');
  add('');

  // Landmarks
  add('### Landmark Regions');
  add('');
  if (results.landmarks) {
    add('| Landmark | Found |');
    add('|----------|-------|');
    Object.entries(results.landmarks).forEach(([name, count]) => {
      add(`| ${name} | ${count > 0 ? `${count}` : '**MISSING**'} |`);
    });
    add('');
  }

  // Headings
  add('### Heading Hierarchy');
  add('');
  if (results.headings && results.headings.length > 0) {
    add('| Level | Text |');
    add('|-------|------|');
    results.headings.forEach(h => {
      add(`| h${h.level} | ${h.text.replace(/\|/g, '\\|')} |`);
    });
    add('');
  }

  // Issues by type
  const issueTypes = {};
  results.ariaIssues.forEach(i => {
    if (!issueTypes[i.type]) issueTypes[i.type] = [];
    issueTypes[i.type].push(i);
  });

  add('### Issues by Type');
  add('');

  Object.entries(issueTypes).forEach(([type, issues]) => {
    const wcagMap = {
      'missing-accessible-name': '4.1.2 Name, Role, Value (Level A)',
      'missing-alt-text': '1.1.1 Non-text Content (Level A)',
      'svg-missing-accessible-info': '1.1.1 Non-text Content (Level A)',
      'missing-landmark': '1.3.1 Info and Relationships (Level A)',
      'multiple-h1': '1.3.1 Info and Relationships (Level A)',
      'missing-h1': '1.3.1 Info and Relationships (Level A)',
      'skipped-heading-level': '1.3.1 Info and Relationships (Level A)',
      'input-missing-label': '1.3.1 Info and Relationships (Level A) / 4.1.2 Name, Role, Value',
      'link-used-as-button': 'Best Practice',
      'clickable-without-role': '4.1.2 Name, Role, Value (Level A)',
      'small-touch-target': '2.5.5 Target Size (Level AAA) / 2.5.8 Target Size Minimum (Level AA)',
    };

    add(`#### ${type} (${issues.length})`);
    add(`**WCAG**: ${wcagMap[type] || 'Best Practice'}`);
    add('');

    // Show details for first several
    const showing = issues.slice(0, 10);
    showing.forEach((issue, i) => {
      if (type === 'missing-accessible-name') {
        add(`${i + 1}. \`${issue.element}\` - class: \`${issue.className?.substring(0, 60) || 'none'}\``);
        add(`   HTML: \`${issue.html?.substring(0, 120) || ''}\``);
      } else if (type === 'missing-alt-text') {
        add(`${i + 1}. \`<img>\` src: \`${issue.src}\``);
      } else if (type === 'missing-landmark') {
        add(`${i + 1}. Missing \`<${issue.landmark}>\` landmark region`);
      } else if (type === 'skipped-heading-level') {
        add(`${i + 1}. Jumped from \`${issue.from}\` to \`${issue.to}\` (skipped \`${issue.skipped}\`): "${issue.headingText}"`);
      } else if (type === 'multiple-h1') {
        add(`${i + 1}. Found ${issue.count} h1 elements: ${issue.texts?.map(t => `"${t}"`).join(', ')}`);
      } else if (type === 'small-touch-target') {
        add(`${i + 1}. \`${issue.element}\` "${issue.text?.substring(0, 40) || issue.ariaLabel || '(no text)'}" - ${issue.width}x${issue.height}px (minimum: 44x44px)`);
      } else if (type === 'input-missing-label') {
        add(`${i + 1}. \`<${issue.element} type="${issue.inputType}">\` placeholder: "${issue.placeholder || 'none'}"`);
      } else if (type === 'link-used-as-button') {
        add(`${i + 1}. \`<a>\` "${issue.text}" - no href or href="#", should use \`<button>\``);
      } else {
        add(`${i + 1}. ${JSON.stringify(issue).substring(0, 150)}`);
      }
    });

    if (issues.length > 10) {
      add(`... and ${issues.length - 10} more`);
    }
    add('');
  });

  // ── E. Screen Reader ──
  add('---');
  add('');
  add('## E. Screen Reader Simulation');
  add('');

  add('### Live Regions (Dynamic Content Announcements)');
  add('');
  if (results.liveRegions && results.liveRegions.length > 0) {
    results.liveRegions.forEach((r, i) => {
      add(`${i + 1}. **[${r.ariaLive || r.role}]** ${r.ariaAtomic ? '(atomic)' : ''}`);
      add(`   Content: "${r.text?.substring(0, 80) || '(empty)'}"`);
    });
  } else {
    add('**WARNING**: No aria-live regions found. Dynamic content updates (filter count changes, search results, loading states) will not be announced to screen reader users.');
    add('');
    add('**WCAG**: 4.1.3 Status Messages (Level AA)');
  }
  add('');

  add('### Reading Order (First 30 Items)');
  add('');
  if (results.readingOrder && results.readingOrder.length > 0) {
    add('| # | Role | Content |');
    add('|---|------|---------|');
    results.readingOrder.slice(0, 30).forEach((item, i) => {
      add(`| ${i + 1} | ${item.role} | ${item.name.replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`);
    });
  }
  add('');

  // ── Prioritized Fix List ──
  add('---');
  add('');
  add('## Prioritized Fix List');
  add('');

  const fixes = [];

  // Priority 1: Critical axe violations
  results.axeViolations.filter(v => v.impact === 'critical').forEach(v => {
    fixes.push({ priority: 'P0 - Critical', issue: `[axe] ${v.help}`, wcag: v.tags.filter(t => t.startsWith('wcag')).join(', '), count: v.nodes.length, fix: v.nodes[0]?.failureSummary?.split('\n')[0] || 'See axe reference' });
  });

  // Priority 2: Serious axe violations
  results.axeViolations.filter(v => v.impact === 'serious').forEach(v => {
    fixes.push({ priority: 'P1 - Serious', issue: `[axe] ${v.help}`, wcag: v.tags.filter(t => t.startsWith('wcag')).join(', '), count: v.nodes.length, fix: v.nodes[0]?.failureSummary?.split('\n')[0] || 'See axe reference' });
  });

  // Priority 2: Missing landmarks
  results.ariaIssues.filter(i => i.type === 'missing-landmark').forEach(i => {
    fixes.push({ priority: 'P1 - Serious', issue: `Missing <${i.landmark}> landmark`, wcag: '1.3.1', count: 1, fix: `Add <${i.landmark}> element or role="${i.landmark}"` });
  });

  // Priority 2: Contrast failures
  if (results.contrastIssues.length > 0) {
    const worstContrast = results.contrastIssues.reduce((worst, curr) => curr.contrastRatio < worst.contrastRatio ? curr : worst, results.contrastIssues[0]);
    fixes.push({ priority: 'P1 - Serious', issue: `Color contrast failures (${results.contrastIssues.length} elements)`, wcag: '1.4.3', count: results.contrastIssues.length, fix: `Worst: "${worstContrast.description}" at ${worstContrast.contrastRatio}:1 ratio. Increase foreground darkness or background lightness.` });
  }

  // Priority 2: Missing accessible names
  const missingNames = results.ariaIssues.filter(i => i.type === 'missing-accessible-name');
  if (missingNames.length > 0) {
    fixes.push({ priority: 'P1 - Serious', issue: `Interactive elements without accessible names`, wcag: '4.1.2', count: missingNames.length, fix: 'Add aria-label, aria-labelledby, or visible text to all buttons and links' });
  }

  // Priority 2: Keyboard focus issues
  const noFocusIndicators = results.keyboardIssues.filter(i => i.type === 'no-focus-indicator');
  if (noFocusIndicators.length > 0) {
    fixes.push({ priority: 'P1 - Serious', issue: `Elements without visible focus indicators`, wcag: '2.4.7', count: noFocusIndicators.length, fix: 'Add outline, box-shadow, or ring styles on :focus-visible' });
  }

  // Priority 3: Heading issues
  const headingIssues = results.ariaIssues.filter(i => i.type === 'skipped-heading-level' || i.type === 'multiple-h1');
  if (headingIssues.length > 0) {
    fixes.push({ priority: 'P2 - Moderate', issue: `Heading hierarchy issues`, wcag: '1.3.1', count: headingIssues.length, fix: 'Fix heading levels to not skip (h1 > h2 > h3) and use single h1' });
  }

  // Priority 3: Moderate axe
  results.axeViolations.filter(v => v.impact === 'moderate').forEach(v => {
    fixes.push({ priority: 'P2 - Moderate', issue: `[axe] ${v.help}`, wcag: v.tags.filter(t => t.startsWith('wcag')).join(', '), count: v.nodes.length, fix: v.nodes[0]?.failureSummary?.split('\n')[0] || 'See axe reference' });
  });

  // Priority 3: Touch targets
  const touchTargets = results.ariaIssues.filter(i => i.type === 'small-touch-target');
  if (touchTargets.length > 0) {
    fixes.push({ priority: 'P2 - Moderate', issue: `Small touch targets (< 44x44px)`, wcag: '2.5.8', count: touchTargets.length, fix: 'Increase min-width and min-height to 44px on interactive elements' });
  }

  // Priority 3: Live regions
  if (!results.liveRegions || results.liveRegions.length === 0) {
    fixes.push({ priority: 'P2 - Moderate', issue: 'No aria-live regions for dynamic content', wcag: '4.1.3', count: 1, fix: 'Add aria-live="polite" to filter count and search result areas' });
  }

  // Priority 4: Minor axe
  results.axeViolations.filter(v => v.impact === 'minor').forEach(v => {
    fixes.push({ priority: 'P3 - Minor', issue: `[axe] ${v.help}`, wcag: v.tags.filter(t => t.startsWith('wcag')).join(', '), count: v.nodes.length, fix: v.nodes[0]?.failureSummary?.split('\n')[0] || 'See axe reference' });
  });

  // Tab order jumps
  const tabOrderJumps = results.keyboardIssues.filter(i => i.type === 'tab-order-jump');
  if (tabOrderJumps.length > 0) {
    fixes.push({ priority: 'P3 - Minor', issue: `Tab order jumps backward`, wcag: '2.4.3', count: tabOrderJumps.length, fix: 'Review DOM order to match visual layout' });
  }

  // Print the fix list
  add('| Priority | Issue | WCAG | Elements | Fix |');
  add('|----------|-------|------|----------|-----|');
  fixes.forEach(fix => {
    add(`| ${fix.priority} | ${fix.issue} | ${fix.wcag} | ${fix.count} | ${fix.fix.substring(0, 100)} |`);
  });
  add('');

  // ── WCAG Criteria Summary ──
  add('---');
  add('');
  add('## WCAG 2.1 AA Criteria Summary');
  add('');

  const criteriaViolated = new Set();

  // Collect all violated criteria
  results.axeViolations.forEach(v => {
    v.tags.forEach(t => {
      if (t.startsWith('wcag')) criteriaViolated.add(t);
    });
  });

  results.contrastIssues.length > 0 && criteriaViolated.add('wcag143');
  results.ariaIssues.filter(i => i.type === 'missing-landmark').length > 0 && criteriaViolated.add('wcag131');
  results.ariaIssues.filter(i => i.type === 'missing-accessible-name').length > 0 && criteriaViolated.add('wcag412');
  noFocusIndicators.length > 0 && criteriaViolated.add('wcag247');
  headingIssues.length > 0 && criteriaViolated.add('wcag131');
  touchTargets.length > 0 && criteriaViolated.add('wcag258');

  const criteriaNames = {
    'wcag111': '1.1.1 Non-text Content (A)',
    'wcag131': '1.3.1 Info and Relationships (A)',
    'wcag143': '1.4.3 Contrast Minimum (AA)',
    'wcag1411': '1.4.11 Non-text Contrast (AA)',
    'wcag211': '2.1.1 Keyboard (A)',
    'wcag243': '2.4.3 Focus Order (A)',
    'wcag247': '2.4.7 Focus Visible (AA)',
    'wcag258': '2.5.8 Target Size Minimum (AA)',
    'wcag311': '3.1.1 Language of Page (A)',
    'wcag412': '4.1.2 Name, Role, Value (A)',
    'wcag413': '4.1.3 Status Messages (AA)',
    // axe tag variants
    'wcag2a': 'WCAG 2.0 Level A',
    'wcag2aa': 'WCAG 2.0 Level AA',
    'wcag21a': 'WCAG 2.1 Level A',
    'wcag21aa': 'WCAG 2.1 Level AA',
  };

  add('| Criteria | Status |');
  add('|----------|--------|');

  const allCriteria = ['wcag111', 'wcag131', 'wcag143', 'wcag1411', 'wcag211', 'wcag243', 'wcag247', 'wcag258', 'wcag311', 'wcag412', 'wcag413'];
  allCriteria.forEach(c => {
    const name = criteriaNames[c] || c;
    const violated = criteriaViolated.has(c);
    add(`| ${name} | ${violated ? 'FAIL' : 'PASS (limited check)'} |`);
  });
  add('');

  // ── Screenshots ──
  add('---');
  add('');
  add('## Screenshots');
  add('');
  add(`All screenshots saved to: \`${SCREENSHOT_DIR}/\``);
  add('');
  results.screenshots.forEach(s => {
    add(`- \`${path.basename(s)}\``);
  });
  add('');

  // Write report
  const reportPath = path.join(REPORT_DIR, 'accessibility-report.md');
  fs.writeFileSync(reportPath, lines.join('\n'));
  console.log(`\nReport saved to: ${reportPath}`);

  // Also save raw JSON results
  const jsonPath = path.join(REPORT_DIR, 'accessibility-results.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`Raw results saved to: ${jsonPath}`);
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────
async function main() {
  console.log('Starting accessibility audit...');
  console.log(`URL: ${URL}`);
  console.log(`Screenshots: ${SCREENSHOT_DIR}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    // Navigate and wait for content to load
    console.log('Loading page...');
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for camps to render
    await page.waitForSelector('.camp-card, .skeleton-card', { timeout: 15000 }).catch(() => {
      console.log('  Warning: No camp cards found, page may not have loaded fully');
    });

    // Give a bit extra time for dynamic content
    await page.waitForTimeout(2000);

    // Run all audits
    await runAxeAudit(page);
    await runContrastAudit(page);
    await runAriaAudit(page);
    await runScreenReaderAudit(page);

    // Keyboard audit last (it modifies focus state)
    // Reset focus by clicking body first
    await page.evaluate(() => document.body.focus());
    await runKeyboardAudit(page);

    // Generate report
    generateReport();

    console.log('\n=== Audit complete ===');

  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
