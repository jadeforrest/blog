# LinkedIn Authentication Setup

The `extract-to-linkedin.js` script requires a LinkedIn access token that expires every ~60 days.

## Initial Setup

1. Obtain a LinkedIn access token with the `w_member_social` scope
2. Store the token in `../source-linkedin-token` (one directory above the blog repository)
3. Source the file to set the environment variable:
   ```bash
   source ../source-linkedin-token
   ```

## Refreshing the Token (Every 60 Days)

When you see authentication errors like:
- "LinkedIn API authentication failed. Token may be expired."
- "Your LinkedIn access token may have expired"

Follow these steps:

1. Get a new LinkedIn access token:
   - Go to your LinkedIn app's authentication page. (https://developer.linkedin.com, then click My apps, then Share post app, then Auth tab, Click on Oauth 2.0 tools, then create a new access token)
   - Generate a new access token with `w_member_social` scope

2. Update the token in `../source-linkedin-token`:
   ```bash
   export LINKEDIN_ACCESS_TOKEN="your_new_token_here"
   ```

3. Source the updated file:
   ```bash
   source ../source-linkedin-token
   ```

4. Test the new token:
   ```bash
   node extract-to-linkedin.js --dry-run
   ```

## Environment Variables

The script requires:
- `LINKEDIN_ACCESS_TOKEN` (required): Your LinkedIn API access token

## Running the Script

```bash
# Load the token
source ../source-linkedin-token

# Dry run to test without posting
node extract-to-linkedin.js --dry-run

# Post a single random update
node extract-to-linkedin.js
```
