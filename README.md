# Blog Posts Repository

Welcome to the repository for my personal blog posts! This repository hosts all the markdown posts for [my blog](https://bengreenberg.dev/blog).

## Repository Structure

The repository is organized as follows:

* All markdown draft blog posts are stored in `drafts/`.
* After a new PR is merged with the label `publish` then a GitHub action is triggered that uses the `importPosts.js` script to convert the markdown file to JSON and then sends it to the blog's Couchbase bucket.
* At the completion of the process, the published blog post is moved to the `published/` folder.

## License

This repository is licensed under the [Creative Commons Attribution Share Alike 4.0 International license](LICENSE).