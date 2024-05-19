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

// Read the content of a Markdown file
const readMarkdownFile = (filePath) => {
  return fs.readFileSync(filePath, 'utf-8');
};

// Parse the frontmatter and content of a Markdown file
const parseMarkdown = (content) => {
  const { data, content: markdownContent } = matter(content);
  return { ...data, content: markdownContent };
};

// Insert the parsed blog post into Couchbase
const storeBlogPost = async (post) => {
  const id = `blog_${new Date(post.date).getTime()}`;
  await collection.upsert(id, { ...post, type: 'blogPost' });
  console.log(`Inserted: ${id}`);
};

// Fetch changed files from GitHub PR
const getChangedFiles = async () => {
  const token = core.getInput('GITHUB_TOKEN');
  const octokit = github.getOctokit(token);
  const { context } = github;
  const { owner, repo } = context.repo;
  const pull_number = context.payload.pull_request.number;

  const { data } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number,
  });

  return data.map(file => file.filename).filter(file => file.endsWith('.md') || file.endsWith('.mdx'));
};

// Migrate Markdown files to Couchbase
const migrateMarkdownToCouchbase = async () => {
  const changedFiles = await getChangedFiles();
  
  for (const file of changedFiles) {
    const content = readMarkdownFile(file);
    const parsedData = parseMarkdown(content);
    await storeBlogPost(parsedData);
  }
  
  console.log('Migration completed.');
};

// Execute the migration
migrateMarkdownToCouchbase().catch(console.error);
