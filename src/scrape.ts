import { chromium, Browser, Page } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import TurndownService from '@joplin/turndown';
import { gfm } from '@joplin/turndown-plugin-gfm';

interface LinkInfo {
  group: string;
  subcategory?: string;
  name: string;
  href: string;
}

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-'
});
turndown.use(gfm);

const OUTPUT_DIR = './markdown';
await fs.mkdir(OUTPUT_DIR, { recursive: true });

const browser: Browser = await chromium.launch({ headless: true });
const sidebarPage: Page = await browser.newPage();
const contentPage: Page = await browser.newPage();

console.log('🚀 Loading PrimeVue site...');
await sidebarPage.goto('https://primevue.org/setup/');
await sidebarPage.waitForSelector('nav');

// Expand all top-level nav sections
const topLevelButtons = await sidebarPage.$$('nav button[data-pd-styleclass]');
for (const btn of topLevelButtons) {
  const ariaExpanded = await btn.getAttribute('aria-expanded');
  if (ariaExpanded !== 'true') {
    await btn.click();
    await sidebarPage.waitForTimeout(200);
  }
}

// Gather all internal links
const groupedLinks: LinkInfo[] = await sidebarPage.$$eval('nav > ol > li', (sections) => {
  const groups: LinkInfo[] = [];

  for (const section of sections) {
    const groupButton = section.querySelector('button span:nth-of-type(2)');
    const groupName = groupButton ? groupButton.textContent?.trim() : null;

    const directLinks = section.querySelectorAll(':scope > a[href^="/"]');
    for (const link of directLinks) {
      const href = link.getAttribute('href');
      const name = link.textContent?.trim();
      if (href && name) {
        groups.push({
          group: groupName || 'Ungrouped',
          name,
          href
        });
      }
    }

    const submenu = section.querySelector('div > ol');
    if (!submenu) continue;

    const categories = submenu.querySelectorAll(':scope > li');
    for (const category of categories) {
      const catLabel = category.querySelector('.menu-child-category');
      const subcategory = catLabel ? catLabel.textContent?.trim() : undefined;

      const links = category.querySelectorAll('a[href^="/"]');
      for (const link of links) {
        const href = link.getAttribute('href');
        const name = link.textContent?.trim();
        if (href && name) {
          groups.push({
            group: groupName || 'Ungrouped',
            subcategory,
            name,
            href
          });
        }
      }
    }
  }

  return groups;
});

console.log(`📄 Found ${groupedLinks.length} pages to scrape`);

const useGotoPaths: string[] = [
  '/introduction/',
  '/setup/',
  '/playground/',
  '/uikit/',
  '/designer/',
  '/support/'
];

for (const { group, subcategory, name, href } of groupedLinks) {
  const folderParts = [OUTPUT_DIR, group.replace(/\s+/g, '-')];
  if (subcategory) folderParts.push(subcategory.replace(/\s+/g, '-'));
  const groupDir = path.join(...folderParts);
  await fs.mkdir(groupDir, { recursive: true });

  const url = 'https://primevue.org' + href;
  console.log(`📄 Scraping: ${name} (${url})`);

  try {
    const shouldUseGoto = useGotoPaths.includes(href.toLowerCase());
    const pageToUse = shouldUseGoto ? contentPage : sidebarPage;

    if (shouldUseGoto) {
      await contentPage.goto(url);
      await contentPage.waitForSelector('h1, .text-2xl', { timeout: 15000 });
    } else {
      const linkHandle = await sidebarPage.$(`a[href="${href}"]`);
      if (!linkHandle) throw new Error(`Could not find sidebar link for ${name}`);

      await Promise.all([
        sidebarPage.waitForSelector('h1', { timeout: 15000 }),
        linkHandle.click()
      ]);

      await sidebarPage.waitForTimeout(1000);
    }

    const hasTabs = await pageToUse.$('.doc-tabmenu') !== null;
    const markdownSections: string[] = [];

    if (hasTabs) {
      const tabLabels = await pageToUse.$$eval('.doc-tabmenu li button', (btns) =>
        btns.map((btn) => btn.textContent?.trim() || '')
      );
      const tabPanels = await pageToUse.$$('.doc-tabpanels > .doc-tabpanel');

      for (let i = 0; i < tabPanels.length; i++) {
        const html = await tabPanels[i].evaluate((el) => el.innerHTML);
        const markdown = turndown.turndown(html);
        markdownSections.push(`### ${tabLabels[i] || `Tab ${i + 1}`}` + '\n\n' + markdown);
      }
    } else {
      const docDiv = await pageToUse.$('.doc');
      let docHtml: string | null = null;

      if (docDiv) {
        docHtml = await docDiv.evaluate((el) => el.innerHTML);
      } else {
        const content = await pageToUse.$('.layout-content-slot');
        if (content) {
          docHtml = await content.evaluate((el) => el.innerHTML);
        }
      }

      if (docHtml) {
        const markdown = turndown.turndown(docHtml);
        markdownSections.push(markdown);
      } else {
        markdownSections.push('_No content found_');
      }
    }

    const md = markdownSections.join('\n\n');

    const safeName = name.toLowerCase().replace(/\s+/g, '-');
    const filePath = path.join(groupDir, `${safeName}.md`);
    await fs.writeFile(filePath, md, 'utf-8');
    console.log(`✅ Saved: ${path.relative('.', filePath)}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`❌ Failed to scrape ${name} (${url}):`, errorMessage);
  }
}

await browser.close();
console.log('🎉 All done!');