const _ = require("lodash");
const path = require("path");
const Promise = require("bluebird");
const fs = require('fs');

const { createFilePath } = require(`gatsby-source-filesystem`);

exports.onCreateNode = ({ node, getNode, actions }) => {
  const { createNodeField } = actions;
  if (node.internal.type === `MarkdownRemark`) {
    const slug = createFilePath({ node, getNode });
    const fileNode = getNode(node.parent);
    const source = fileNode.sourceInstanceName;
    const separtorIndex = ~slug.indexOf("--") ? slug.indexOf("--") : 0;
    const shortSlugStart = separtorIndex ? separtorIndex + 2 : 0;

    if (source !== "parts") {
      createNodeField({
        node,
        name: `slug`,
        value: `${separtorIndex ? "/" : ""}${slug.substring(shortSlugStart)}`
      });
    }
    createNodeField({
      node,
      name: `prefix`,
      value: separtorIndex ? slug.substring(1, separtorIndex) : ""
    });
    createNodeField({
      node,
      name: `source`,
      value: source
    });
  }
};

function createPaginationJSON(pathSuffix, pagePosts) {
  const dir = "public/paginationJson/"
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
  }
  const filePath = dir+"index"+pathSuffix+".json";
  const dataToSave = JSON.stringify(pagePosts);
  fs.writeFile(filePath, dataToSave, function(err) {
    if(err) {
      return console.log(err);
    }
  }); 
}

exports.createPages = ({ graphql, actions }) => {
  const { createPage, createRedirect } = actions;
  
  // Create redirects
  createRedirect({
    fromPath: `/openacs/getting_started/`,
    toPath: `/posts/`,
    isPermanent: true,
  });
  
  createRedirect({
    fromPath: `/openacs/*`,
    toPath: `/posts/`,
    isPermanent: true,
  });
  
  createRedirect({
    fromPath: `/blogger/one-entry`,
    toPath: `/posts/`,
    isPermanent: true,
  });
  
  createRedirect({
    fromPath: `/blogger/one-entry/*`,
    toPath: `/posts/`,
    isPermanent: true,
  });

  return new Promise((resolve, reject) => {
    const postTemplate = path.resolve("./src/templates/PostTemplate.js");
    const pageTemplate = path.resolve("./src/templates/PageTemplate.js");
    const wikiTemplate = path.resolve("./src/templates/WikiTemplate.js");
    const tagTemplate = path.resolve("./src/templates/TagTemplate.js");
    
    const activeEnv = process.env.ACTIVE_ENV || process.env.NODE_ENV || "development"
    console.log(`Using environment config: '${activeEnv}'`)

    resolve(
      graphql(
        `
          {
            allMarkdownRemark(
              filter: { fields: { slug: { ne: null } } }
              sort: [{ fields: { prefix: DESC }}, { fields: { slug: ASC }}]
            ) {
                edges {
                  node {
                      id
                      excerpt
                      fields {
                          slug
                          prefix
                          source
                      }
                      frontmatter {
                          title
                          tags
                          cover {
                              children {
                                  ... on ImageSharp {
                                      gatsbyImageData(
                                          width: 800,
                                          height: 360,
                                          transformOptions: { cropFocus: CENTER },
                                          quality: 90,
                                          placeholder: BLURRED
                                      )
                                  }
                              }
                          }
                      }
                  }
              }
            }
          }
        `
      ).then(result => {
        if (result.errors) {
          console.log(result.errors);
          reject(result.errors);
        }

        var items = result.data.allMarkdownRemark.edges;

        // Don't leak drafts into production.
        if (activeEnv == "production") {
          items = items.filter(item => 
            (item.node.fields.prefix &&
            !(item.node.fields.prefix+"").startsWith("draft")) ||
            item.node.fields.source === "wiki" ||
            item.node.fields.source === "pages"
          )
        }

        // Create tags list
        const tagSet = new Set();
        items.forEach(edge => {
          const {
            node: {
              frontmatter: { tags }
            }
          } = edge;

          if (tags && tags != null) {
            tags.forEach(tag => {
              if (tag && tag !== null) {
                tagSet.add(tag);
              }
            })
          }
        });

        // Create tag pages
        const tagList = Array.from(tagSet);
        tagList.forEach(tag => {
          createPage({
            path: `/tag/${_.kebabCase(tag)}/`,
            component: tagTemplate,
            context: {
              tag
            }
          });
        });

        // Create posts
        const posts = items.filter(item => item.node.fields.source === "posts");
        posts.forEach(({ node }, index) => {
          const slug = node.fields.slug;
          const prev = index === 0 ? undefined : posts[index - 1].node;
          const next = index === posts.length - 1 ? undefined : posts[index + 1].node;
          const source = node.fields.source;

          createPage({
            path: slug,
            component: postTemplate,
            context: {
              slug,
              next,
              prev,
              source
            }
          });
        });

        // and pages.
        const pages = items.filter(item => item.node.fields.source === "pages");
        pages.forEach(({ node }) => {
          const slug = node.fields.slug;
          const source = node.fields.source;

          createPage({
            path: slug,
            component: pageTemplate,
            context: {
              slug,
              source
            }
          });
        });

        // and wiki pages.
        const wikiPages = items.filter(item => item.node.fields.source === "wiki");
        wikiPages.forEach(({ node }) => {
          const slug = node.fields.slug;
          const source = node.fields.source;

          // For wiki pages: remove trailing slash from markdown pages to distinguish from directory indexes
          const wikiPath = `/wiki${slug}`.replace(/\/$/, "");

          createPage({
            path: wikiPath,
            component: wikiTemplate,
            context: {
              slug,
              source
            }
          });
        });

        // Create directory index pages for wiki subdirectories
        const wikiDirectories = new Set();
        wikiPages.forEach(({ node }) => {
          const slug = node.fields.slug;
          const pathParts = slug.replace(/^\//, "").replace(/\/$/, "").split("/");
          
          // Only add directory paths, not the final file part
          // A directory exists if there are multiple path parts (more than just the filename)
          if (pathParts.length > 1) {
            // Build directory paths, excluding the last part (which is the filename)
            let currentPath = "";
            for (let i = 0; i < pathParts.length - 1; i++) {
              currentPath += "/" + pathParts[i];
              wikiDirectories.add(currentPath);
            }
          }
        });

        // Create pages for each directory
        wikiDirectories.forEach(dirPath => {
          createPage({
            path: `/wiki${dirPath}/`,
            component: wikiTemplate,
            context: {
              slug: `${dirPath}/`,
              source: "wiki"
            }
          });
        });

        // Create "paginated homepage" == pages which list blog posts.
        // And at the same time, create corresponding JSON for infinite scroll.
        // Users who have JS enabled will see infinite scroll instead of pagination.
        const postsPerPage = 3;
        const numPages = Math.ceil(posts.length / postsPerPage);

        _.times(numPages, i => {
          const pathSuffix = (i>0 ? i+1 : "");

          // Get posts for this page
          const startInclusive = i * postsPerPage;
          const endExclusive = startInclusive + postsPerPage;
          const pagePosts = posts.slice(startInclusive, endExclusive)
    
          createPaginationJSON(pathSuffix, pagePosts);
          createPage({
            path: `/posts`+pathSuffix,
            component: path.resolve("./src/templates/index.js"),
            context: {
              numPages,
              currentPage: i + 1,
              initialPosts: pagePosts
            }
          });
        });
      })
    );
  });
};