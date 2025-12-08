import React from "react";
import PropTypes from "prop-types";
import { FaCog } from "react-icons/fa";
import Hero from "../Hero";
import Blog from "./Blog.js";
import Pagination from "./Pagination";
import { InfiniteScroll } from "./InfiniteScroll";

/**
 * Template for "home" page with infinite scroll and fallback to pagination.
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.globalState - Global state object
 * @param {Function} props.globalState.isInitializing - Function to check if component is initializing
 * @param {Function} props.globalState.updateState - Function to update global state
 * @param {Function} props.globalState.isLoading - Function to check if data is loading
 * @param {Function} props.globalState.hasMore - Function to check if more data is available
 * @param {Function} props.globalState.loadMore - Function to load more data
 * @param {boolean} props.globalState.useInfiniteScroll - Flag to enable infinite scroll
 * @param {Object} props.pageContext - Page context object
 * @param {Array} props.pageContext.initialPosts - Initial posts to display
 * @param {number} props.pageContext.currentPage - Current page number
 * @param {Object} props.theme - Theme object
 * @param {Object} props.theme.hero - Hero section theme
 * @param {boolean} props.theme.hero.hide - Flag to hide hero section
 * @param {Object} props.theme.color - Color theme
 * @param {Object} props.theme.color.brand - Brand colors
 * @param {string} props.theme.color.brand.primaryLight - Primary light color
 */
class View extends React.Component {
  constructor(props) {
    super(props);
    if (props.globalState.isInitializing() || !props.globalState.useInfiniteScroll) {
      props.globalState.updateState({
        items: props.pageContext.initialPosts,
        cursor: props.pageContext.currentPage + 1,
      });
    }
  }

  render() {
    const g = this.props.globalState;
    const pageContext = this.props.pageContext;
    const theme = this.props.theme;
    const items = !g.isInitializing() ? g.items : pageContext.initialPosts;

    return (
      <React.Fragment>
        {/* Optional Hero section on first page. */}
        {pageContext.currentPage == 1 && !theme.hero.hide && <Hero theme={theme} />}

        {/* Blog posts with infinite scroll. */}
        <InfiniteScroll
          throttle={300}
          threshold={600}
          isLoading={g.isLoading}
          hasMore={g.hasMore(pageContext)}
          onLoadMore={g.loadMore}
        >
          <Blog posts={items} theme={theme} />
        </InfiniteScroll>

        {/* Loading spinner. */}
        {g.isLoading && (
          <div className="spinner">
            <FaCog />
          </div>
        )}

        {/* Fallback to Pagination for non JS users. */}
        <noscript>
          <style>{`.spinner { display: none !important; }`}</style>
          <Pagination pageContext={pageContext} theme={theme} />
        </noscript>

        {/* Fallback to Pagination on error. */}
        {!g.useInfiniteScroll && <Pagination pageContext={pageContext} theme={theme} />}

        <style jsx>{`
          @keyframes spinner {
            to {
              transform: rotate(360deg);
            }
          }
          .spinner {
            margin-top: 40px;
            font-size: 60px;
            text-align: center;
            display: ${g.useInfiniteScroll ? "block" : "none"};

            :global(svg) {
              fill: ${theme.color.brand.primaryLight};
              animation: spinner 3s linear infinite;
            }
          }
        `}</style>
      </React.Fragment>
    );
  }
}

View.propTypes = {
  globalState: PropTypes.shape({
    isInitializing: PropTypes.func.isRequired,
    updateState: PropTypes.func.isRequired,
    isLoading: PropTypes.func.isRequired,
    hasMore: PropTypes.func.isRequired,
    loadMore: PropTypes.func.isRequired,
    useInfiniteScroll: PropTypes.bool.isRequired,
    items: PropTypes.array,
  }).isRequired,
  pageContext: PropTypes.shape({
    initialPosts: PropTypes.array.isRequired,
    currentPage: PropTypes.number.isRequired,
  }).isRequired,
  theme: PropTypes.shape({
    hero: PropTypes.shape({
      hide: PropTypes.bool.isRequired,
    }).isRequired,
    color: PropTypes.shape({
      brand: PropTypes.shape({
        primaryLight: PropTypes.string.isRequired,
      }).isRequired,
    }).isRequired,
  }).isRequired,
};

export default View;
