#!/usr/bin/env python3

import os
import re
import json
import glob
import argparse
from pathlib import Path
from typing import List, Dict, Optional, Tuple

# AI provider configurations
AI_PROVIDERS = {
    'anthropic': {
        'api_key_env': 'ANTHROPIC_API_KEY',
        'model': 'claude-3-sonnet-20240229'
    },
    'openai': {
        'api_key_env': 'OPENAI_API_KEY', 
        'model': 'gpt-4'
    }
}

# Configuration
BASE_URL = 'https://www.rubick.com'
CONTENT_DIR = './content/posts'
OUTPUT_DIR = './extracted-content'

def find_markdown_files(content_dir: str) -> List[str]:
    """Find all index.md files in the content directory."""
    pattern = os.path.join(content_dir, '**/index.md')
    return glob.glob(pattern, recursive=True)

def parse_markdown_file(file_path: str) -> Tuple[str, str, str]:
    """Parse markdown file and extract title, content, and front matter."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    front_matter_end = -1
    in_front_matter = False
    
    for i, line in enumerate(lines):
        if line.strip() == '---':
            if not in_front_matter:
                in_front_matter = True
            else:
                front_matter_end = i
                break
    
    if front_matter_end == -1:
        return '', content, ''
    
    front_matter = '\n'.join(lines[1:front_matter_end])
    markdown_content = '\n'.join(lines[front_matter_end + 1:])
    
    # Extract title from front matter
    title_match = re.search(r'title:\s*(.+)', front_matter)
    title = title_match.group(1).strip('\'"') if title_match else ''
    
    return title, markdown_content, front_matter

def generate_url(file_path: str) -> str:
    """Generate URL from file path."""
    dir_name = os.path.basename(os.path.dirname(file_path))
    # Remove date prefix (YYYY-MM-DD--) if present
    slug = re.sub(r'^\d{4}-\d{2}-\d{2}--', '', dir_name)
    return f"{BASE_URL}/{slug}/"

def analyze_with_anthropic(content: str, title: str) -> List[str]:
    """Analyze content using Anthropic API."""
    try:
        import anthropic
        
        api_key = os.getenv('ANTHROPIC_API_KEY')
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable not set")
        
        client = anthropic.Anthropic(api_key=api_key)
        
        prompt = f"""Analyze this blog post and extract 2-4 of the most interesting, valuable, or insightful sentences or short passages. Each extract should be 1-3 sentences long and capture key insights, practical advice, or thought-provoking ideas.

Focus on:
- Actionable advice
- Surprising insights  
- Memorable quotes or principles
- Practical frameworks or models

Title: {title}

Content:
{content}

Return only the extracted passages, one per line, without quotes or additional formatting. Each extract should be a complete thought that stands alone."""

        response = client.messages.create(
            model=AI_PROVIDERS['anthropic']['model'],
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        extracts = [line.strip() for line in response.content[0].text.strip().split('\n') 
                   if line.strip() and len(line.strip()) > 20]
        return extracts[:4]
        
    except ImportError:
        print("  ⚠ anthropic package not installed. Install with: pip install anthropic")
        return []
    except Exception as e:
        print(f"  ⚠ Anthropic API error: {e}")
        return []

def analyze_with_openai(content: str, title: str) -> List[str]:
    """Analyze content using OpenAI API."""
    try:
        import openai
        
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")
        
        openai.api_key = api_key
        
        prompt = f"""Analyze this blog post and extract 2-4 of the most interesting, valuable, or insightful sentences or short passages. Each extract should be 1-3 sentences long and capture key insights, practical advice, or thought-provoking ideas.

Focus on:
- Actionable advice
- Surprising insights
- Memorable quotes or principles  
- Practical frameworks or models

Title: {title}

Content:
{content}

