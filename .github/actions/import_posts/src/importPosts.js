import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import couchbase from 'couchbase';
import * as core from '@actions/core';
import * as github from '@actions/github';

// Couchbase connection setup
const cluster = await couchbase.connect(process.env.COUCHBASE_URL, {
  username: process.env.COUCHBASE_USERNAME,
  password: process.env.COUCHBASE_PASSWORD,
  configProfile: "wanDevelopment",
});
const bucket = cluster.bucket(process.env.COUCHBASE_BUCKET);
const collection = bucket.defaultCollection(); 

// Directories
const draftsDir = './drafts';
const publishedDir = './published';

// Get all Markdown files in the drafts directory
const getMarkdownFiles = (dir) => {
  return fs.readdirSync(dir).filter(file => file.endsWith('.md') || file.endsWith('.mdx'));
};

// Read the content of a Markdown file
const readMarkdownFile = (fileName, dir) => {
  const filePath = path.join(dir, fileName);
  return fs.readFileSync(filePath, 'utf-8');
};

// Parse the frontmatter and content of a Markdown file
const parseMarkdown = (content) => {
  const { data, content: markdownContent } = matter(content);
  return { ...data, content: markdownContent };
};

// Insert or update the parsed blog post into Couchbase
const storeBlogPost = async (post) => {
  const id = `blog_${post.title.replace(/\s+/g, '-').toLowerCase()}_${new Date(post.date).getTime()}`;
  await collection.upsert(id, { ...post, type: 'blogPost' });
  console.log(`Inserted or updated: ${id}`);
};

// Move a file from the drafts directory to the published directory
const moveFileToPublished = (fileName) => {
  const oldPath = path.join(draftsDir, fileName);
  const newPath = path.join(publishedDir, fileName);
  fs.renameSync(oldPath, newPath);
};

// Migrate Markdown files to Couchbase and move them to the published folder
const migrateMarkdownToCouchbase = async () => {
  const files = getMarkdownFiles(draftsDir);

  for (const file of files) {
    const content = readMarkdownFile(file, draftsDir);
    const parsedData = parseMarkdown(content);
    await storeBlogPost(parsedData);
    moveFileToPublished(file);
  }

  console.log('Migration completed.');
};

// Execute the migration
migrateMarkdownToCouchbase().catch(console.error);