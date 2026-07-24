#!/usr/bin/env python3
"""
WordPress → Astro Migration Script
Fetches all posts, pages, categories from WordPress REST API,
converts HTML to Markdown, downloads images, and saves content.
"""

import requests
import html2text
import os
import re
import json
import time
from pathlib import Path
from urllib.parse import urlparse, urljoin

BASE_URL = "https://fashionableexpert.com"
API_BASE = f"{BASE_URL}/wp-json/wp/v2"
PROJECT_ROOT = Path("/Users/wong/Desktop/Astroweb/fashionableexpert")
CONTENT_DIR = PROJECT_ROOT / "src/content/articles"
IMAGES_DIR = PROJECT_ROOT / "public/images"
PAGES_DIR = PROJECT_ROOT / "src/pages"

# Ensure directories exist
CONTENT_DIR.mkdir(parents=True, exist_ok=True)
IMAGES_DIR.mkdir(parents=True, exist_ok=True)
PAGES_DIR.mkdir(parents=True, exist_ok=True)

# Configure html2text
h = html2text.HTML2Text()
h.body_width = 0  # Don't wrap lines
h.ignore_links = False
h.ignore_images = False
h.ignore_emphasis = False
h.unicode_snob = True  # Use Unicode characters
h.mark_code = True
h.protect_links = True  # Don't wrap links

# Track what we download
downloaded_images = {}
stats = {"posts": 0, "images": 0, "pages": 0, "failed_images": 0}


def slugify(text):
    """Simple slug for frontmatter filename safety."""
    return re.sub(r'[^a-z0-9-]', '', text.lower().replace(' ', '-'))[:80]


def fetch_all_posts():
    """Fetch all posts with pagination."""
    posts = []
    page = 1
    while True:
        url = f"{API_BASE}/posts?per_page=50&page={page}&_embed=1"
        print(f"  Fetching page {page}...", end=" ")
        resp = requests.get(url)
        if resp.status_code != 200:
            print(f"Error: {resp.status_code}")
            break
        data = resp.json()
        if not data:
            print("Done!")
            break
        posts.extend(data)
        print(f"Got {len(data)} posts (total: {len(posts)})")
        page += 1
        time.sleep(0.3)  # Be polite to the server
    return posts


def fetch_all_categories():
    """Fetch all categories."""
    resp = requests.get(f"{API_BASE}/categories?per_page=50")
    if resp.status_code == 200:
        return resp.json()
    return []


def fetch_all_pages():
    """Fetch all pages."""
    resp = requests.get(f"{API_BASE}/pages?per_page=50&_embed=1")
    if resp.status_code == 200:
        return resp.json()
    return []


def download_image(img_url):
    """Download an image and return the local path."""
    global stats

    if img_url in downloaded_images:
        return downloaded_images[img_url]

    # Parse URL to get filename
    parsed = urlparse(img_url)
    filename = os.path.basename(parsed.path)
    if not filename or '.' not in filename:
        downloaded_images[img_url] = img_url
        return img_url

    # Avoid overwriting — add suffix if needed
    local_path = IMAGES_DIR / filename
    if local_path.exists():
        # Check if same file
        name, ext = os.path.splitext(filename)
        local_path = IMAGES_DIR / f"{name}-{hash(img_url) % 10000:04d}{ext}"

    try:
        resp = requests.get(img_url, timeout=30)
        if resp.status_code == 200:
            local_path.write_bytes(resp.content)
            downloaded_images[img_url] = f"/images/{local_path.name}"
            stats["images"] += 1
            if stats["images"] % 20 == 0:
                print(f"    Downloaded {stats['images']} images...")
            return downloaded_images[img_url]
        else:
            print(f"    Failed to download {img_url}: HTTP {resp.status_code}")
            stats["failed_images"] += 1
            downloaded_images[img_url] = img_url  # Keep original URL
            return img_url
    except Exception as e:
        print(f"    Error downloading {img_url}: {e}")
        stats["failed_images"] += 1
        downloaded_images[img_url] = img_url
        return img_url


