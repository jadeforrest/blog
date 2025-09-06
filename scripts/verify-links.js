#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

class LinkVerifier {
  constructor(contentDir = './content', siteUrl = 'https://www.rubick.com') {
    this.contentDir = contentDir;
    this.siteUrl = siteUrl;
    this.internalRoutes = new Set();
    this.cacheFile = path.join(__dirname, '.link-cache.json');
    this.cache = {};
    this.cacheExpiry = 14 * 24 * 60 * 60 * 1000; // 2 weeks in milliseconds
    this.results = {
      total: 0,
      valid: 0,
      invalid: 0,
      errors: []
    };
    
    // Always use the full content structure for route building, even when checking a subdirectory
    this.routeContentDir = this.contentDir.includes('content/') ? 
      this.contentDir.substring(0, this.contentDir.indexOf('content/') + 7) : 
      this.contentDir;
  }

  // Build internal routes based on Gatsby routing rules
  buildInternalRoutes() {
    const routes = new Set(['/']);

    // Add posts (date--slug becomes /slug/)
    const postsDir = path.join(this.routeContentDir, 'posts');
    if (fs.existsSync(postsDir)) {
      const postDirs = fs.readdirSync(postsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory());
      
      for (const dir of postDirs) {
        const separatorIndex = dir.name.indexOf('--');
        if (separatorIndex !== -1) {
          const slug = dir.name.substring(separatorIndex + 2);
          routes.add(`/${slug}/`);
        }
      }
    }

    // Add pages  
    const pagesDir = path.join(this.routeContentDir, 'pages');
    if (fs.existsSync(pagesDir)) {
      const pageDirs = fs.readdirSync(pagesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory());
      
      for (const dir of pageDirs) {
        // Handle numbered prefixes like "1--about" -> "about"
        const numberPrefixMatch = dir.name.match(/^\d+--(.+)$/);
        if (numberPrefixMatch) {
          routes.add(`/${numberPrefixMatch[1]}/`);
        } else {
          // Handle regular double-dash format
          const separatorIndex = dir.name.indexOf('--');
          if (separatorIndex !== -1) {
            const slug = dir.name.substring(separatorIndex + 2);
            routes.add(`/${slug}/`);
          } else {
            // Fallback: add the directory name as-is
            routes.add(`/${dir.name}/`);
          }
        }
      }
    }

    // Add wiki pages (/wiki/path/)
    const wikiDir = path.join(this.routeContentDir, 'wiki');
    if (fs.existsSync(wikiDir)) {
      this.addWikiRoutes(wikiDir, '/wiki', routes);
    }

    // Add common routes
    routes.add('/posts/');
    routes.add('/contact/');
    routes.add('/newsletter/');
    routes.add('/course/');
    routes.add('/subscribe/');

    this.internalRoutes = routes;
    console.log(`Built ${routes.size} internal routes`);
  }

