# Blog Posts Repository

Welcome to the repository for my personal blog posts! This repository hosts all the markdown posts for [my blog](https://bengreenberg.dev/blog).

## Repository Structure

The repository is organized as follows:

* All markdown posts are stored in `posts/`.
* After a new post is committed to `posts/` a GitHub action is triggered that uses the `importPosts.js` script to convert the markdown file to JSON and then sends it to the blog's Couchbase bucket.

## License

This repository is licensed under the [Creative Commons Attribution Share Alike 4.0 International license](LICENSE).