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

# LinkedIn Publishing Script - `extract-to-linkedin.js`

This script posts extracted content to LinkedIn as article shares, creating professional posts with URL preview cards. Designed for daily automated posting.

## Prerequisites

- LinkedIn account
- LinkedIn access token with `w_member_social` scope
- LinkedIn Developer App (for generating tokens)

## Key Features

- **Single Daily Post**: Always posts one item (perfect for cron jobs)
- **Article Share Format**: Creates rich URL previews automatically
- **Token Expiration Handling**: Clear guidance when 60-day token expires
- **Dry Run Mode**: Test without posting
- **Duplicate Prevention**: Tracks sent posts in `linkedin-sent.json`

## Setup

### 1. Create LinkedIn Developer App

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create a new app
3. Add required scopes: `w_member_social`, `r_liteprofile`
4. Generate access token

### 2. Set Environment Variable

```bash
export LINKEDIN_ACCESS_TOKEN="your_access_token_here"
```

## Usage

```bash
# Make script executable (first time only)
chmod +x extract-to-linkedin.js

# Dry run - test without posting
./extract-to-linkedin.js --dry-run

# Post next item in queue (daily usage)
./extract-to-linkedin.js

# Or with node
node extract-to-linkedin.js --dry-run
node extract-to-linkedin.js
```

## How It Works

1. **Queue Processing**: Posts the first unsent item from extracted content
2. **LinkedIn API**: Creates article share with your text as commentary
3. **URL Preview**: LinkedIn automatically generates rich preview card
4. **Tracking**: Marks item as sent in `linkedin-sent.json`
5. **Rate Limiting**: Single post per run (ideal for daily scheduling)

## Post Format

Each LinkedIn post includes:
- Your extracted text as the main commentary
- Automatic URL preview card with title, description, and image
- Public visibility (connects with your professional network)

Example output:
```
People don't generally value reliability that much unless the site is down, or things are really bad.

[LinkedIn automatically shows preview card for: https://www.rubick.com/reliability-all-stick-no-carrot/]
```

## Scheduling for Daily Posts

### Using Cron (Linux/Mac)
```bash
# Add to crontab: post daily at 9 AM
0 9 * * * cd /path/to/blog && ./extract-to-linkedin.js >> linkedin-posts.log 2>&1
```

### Manual Usage
```bash
# Check what would be posted next
./extract-to-linkedin.js --dry-run

# Post it
./extract-to-linkedin.js
```

## File Structure

```
extracted-content/
├── post1.txt                    # Source content files
├── post2.txt
└── all-extracts.txt            # Ignored by script

linkedin-sent.json               # Tracking file (auto-created)
linkedin-posts.log              # Optional log file for cron
```

## Example Output

```bash
$ ./extract-to-linkedin.js --dry-run
Starting LinkedIn posting in DRY RUN mode...
Found 45 extracted posts
12 already sent, 33 remaining
Processing: "People don't generally value reliability that much..." from 2025-01-15--reliability-all-stick-no-carrot.txt
[DRY RUN] Posting: "People don't generally value reliability that much..."
  Would post to LinkedIn with URL: https://www.rubick.com/reliability-all-stick-no-carrot/

=== Summary ===
Dry run: Posted 1 update successfully
Tracking file: ./linkedin-sent.json
Total posts sent to date: 12
Remaining posts in queue: 32
```

## Token Management

### Token Lifespan
- LinkedIn access tokens expire after ~60 days
- Script provides clear error messages when tokens expire
- No automatic refresh available (LinkedIn limitation)

### Re-authentication Process
1. When token expires, script shows authentication error
2. Generate new token from LinkedIn Developer console
3. Update `LINKEDIN_ACCESS_TOKEN` environment variable
4. Resume posting

### Token Security
```bash
# Store token securely
echo 'export LINKEDIN_ACCESS_TOKEN="your_token"' >> ~/.bashrc

# Or use environment file (don't commit to git)
echo 'LINKEDIN_ACCESS_TOKEN=your_token' > .env
```

## Troubleshooting

### Authentication Errors
```
LinkedIn API authentication failed. Token may be expired.
```
**Solution**: Generate new access token and update environment variable.

### No Posts Found
```
All posts have already been sent!
```
**Solution**: All content has been posted. Run content extraction to generate new posts.

### Permission Errors
```
LinkedIn API error 403: Insufficient permissions
```
**Solution**: Ensure your LinkedIn app has `w_member_social` scope enabled.

### Rate Limiting
LinkedIn allows 150 requests/day per member. Single daily posts stay well within limits.

## Best Practices

### Content Quality
- Script posts your extracted content exactly as written
- Ensure extracted content is professionally appropriate
- LinkedIn article shares work best with insightful commentary

### Posting Strategy
- Run daily at consistent times for best engagement
- Monitor LinkedIn analytics to optimize posting times
- Consider LinkedIn's professional audience when extracting content

### Security
- Never commit `linkedin-sent.json` or tokens to version control
- Rotate access tokens periodically
- Use environment variables, not hardcoded credentials

## Why LinkedIn API?

LinkedIn's API provides several advantages for professional content sharing:

- **Professional Audience**: Reach your professional network with relevant insights
- **Rich Preview Cards**: Automatic URL previews with title, description, and image
- **Article Share Format**: Perfect for blog content with commentary
- **Daily Posting**: Single post approach works well for professional content
- **Native Integration**: Posts appear natural in LinkedIn feed