# Content Extraction Scripts

This directory contains scripts to analyze markdown files in your blog and extract the most interesting content using AI. Each script creates individual output files for each markdown page, containing the best extracts along with full URLs.

## Available Scripts

### 1. Python Script (Recommended) - `extract-content.py`

The most feature-complete version with support for multiple AI providers.

**Features:**
- Supports Anthropic Claude API
- Supports OpenAI API  
- Fallback analysis using heuristics
- Creates individual files and a master compilation
- JSON summary with statistics

**Prerequisites:**
```bash
# Install required packages
pip install anthropic openai  # or just the one you plan to use
```

**Setup:**
```bash
# For Anthropic Claude
export ANTHROPIC_API_KEY="your-api-key-here"

# For OpenAI GPT-4
export OPENAI_API_KEY="your-api-key-here"
```

**Usage:**
```bash
# Using Anthropic Claude (default)
python extract-content.py

# Using OpenAI
python extract-content.py --provider openai

# Using fallback analysis (no API required)
python extract-content.py --provider fallback

# Custom directories
python extract-content.py --content-dir ./content/posts --output-dir ./my-extracts
```

### 2. Node.js with Claude Code - `extract-content-claude.js`

Uses Claude Code CLI for analysis with fallback to heuristics.

**Prerequisites:**
- Claude Code CLI installed and configured

**Usage:**
```bash
node extract-content-claude.js
```

### 3. Basic Node.js Script - `extract-content.js`

Basic framework with placeholder AI functions.

**Usage:**
```bash
node extract-content.js
```

## Output Structure

All scripts create:

```
extracted-content/
├── 2025-01-15--reliability-all-stick-no-carrot.txt
├── 2021-05-11--unusual-tips-to-keep-slack-from-becoming-a-nightmare.txt
├── 2022-07-19--shit-shield.txt
├── ...
├── all-extracts.txt     # Master file with all extracts
└── summary.json         # Statistics and metadata (Python script only)
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

### Changing the Base URL
```bash
python extract-content.py --base-url "https://yourdomain.com"
```

### Different Content Directory
```bash
python extract-content.py --content-dir "./my-content/posts"
```

### Modifying Analysis Criteria

Edit the AI prompt in any script to change what type of content gets extracted. Look for the prompt variable and modify the "Focus on:" section.

## Troubleshooting

### API Key Issues
- Make sure your API keys are properly set as environment variables
- Check that you have sufficient API credits/quota
- Verify your API key has the correct permissions

### No Extracts Generated
- The script will fall back to heuristic analysis if AI fails
- Check that your markdown files have substantial content (>100 characters)
- Ensure front matter is properly formatted with `---` delimiters

### Permission Errors
```bash
chmod +x extract-content.py
chmod +x extract-content-claude.js
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