def replace_images_in_html(html_content):
    """Find all img tags, download ONLY the first image, keep others as-is."""
    img_pattern = re.compile(r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>', re.IGNORECASE)
    first_downloaded = False

    def replacer(match):
        nonlocal first_downloaded
        old_url = match.group(1)
        # Fix http → https
        if old_url.startswith('http://'):
            old_url = old_url.replace('http://', 'https://')

        # Only download first image from our domain; skip the rest
        if 'fashionableexpert.com' in old_url and not first_downloaded:
            first_downloaded = True
            new_url = download_image(old_url)
            return match.group(0).replace(match.group(1), new_url)
        # For remaining images, just fix http→https and leave URL as-is
        return match.group(0).replace(match.group(1), old_url)

    return img_pattern.sub(replacer, html_content)


def extract_featured_image(post):
    """Extract featured image URL from _embedded data."""
    if '_embedded' in post and 'wp:featuredmedia' in post['_embedded']:
        media = post['_embedded']['wp:featuredmedia']
        if media and len(media) > 0:
            source_url = media[0].get('source_url', '')
            if source_url:
                source_url = source_url.replace('http://', 'https://')
                return download_image(source_url)
    return None


def html_to_markdown(html_content):
    """Convert WordPress HTML to Markdown."""
    # html2text handles most of the conversion
    md = h.handle(html_content)

    # Clean up common WordPress artifacts
    md = re.sub(r'\[\s*&hellip;\s*\]', '...', md)  # [&hellip;] → ...
    md = re.sub(r'&#8217;', "'", md)
    md = re.sub(r'&#8211;', '–', md)
    md = re.sub(r'&#8212;', '—', md)
    md = re.sub(r'&#8220;', '"', md)
    md = re.sub(r'&#8221;', '"', md)

    # Clean up multiple blank lines
    md = re.sub(r'\n{3,}', '\n\n', md)

    # Strip leading/trailing whitespace
    md = md.strip()

    return md


def convert_post_to_markdown(post, categories_map):
    """Convert a single post to Markdown frontmatter + content."""
    # Extract data
    title = post['title']['rendered']
    # Decode HTML entities in title
    title = title.replace('&#8217;', "'").replace('&#8211;', '–').replace('&#8212;', '—')
    title = title.replace('&#8220;', '"').replace('&#8221;', '"').replace('&#038;', '&')
    title = title.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')

    slug = post['slug']
    date = post['date'][:10]  # YYYY-MM-DD
    date_obj = post['date']

    # Parse date components for URL
    year = date_obj[:4]
    month = date_obj[5:7]
    day = date_obj[8:10]

    # Get categories
    cat_ids = post.get('categories', [])
    cat_names = [categories_name_map.get(cid, 'uncategorized') for cid in cat_ids]
    cat_slugs = [categories_map.get(cid, 'uncategorized') for cid in cat_ids]

    # Get tags
    tag_ids = post.get('tags', [])
    tags = []
    if tag_ids:
        for tid in tag_ids:
            # We'll resolve tags later if we have a map
            tags.append(str(tid))

    # Get excerpt
    excerpt_html = post['excerpt']['rendered']
    # Strip HTML tags for plain text excerpt
    excerpt = re.sub(r'<[^>]+>', '', excerpt_html)
    excerpt = excerpt.replace('&#8217;', "'").replace('&#8211;', '–')
    excerpt = excerpt.replace('[&hellip;]', '...').replace('&hellip;', '...')
    excerpt = excerpt.strip()

    # Process content: download images first
    content_html = post['content']['rendered']
    content_html = replace_images_in_html(content_html)

    # Convert to Markdown
    content_md = html_to_markdown(content_html)

    # Get featured image
    featured_image = extract_featured_image(post)

    # Get post URL path
    post_link = post['link']
    url_path = post_link.replace(BASE_URL, '').rstrip('/')

    # Build frontmatter
    frontmatter = "---\n"
    frontmatter += f"title: \"{title}\"\n"
    frontmatter += f"date: \"{date}\"\n"
    frontmatter += f"postSlug: \"{slug}\"\n"
    frontmatter += f"year: \"{year}\"\n"
    frontmatter += f"month: \"{month}\"\n"
    frontmatter += f"day: \"{day}\"\n"
    frontmatter += f"categories: {json.dumps(cat_names)}\n"
    frontmatter += f"categorySlugs: {json.dumps(cat_slugs)}\n"
    if excerpt:
        frontmatter += f"excerpt: \"{excerpt}\"\n"
    if featured_image:
        frontmatter += f"image: \"{featured_image}\"\n"
    frontmatter += f"urlPath: \"{url_path}\"\n"
    frontmatter += "---\n\n"

    # Use post slug as filename
    filename = CONTENT_DIR / f"{slug}.md"
    filename.write_text(frontmatter + content_md)

    return slug


def save_page(page):
    """Save a WordPress page as an Astro/Markdown file."""
    title = page['title']['rendered']
    slug = page['slug']
    content_html = page['content']['rendered']

    # Skip some default WP pages
    if slug in ['sample-page']:
        return None

    # Download images in page content
    content_html = replace_images_in_html(content_html)
    content_md = html_to_markdown(content_html)

    # Decode title
    title = title.replace('&#8217;', "'").replace('&#038;', '&')

    # For specific pages, create .astro pages later
    # For now, save as markdown in content
    frontmatter = f"""---
title: "{title}"
slug: "{slug}"
type: "page"
---

"""

    # Map known pages to simpler names
    page_map = {
        'about-us': 'about',
        'contact-me': 'contact',
        'privacy-policy': 'privacy-policy',
        'blog': 'blog',
    }

    if slug in page_map:
        dest_slug = page_map[slug]
    else:
        dest_slug = slug

    # Save as .md for now, we'll create Astro pages later
    filepath = CONTENT_DIR / f"_page_{dest_slug}.md"
    filepath.write_text(frontmatter + content_md)

    return slug


def save_categories_json(categories):
    """Save categories as a JSON file for use in layouts."""
    data = []
    for cat in categories:
        data.append({
            "id": cat["id"],
            "name": cat["name"],
            "slug": cat["slug"],
            "count": cat["count"],
            "link": cat["link"],
        })

    # Save to src/content/ for Astro access
    cat_file = CONTENT_DIR.parent / "categories.json"
    cat_file.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    print(f"  Saved {len(data)} categories")


def main():
    print("=" * 60)
    print("WordPress → Astro Migration Script")
    print("=" * 60)

    # Step 1: Fetch categories
    print("\n📂 Fetching categories...")
    categories = fetch_all_categories()
    categories_map = {cat['id']: cat['slug'] for cat in categories}
    categories_name_map = {cat['id']: cat['name'] for cat in categories}
    print(f"  Found {len(categories)} categories")
    for cat in categories:
        print(f"    [{cat['id']}] {cat['name']} ({cat['slug']}) — {cat['count']} posts")

    save_categories_json(categories)

    # Step 2: Fetch all posts
    print("\n📝 Fetching posts...")
    posts = fetch_all_posts()
    print(f"  Total posts: {len(posts)}")

    # Step 3: Convert posts
    print("\n🔄 Converting posts to Markdown...")
    for i, post in enumerate(posts):
        slug = convert_post_to_markdown(post, categories_name_map)
        stats["posts"] += 1
        if (i + 1) % 20 == 0:
            print(f"  Converted {i + 1}/{len(posts)} posts")

    print(f"  Total converted: {stats['posts']} posts")

    # Step 4: Fetch and save pages
    print("\n📄 Fetching pages...")
    pages = fetch_all_pages()
    print(f"  Found {len(pages)} pages")
    for page in pages:
        saved = save_page(page)
        if saved:
            stats["pages"] += 1
            print(f"  Saved page: {saved} — \"{page['title']['rendered']}\"")

    # Step 5: Summary
    print("\n" + "=" * 60)
    print("MIGRATION COMPLETE")
    print("=" * 60)
    print(f"  Posts:     {stats['posts']}")
    print(f"  Pages:     {stats['pages']}")
    print(f"  Images:    {stats['images']} downloaded")
    print(f"  Failed:    {stats['failed_images']} images")
    print(f"\n  Content:   {CONTENT_DIR}")
    print(f"  Images:    {IMAGES_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    main()
