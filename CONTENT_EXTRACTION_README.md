# Content Extraction Script

This script analyzes markdown files in your blog and extracts the most interesting content using Claude Code CLI. It creates individual output files for each markdown page, containing the best extracts along with full URLs.

## The Script - `extract-content.js`

Uses Claude Code CLI for AI analysis with intelligent fallback to heuristics if Claude Code is unavailable.

**Features:**
- Uses Claude Code CLI for high-quality content analysis
- Fallback analysis using smart heuristics 
- Creates individual files and a master compilation
- Processes all markdown posts automatically
- Generates proper URLs for each extract

**Prerequisites:**
- Node.js installed
- Claude Code CLI installed and configured (optional - script has fallback)

**Usage:**
```bash
# Make script executable (first time only)
chmod +x extract-content.js

# Run the script on all files
node extract-content.js

# Test mode - process only the first markdown file for faster iteration
node extract-content.js --test-mode

# Or run directly
./extract-content.js
./extract-content.js --test-mode
```

## Output Structure

The script creates:

```
extracted-content/
├── 2025-01-15--reliability-all-stick-no-carrot.txt
├── 2021-05-11--unusual-tips-to-keep-slack-from-becoming-a-nightmare.txt
├── 2022-07-19--shit-shield.txt
├── ...
└── all-extracts.txt     # Master file with all extracts
```

### Individual File Format

Each file contains 2-4 extracts in this format:

```
People don't generally value reliability that much unless the site is down, or things are really bad.
https://www.rubick.com/reliability-all-stick-no-carrot/

Make the incident review meeting and post-mortem writeup so interesting and spicy, that everyone wants to see it.
https://www.rubick.com/reliability-all-stick-no-carrot/

We were lucky to be bailed out by Alice, but we acknowledge that it's a dangerous dependency.
https://www.rubick.com/reliability-all-stick-no-carrot/
```

## How It Works

1. **File Discovery**: Recursively finds all `index.md` files in the content directory
2. **Content Parsing**: Extracts title and content from markdown files, removing front matter
3. **URL Generation**: Creates URLs by removing date prefixes from directory names
4. **AI Analysis**: Uses AI to identify the most interesting 2-4 passages per post
5. **Output Generation**: Creates individual text files and a master compilation

## AI Analysis Focus

The AI analysis prioritizes:
- Actionable advice and practical tips
- Surprising insights and non-obvious observations  
- Memorable quotes and principles
- Practical frameworks and models
- Key takeaways that provide real value

## Customization

### Changing Configuration

Edit the configuration variables at the top of `extract-content.js`:

```javascript
const BASE_URL = 'https://yourdomain.com';  // Change base URL
const CONTENT_DIR = './content/posts';       // Change content directory
const OUTPUT_DIR = './extracted-content';   // Change output directory
```

### Modifying Analysis Criteria

Edit the AI prompt in the `analyzeWithClaudeCode` function to change what type of content gets extracted. Look for the prompt variable and modify the "Focus on:" section.

## Troubleshooting

### Claude Code Issues
- If Claude Code CLI is not available, the script automatically falls back to heuristic analysis
- Make sure you have Claude Code installed: `npm install -g @anthropic/claude-code` (or appropriate installation method)
- Check that Claude Code is properly configured and authenticated

### No Extracts Generated
- The script will fall back to heuristic analysis if Claude Code fails
- Check that your markdown files have substantial content (>100 characters)
- Ensure front matter is properly formatted with `---` delimiters

### Permission Errors
```bash
chmod +x extract-content.js
```

## Example Output

From the "reliability-all-stick-no-carrot" post:

```
Reliability work is like that - you're making a class of problems disappear, and they only seem important if they don't disappear.
https://www.rubick.com/reliability-all-stick-no-carrot/

Her approach is to make the incident review meeting and post-mortem writeup so interesting and spicy, that everyone wants to see it.
https://www.rubick.com/reliability-all-stick-no-carrot/

We were lucky that we have Alice, thank you Alice! What if Alice had been in the hospital?
https://www.rubick.com/reliability-all-stick-no-carrot/
```

This creates a curated collection of the most valuable insights from your entire blog, perfect for sharing, referencing, or creating social media content.