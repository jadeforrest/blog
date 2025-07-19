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

---

# Buffer Publishing Script - `extract-to-buffer.js`

This script takes the extracted content files and automatically posts them to Buffer for social media scheduling.

## Prerequisites

- Buffer account with API access
- Buffer access token
- Buffer profile IDs for the accounts you want to post to

## Setup

### 1. Get Buffer API Credentials

1. Go to [Buffer Developers](https://buffer.com/developers/api) and create an app
2. Generate an access token
3. Get your profile IDs from Buffer

### 2. Set Environment Variables

```bash
export BUFFER_ACCESS_TOKEN="your_access_token_here"
export BUFFER_PROFILE_IDS="profile_id_1,profile_id_2"
```

Or create a `.env` file:
```bash
BUFFER_ACCESS_TOKEN=your_access_token_here
BUFFER_PROFILE_IDS=profile_id_1,profile_id_2
```

## Usage

```bash
# Make script executable (first time only)
chmod +x extract-to-buffer.js

# Test mode - posts only the first extract to see if everything works
node extract-to-buffer.js --test-mode

# Post all unsent extracts to Buffer
node extract-to-buffer.js

# Or run directly
./extract-to-buffer.js --test-mode
./extract-to-buffer.js
```

## How It Works

1. **Content Parsing**: Reads all `.txt` files from `extracted-content/` directory
2. **Format Processing**: Parses alternating text/URL pairs from each file
3. **Duplicate Prevention**: Tracks sent posts in `buffer-sent.json` to avoid reposts
4. **Buffer API**: Posts content with text, URL, and link preview
5. **Rate Limiting**: Waits 1 second between posts (60/minute limit)

## Post Format

Each post includes:
- The extracted text as the main content
- The original blog post URL as an attached link
- Automatic URL shortening (enabled by default)

## Tracking and Recovery

- **Sent History**: `buffer-sent.json` tracks all posted content with timestamps
- **Resume Capability**: Script automatically skips already-posted content
- **Error Recovery**: Failed posts don't affect subsequent ones

## Test Mode

Always use `--test-mode` first to verify:
- Environment variables are correct
- Content parsing works properly
- Only processes the first extract
- Shows what would be posted without actually posting

## File Structure

```
extracted-content/
├── post1.txt                    # Source content files
├── post2.txt
└── all-extracts.txt            # Ignored by script

buffer-sent.json                 # Tracking file (auto-created)
```

## Example Usage Session

```bash
# First, test the setup
node extract-to-buffer.js --test-mode

# Output:
# Starting Buffer posting in TEST MODE (first post only)...
# Using 2 Buffer profile(s)
# Found 45 extracted posts
# 0 already sent, 45 to post
# [TEST MODE] Posting: "People don't generally value reliability that much..."
#   Would post to Buffer with URL: https://www.rubick.com/reliability-all-stick-no-carrot/

# If test looks good, run for real
node extract-to-buffer.js

# Output:
# Starting Buffer posting...
# Using 2 Buffer profile(s)  
# Found 45 extracted posts
# 0 already sent, 45 to post
# Posting: "People don't generally value reliability that much..."
#   ✓ Posted successfully (ID: abc123)
# [... continues for all posts ...]
# === Summary ===
# Posted 45 update(s), 0 failed
```

## Troubleshooting

### Environment Variables
```bash
# Check if variables are set
echo $BUFFER_ACCESS_TOKEN
echo $BUFFER_PROFILE_IDS
```

### API Errors
- **Invalid token**: Check your Buffer access token
- **Invalid profile**: Verify profile IDs are correct
- **Rate limit**: Script handles this automatically

### Content Issues
- Script ignores empty files and `all-extracts.txt`
- Requires alternating text/URL format in source files
- Use test mode to verify content parsing

## Buffer Profile Setup

To get your Buffer profile IDs:
1. Use Buffer's API explorer or
2. Check browser network tab when viewing profiles or
3. Use a tool like Postman to call `/profiles.json` endpoint

## Security Notes

- Never commit `buffer-sent.json` if it contains sensitive data
- Store API credentials securely (environment variables, not in code)
- Consider using Buffer's posting schedules rather than immediate posting