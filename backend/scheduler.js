import cron from 'node-cron';
import { runScraper } from './scraper.js';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEDULE_LOG = path.join(__dirname, '..', 'data', 'schedule-log.json');

// Track scheduled scrapes
const scheduleHistory = [];

async function loadScheduleHistory() {
  try {
    const data = await fs.readFile(SCHEDULE_LOG, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveScheduleHistory() {
  await fs.writeFile(SCHEDULE_LOG, JSON.stringify(scheduleHistory, null, 2));
}

/**
 * Run the weekly multi-strategy scraper
 */
async function runWeeklyScraper() {
  return new Promise((resolve, reject) => {
    const scraperPath = path.join(__dirname, 'weekly-scraper.js');
    const proc = spawn('node', [scraperPath, '--verbose'], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        reject(new Error(`Weekly scraper exited with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

async function runScheduledScrape() {
  const entry = {
    scheduled_at: new Date().toISOString(),
    status: 'running',
    type: 'weekly-multi-strategy'
  };
  scheduleHistory.push(entry);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`WEEKLY SCHEDULED SCRAPE - ${entry.scheduled_at}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Run the new multi-strategy weekly scraper
    await runWeeklyScraper();

    entry.status = 'completed';
    entry.completed_at = new Date().toISOString();

    // Read the latest report
    const reportDir = path.join(__dirname, '..', 'data', 'reports');
    const files = await fs.readdir(reportDir).catch(() => []);
    const latestReport = files.sort().pop();

    if (latestReport) {
      const reportPath = path.join(reportDir, latestReport);
      const report = JSON.parse(await fs.readFile(reportPath, 'utf-8'));
      entry.results = report.summary;
    }

    console.log('\nWeekly scrape completed successfully');
  } catch (error) {
    entry.status = 'error';
    entry.error = error.message;
    console.error('\nWeekly scrape failed:', error.message);

    // Fall back to legacy scraper
    console.log('Attempting fallback to legacy scraper...');
    try {
      const { scrapeLog } = await runScraper();
      entry.status = 'completed-fallback';
      entry.results = {
        successful: scrapeLog.successful,
        failed: scrapeLog.failed,
        skipped: scrapeLog.skipped
      };
    } catch (fallbackError) {
      entry.fallback_error = fallbackError.message;
    }
  }

  await saveScheduleHistory();
}

// Schedule options:
// - Weekly on Sunday at 3am: '0 3 * * 0' (RECOMMENDED)
// - Monthly on the 1st at 3am: '0 3 1 * *'
// - Daily at 3am: '0 3 * * *'
// - Every 6 hours: '0 */6 * * *'

const SCHEDULE = process.env.SCRAPE_SCHEDULE || '0 3 * * 0'; // Default: weekly Sunday 3am

console.log('Camp Scraper Scheduler');
console.log('======================');
console.log(`Schedule: ${SCHEDULE}`);
console.log(`Next runs will scrape all camp websites for updated info.`);
console.log('');

// Validate cron expression
if (!cron.validate(SCHEDULE)) {
  console.error(`Invalid cron expression: ${SCHEDULE}`);
  process.exit(1);
}

// Load history
scheduleHistory.push(...(await loadScheduleHistory()));
console.log(`Previous scheduled runs: ${scheduleHistory.length}`);

// Schedule the scraper
const task = cron.schedule(SCHEDULE, runScheduledScrape, {
  scheduled: true,
  timezone: 'America/Los_Angeles'
});

console.log('\nScheduler running. Press Ctrl+C to stop.');
console.log('Use environment variable SCRAPE_SCHEDULE to change the cron schedule.');
console.log('');
console.log('Common schedules:');
console.log('  Monthly 1st at 3am: 0 3 1 * *');
console.log('  Weekly Sunday 3am: 0 3 * * 0');
console.log('  Daily at 3am: 0 3 * * *');
console.log('');

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down scheduler...');
  task.stop();
  process.exit(0);
});

// Run immediately if --now flag is passed
if (process.argv.includes('--now')) {
  console.log('Running immediate scrape (--now flag detected)...\n');
  runScheduledScrape();
}
