const dotenv = require("dotenv");
dotenv.config();
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const couchbase = require('couchbase');
const openai = require("openai");
const encoding_for_model = require("tiktoken");

const openaiClient = new openai({ apiKey: process.env.OPENAI_KEY });

// Couchbase connection setup
let collection;

async function connectToCluster() {
  const cluster = await couchbase.connect(process.env.COUCHBASE_URL, {
    username: process.env.COUCHBASE_USERNAME,
    password: process.env.COUCHBASE_PASSWORD,
    configProfile: "wanDevelopment",
  });
  const bucket = cluster.bucket(process.env.COUCHBASE_BUCKET);
  collection = bucket.defaultCollection();
}

// Directories
const draftsDir = './drafts';
const publishedDir = './published';

// Embedding model
const MODEL_IDENTIFIER = 'text-embedding-ada-002';


// Get all Markdown files in the drafts directory
const getMarkdownFiles = (dir) => {
  try {
    const files = fs.readdirSync(dir).filter(file => /\.(md|mdx)$/.test(file));
    if (files.length === 0) {
      console.error(`No Markdown files found in directory: ${dir}`);
      throw new Error('No Markdown files found.');
    }
    return files;
  } catch (error) {
    console.error(`Error reading directory: ${error.message}`);
    return [];
  }
};

// Read the content of a Markdown file
const readMarkdownFile = async (fileName, dir) => {
  const filePath = path.join(dir, fileName);
  return await fs.promises.readFile(filePath, 'utf-8');
};

// Parse the frontmatter and content of a Markdown file
const parseMarkdown = (content) => {
  const { data, content: markdownContent } = matter(content);
  return { ...data, content: markdownContent };
};

// Generate embeddings
async function generateEmbeddings(text) {
  if (!text) {
    console.error('Text parameter is null or undefined. Skipping API call.');
    return null;
  }

  try {
    const response = await openaiClient.embeddings.create({
      model: MODEL_IDENTIFIER,
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error(`Error generating embeddings: ${error.message}`);
    return null;
  }
}

// Store embeddings
async function storeEmbeddings(postId, content) {
  const MAX_TOKENS = 8192;
  const encoding = encoding_for_model(MODEL_IDENTIFIER);

  // Calculate tokens and shorten if necessary
    const encodedLength = encoding.encode(content).length;
    try {
      if (encodedLength > MAX_TOKENS) {
        content = content.slice(0, content.length - (encodedLength - MAX_TOKENS));
      }
    } catch (error) {
      console.error(`Error encoding content: ${error.message}`);
    }

  const embeddings = await generateEmbeddings(content);
  await collection.upsert(`embedding::${postId}`, { type: 'embedding', embeddings });
  console.log(`Processed and stored embeddings for post ${postId}`);
}

// Store the blog post in Couchbase
const storeBlogPost = async (post) => {
  try {
    const generatePostId = (post) => {
      return `blog_${post.title.replace(/\s+/g, '-').toLowerCase()}_${Date.parse(post.date)}`;
    };

    const id = generatePostId(post);
    await collection.upsert(id, { ...post, type: 'blogPost' });
    console.log(`Inserted or updated: ${id}`);

    // Generate and store embeddings
    await storeEmbeddings(id, post.content);
  } catch (error) {
    console.error(`Error storing blog post: ${error.message}`);
  }
};

// Move a file from the drafts directory to the published directory
const moveFileToPublished = async (fileName) => {
  const oldPath = path.join(draftsDir, fileName);
  const newPath = path.join(publishedDir, fileName);

  if (fs.existsSync(oldPath)) {
    try {
      console.log(`Moving file from ${oldPath} to ${newPath}`);
      await fs.promises.rename(oldPath, newPath);
      console.log(`File ${fileName} moved to published directory.`);
    } catch (error) {
      console.error(`Error moving file: ${error.message}`);
    }
  }
};

// Print directory contents
const printDirectoryContents = (dir) => {
  const files = fs.readdirSync(dir);
  console.table(files);
};

// Migrate Markdown files to Couchbase and move them to the published folder
const migrateMarkdownToCouchbase = async () => {
  await connectToCluster();

  const files = getMarkdownFiles(draftsDir);

  for (const file of files) {
    const content = await readMarkdownFile(file, draftsDir);
    const parsedData = parseMarkdown(content);  // Parse the markdown content
    try {
      await storeBlogPost(parsedData);
    } catch (error) {
      console.error(`Error storing blog post: ${error.message}`);
      throw error;
    }

    // Print contents before moving
    printDirectoryContents(draftsDir);
    printDirectoryContents(publishedDir);

    try {
      await moveFileToPublished(file);
    } catch (error) {
      console.error(`Error moving file: ${error.message}`);
      throw error;
    }

    // Print contents after moving
    printDirectoryContents(draftsDir);
    printDirectoryContents(publishedDir);
  }

  console.log('Migration completed.');
};

// Execute the migration
migrateMarkdownToCouchbase().catch(console.error);