  addWikiRoutes(dir, basePath, routes) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      if (item.isDirectory()) {
        const subPath = `${basePath}/${item.name}`;
        routes.add(`${subPath}/`);
        this.addWikiRoutes(path.join(dir, item.name), subPath, routes);
      } else if (item.name.endsWith('.md')) {
        const filename = item.name.replace('.md', '');
        routes.add(`${basePath}/${filename}`);
      }
    }
  }

  // Load cache from file
  loadCache() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const cacheData = fs.readFileSync(this.cacheFile, 'utf-8');
        this.cache = JSON.parse(cacheData);
      }
    } catch (err) {
      console.log('Warning: Could not load cache file, starting fresh');
      this.cache = {};
    }
  }

  // Save cache to file
  saveCache() {
    try {
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2));
    } catch (err) {
      console.log('Warning: Could not save cache file');
    }
  }

  // Check if cached entry is still valid
  isCacheValid(cacheEntry) {
    return cacheEntry && 
           cacheEntry.timestamp && 
           cacheEntry.valid === true &&
           (Date.now() - cacheEntry.timestamp) < this.cacheExpiry;
  }

  // Extract all links from markdown content
  extractLinks(content) {
    const links = [];
    
    // Parse markdown links with proper parentheses balancing
    const linkStartRegex = /\[([^\]]*)\]\(/g;
    let match;
    while ((match = linkStartRegex.exec(content)) !== null) {
      const text = match[1];
      const urlStart = match.index + match[0].length;
      
      // Find the matching closing parenthesis by counting nested parentheses
      let parenCount = 1;
      let urlEnd = urlStart;
      
      while (urlEnd < content.length && parenCount > 0) {
        const char = content[urlEnd];
        if (char === '(') {
          parenCount++;
        } else if (char === ')') {
          parenCount--;
        }
        if (parenCount > 0) {
          urlEnd++;
        }
      }
      
      if (parenCount === 0) {
        let url = content.substring(urlStart, urlEnd).trim();
        
        // Handle URLs with titles: url "title" or url 'title'
        const spaceIndex = url.indexOf(' ');
        if (spaceIndex > 0) {
          const afterSpace = url.substring(spaceIndex + 1).trim();
          if ((afterSpace.startsWith('"') && afterSpace.endsWith('"')) ||
              (afterSpace.startsWith("'") && afterSpace.endsWith("'"))) {
            url = url.substring(0, spaceIndex);
          }
        }
        
        links.push({
          text: text,
          url: url,
          type: 'markdown'
        });
      }
    }

    // HTML links: <a href="url">
    const htmlLinkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
    while ((match = htmlLinkRegex.exec(content)) !== null) {
      links.push({
        text: 'HTML link',
        url: match[1],
        type: 'html'
      });
    }

    return links;
  }

  // Check if URL is external
  isExternalUrl(url) {
    return url.startsWith('http://') || url.startsWith('https://');
  }

  // Verify external URL with rate limiting
  async verifyExternalUrl(url) {
    // Check cache first
    const cachedResult = this.cache[url];
    if (this.isCacheValid(cachedResult)) {
      return { 
        valid: true, 
        status: 'CACHED', 
        cached: true,
        originalStatus: cachedResult.status
      };
    }

    // Skip known problematic domains to speed up verification
    const skipDomains = ['pixabay.com', 'linkedin.com', 'twitter.com'];
    try {
      const urlObj = new URL(url);
      if (skipDomains.some(domain => urlObj.hostname.includes(domain))) {
        return { valid: true, status: 'SKIPPED', skipped: true };
      }
    } catch {
      // Invalid URL
    }

    return new Promise((resolve) => {
      try {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;
        
        const req = client.request({
          hostname: urlObj.hostname,
          port: urlObj.port,
          path: urlObj.pathname + urlObj.search,
          method: 'HEAD',
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; LinkVerifier/1.0)'
          }
        }, (res) => {
          const result = {
            valid: res.statusCode >= 200 && res.statusCode < 400,
            status: res.statusCode,
            redirected: res.statusCode >= 300 && res.statusCode < 400
          };
          
          // Cache valid results only
          if (result.valid) {
            this.cache[url] = {
              valid: true,
              status: result.status,
              timestamp: Date.now()
            };
          }
          
          resolve(result);
        });

        req.on('error', (err) => {
          resolve({
            valid: false,
            error: err.message
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({
            valid: false,
            error: 'Request timeout'
          });
        });

        req.end();
      } catch (err) {
        resolve({
          valid: false,
          error: err.message
        });
      }
    });
  }

  // Verify internal URL
  verifyInternalUrl(url, currentFilePath) {
    // Remove fragment identifier and query parameters
    const cleanUrl = url.split('#')[0].split('?')[0];
    
    // Skip /tag/ links
    if (cleanUrl.startsWith('/tag/')) {
      return {
        valid: true,
        skipped: true,
        route: cleanUrl
      };
    }
    
    // Handle relative file paths (images, etc.)
    if (!cleanUrl.startsWith('/')) {
      // Check if it's a file that exists relative to the current markdown file
      const currentDir = path.dirname(currentFilePath);
      const filePath = path.join(currentDir, cleanUrl);
      
      if (fs.existsSync(filePath)) {
        return {
          valid: true,
          relativePath: cleanUrl,
          resolvedPath: filePath
        };
      }
      
      return {
        valid: false,
        relativePath: cleanUrl,
        attemptedPath: filePath
      };
    }
    
    // Ensure trailing slash for comparison
    const normalizedUrl = cleanUrl.endsWith('/') ? cleanUrl : cleanUrl + '/';
    
    return {
      valid: this.internalRoutes.has(normalizedUrl),
      route: normalizedUrl
    };
  }

  // Process a single markdown file
  async processFile(filePath) {
    const relativePath = path.relative(this.contentDir, filePath);
    console.log(`Processing: ${relativePath}`);
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const links = this.extractLinks(content);
    
    const fileResults = {
      file: relativePath,
      links: []
    };

    for (const link of links) {
      this.results.total++;
      
      if (this.isExternalUrl(link.url)) {
        console.log(`  Checking external: ${link.url}`);
        const result = await this.verifyExternalUrl(link.url);
        
        if (result.valid) {
          this.results.valid++;
          let statusMsg = result.status || 'OK';
          if (result.cached) {
            statusMsg = `CACHED (${result.originalStatus})`;
          } else if (result.skipped) {
            statusMsg = 'SKIPPED';
          }
          console.log(`    ✓ Valid (${statusMsg})`);
        } else {
          this.results.invalid++;
          const error = `    ✗ Invalid: ${result.error || 'HTTP ' + result.status}`;
          console.log(error);
          fileResults.links.push({
            ...link,
            error: result.error || `HTTP ${result.status}`,
            valid: false
          });
        }
      } else {
        // Internal link
        const result = this.verifyInternalUrl(link.url, filePath);
        
        if (result.valid) {
          this.results.valid++;
          if (result.skipped) {
            console.log(`    ✓ Internal link skipped (tag): ${link.url}`);
          } else if (result.relativePath) {
            console.log(`    ✓ Relative file found: ${link.url}`);
          } else {
            console.log(`    ✓ Internal link valid: ${link.url}`);
          }
        } else {
          this.results.invalid++;
          const error = `    ✗ Internal link invalid: ${link.url}`;
          console.log(error);
          
          let errorMsg;
          if (result.attemptedPath) {
            errorMsg = `File not found: ${result.relativePath}`;
          } else {
            errorMsg = `Route not found: ${result.route}`;
          }
          
          fileResults.links.push({
            ...link,
            error: errorMsg,
            valid: false
          });
        }
      }
    }

    if (fileResults.links.length > 0) {
      this.results.errors.push(fileResults);
    }
  }

  // Find all markdown files
  findMarkdownFiles(dir) {
    const files = [];
    
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        files.push(...this.findMarkdownFiles(fullPath));
      } else if (item.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  // Run verification
  async verify() {
    console.log('Loading cache...');
    this.loadCache();
    
    console.log('Building internal routes...');
    this.buildInternalRoutes();
    
    console.log('\nFinding markdown files...');
    const markdownFiles = this.findMarkdownFiles(this.contentDir);
    console.log(`Found ${markdownFiles.length} markdown files\n`);
    
    for (const file of markdownFiles) {
      await this.processFile(file);
    }
    
    console.log('\nSaving cache...');
    this.saveCache();
    
    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('LINK VERIFICATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total links checked: ${this.results.total}`);
    console.log(`Valid links: ${this.results.valid}`);
    console.log(`Invalid links: ${this.results.invalid}`);
    
    if (this.results.errors.length > 0) {
      console.log('\nFILES WITH BROKEN LINKS:');
      console.log('-'.repeat(30));
      
      for (const fileResult of this.results.errors) {
        console.log(`\n📄 ${fileResult.file}`);
        for (const link of fileResult.links) {
          console.log(`  ❌ [${link.text}](${link.url})`);
          console.log(`     Error: ${link.error}`);
        }
      }
    } else {
      console.log('\n🎉 All links are valid!');
    }
    
    process.exit(this.results.invalid > 0 ? 1 : 0);
  }
}

// CLI usage
if (require.main === module) {
  const contentDir = process.argv[2] || './content';
  const siteUrl = process.argv[3] || 'https://www.rubick.com';
  
  const verifier = new LinkVerifier(contentDir, siteUrl);
  verifier.verify().catch(console.error);
}

module.exports = LinkVerifier;