Return only the extracted passages, one per line, without quotes or additional formatting. Each extract should be a complete thought that stands alone."""

        response = openai.ChatCompletion.create(
            model=AI_PROVIDERS['openai']['model'],
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000
        )
        
        extracts = [line.strip() for line in response.choices[0].message.content.strip().split('\n')
                   if line.strip() and len(line.strip()) > 20]
        return extracts[:4]
        
    except ImportError:
        print("  ⚠ openai package not installed. Install with: pip install openai")
        return []
    except Exception as e:
        print(f"  ⚠ OpenAI API error: {e}")
        return []

def fallback_analysis(content: str, title: str) -> List[str]:
    """Fallback analysis using simple heuristics."""
    paragraphs = [p.strip() for p in content.split('\n\n') if len(p.strip()) > 100]
    extracts = []
    
    # Look for paragraphs with actionable language
    action_words = ['should', 'can', 'will', 'use', 'try', 'make', 'create', 'implement', 'focus', 'approach']
    insight_words = ['insight', 'key', 'important', 'crucial', 'surprising', 'learned', 'discovered']
    
    for paragraph in paragraphs:
        sentences = [s.strip() for s in re.split(r'[.!?]+', paragraph) if len(s.strip()) > 30]
        
        for sentence in sentences:
            lower_sentence = sentence.lower()
            has_action_word = any(word in lower_sentence for word in action_words)
            has_insight_word = any(word in lower_sentence for word in insight_words)
            
            if (has_action_word or has_insight_word) and len(extracts) < 4:
                extracts.append(sentence.strip() + '.')
        
        if len(extracts) >= 4:
            break
    
    # If we don't have enough, grab first few substantial sentences
    if len(extracts) < 2:
        all_sentences = [s.strip() for s in re.split(r'[.!?]+', content) if len(s.strip()) > 50]
        extracts.extend([s + '.' for s in all_sentences[:3]])
    
    return extracts[:4]

def analyze_content(content: str, title: str, provider: str) -> List[str]:
    """Analyze content using the specified AI provider."""
    if provider == 'anthropic':
        return analyze_with_anthropic(content, title)
    elif provider == 'openai':
        return analyze_with_openai(content, title)
    else:
        return fallback_analysis(content, title)

def process_file(file_path: str, ai_provider: str) -> Dict:
    """Process a single markdown file."""
    print(f"Processing: {file_path}")
    
    title, content, front_matter = parse_markdown_file(file_path)
    url = generate_url(file_path)
    
    # Analyze content with AI
    extracts = analyze_content(content, title, ai_provider)
    if not extracts:
        print(f"  ⚠ AI analysis failed, using fallback")
        extracts = fallback_analysis(content, title)
    else:
        print(f"  ✓ Analyzed with {ai_provider}")
    
    # Generate output content
    output_lines = []
    for extract in extracts:
        if extract and len(extract.strip()) > 10:
            output_lines.append(f"{extract}\n{url}")
    
    output = '\n\n'.join(output_lines)
    
    # Create output file
    file_name = os.path.basename(os.path.dirname(file_path)) + '.txt'
    output_path = os.path.join(OUTPUT_DIR, file_name)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(output)
    
    print(f"  ✓ Created: {output_path}")
    
    return {
        'file_path': file_path,
        'output_path': output_path,
        'extract_count': len(extracts),
        'title': title,
        'url': url
    }

def main():
    parser = argparse.ArgumentParser(description='Extract interesting content from markdown files using AI')
    parser.add_argument('--provider', choices=['anthropic', 'openai', 'fallback'], 
                       default='anthropic', help='AI provider to use for analysis')
    parser.add_argument('--content-dir', default=CONTENT_DIR, help='Content directory path')
    parser.add_argument('--output-dir', default=OUTPUT_DIR, help='Output directory path')
    parser.add_argument('--base-url', default=BASE_URL, help='Base URL for generated links')
    
    args = parser.parse_args()
    
    global CONTENT_DIR, OUTPUT_DIR, BASE_URL
    CONTENT_DIR = args.content_dir
    OUTPUT_DIR = args.output_dir
    BASE_URL = args.base_url
    
    print(f'Starting content extraction with {args.provider}...')
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Find all markdown files
    markdown_files = find_markdown_files(CONTENT_DIR)
    print(f"Found {len(markdown_files)} markdown files")
    
    # Process each file
    results = []
    for file_path in markdown_files:
        try:
            result = process_file(file_path, args.provider)
            results.append(result)
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
    
    # Create a master file with all extracts
    master_file = os.path.join(OUTPUT_DIR, 'all-extracts.txt')
    all_extracts = []
    
    for result in results:
        if os.path.exists(result['output_path']):
            with open(result['output_path'], 'r', encoding='utf-8') as f:
                content = f.read()
                all_extracts.append(content)
    
    with open(master_file, 'w', encoding='utf-8') as f:
        f.write('\n\n---\n\n'.join(all_extracts))
    
    # Create summary JSON
    summary_file = os.path.join(OUTPUT_DIR, 'summary.json')
    summary = {
        'total_files': len(results),
        'total_extracts': sum(r['extract_count'] for r in results),
        'ai_provider': args.provider,
        'files': results
    }
    
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2)
    
    # Summary
    print('\n=== Summary ===')
    print(f"Processed {len(results)} files")
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"Total extracts: {sum(r['extract_count'] for r in results)}")
    print(f"Master file: {master_file}")
    print(f"Summary file: {summary_file}")

if __name__ == '__main__':
    main()