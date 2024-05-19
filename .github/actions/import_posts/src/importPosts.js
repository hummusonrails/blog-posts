import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import couchbase from 'couchbase';

// Couchbase connection setup
const cluster = await couchbase.connect(process.env.COUCHBASE_URL, {
  username: process.env.COUCHBASE_USERNAME,
  password: process.env.COUCHBASE_PASSWORD,
  configProfile: "wanDevelopment",
});
const bucket = cluster.bucket(process.env.COUCHBASE_BUCKET);
const collection = bucket.defaultCollection();

// Provide the path to your Markdown files
const markdownDir = './posts';

// Grab all Markdown files in the directory
const getMarkdownFiles = () => {
  return fs.readdirSync(markdownDir).filter(file => file.endsWith('.md') || file.endsWith('.mdx'));
};

// Read the content of a Markdown file
const readMarkdownFile = (fileName) => {
  const filePath = path.join(markdownDir, fileName);
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

// Migrate Markdown files to Couchbase
const migrateMarkdownToCouchbase = async () => {
  const files = getMarkdownFiles();
  
  for (const file of files) {
    const content = readMarkdownFile(file);
    const parsedData = parseMarkdown(content);
    await storeBlogPost(parsedData);
  }
  
  console.log('Migration completed.');
};

// Execute the migration
migrateMarkdownToCouchbase().catch(console.error);
