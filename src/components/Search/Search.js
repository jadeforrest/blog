import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { navigate } from "gatsby";
import { useFlexSearch } from "react-use-flexsearch";

const Search = (props) => {
  const { index, store, theme } = props;
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const resultsRef = useRef([]);

  const results = useFlexSearch(query, index, store);

  const handleSearch = (event) => {
    setQuery(event.target.value);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (!query || results.length === 0) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        event.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          navigate(results[selectedIndex].slug);
        }
        break;
      case "Escape":
        event.preventDefault();
        if (selectedIndex >= 0) {
          setSelectedIndex(-1);
        } else {
          setQuery("");
        }
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current[selectedIndex]) {
      resultsRef.current[selectedIndex].scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    }
  }, [selectedIndex]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <React.Fragment>
      <div className="search-container">
        <div className="search-input-wrapper">
          <input
            ref={inputRef}
            type="search"
            placeholder="Search posts and wiki..."
            value={query}
            onChange={handleSearch}
            onKeyDown={handleKeyDown}
            className="search-input"
            aria-label="Search"
            autoComplete="off"
          />
          <div className="keyboard-hint">
            Press <kbd>↑</kbd> <kbd>↓</kbd> to navigate, <kbd>Enter</kbd> to select, <kbd>Esc</kbd> to clear
          </div>
        </div>

        {query && (
          <div className="search-results">
            {results.length > 0 ? (
              <React.Fragment>
                <div className="results-count">
                  {results.length} {results.length === 1 ? "result" : "results"} found
                </div>
                <ul>
                  {results.map((result, index) => (
                    <li
                      key={result.slug}
                      className={selectedIndex === index ? "selected" : ""}
                      ref={(el) => (resultsRef.current[index] = el)}
                    >
                      <a
                        href={result.slug}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(result.slug);
                        }}
                      >
                        <div className="result-title">{result.title}</div>
                        {result.tags && result.tags.length > 0 && (
                          <div className="result-tags">
                            {result.tags.slice(0, 5).map((tag, idx) => (
                              <span key={idx} className="tag">{tag}</span>
                            ))}
                            {result.tags.length > 5 && (
                              <span className="tag-more">+{result.tags.length - 5} more</span>
                            )}
                          </div>
                        )}
                        {result.date && (
                          <div className="result-date">{result.date}</div>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </React.Fragment>
            ) : (
              <div className="no-results">
                <div className="no-results-icon">🔍</div>
                <div className="no-results-text">No results found for "{query}"</div>
                <div className="no-results-hint">Try different keywords or check your spelling</div>
              </div>
            )}
          </div>
        )}

        {!query && (
          <div className="search-info">
            <h3>Quick tips</h3>
            <ul>
              <li>Search by title, tags, or keywords</li>
              <li>Use keyboard shortcuts for faster navigation</li>
              <li>Results include both blog posts and wiki articles</li>
            </ul>
          </div>
        )}
      </div>

      {/* --- STYLES --- */}
      <style jsx>{`
        .search-container {
          margin: ${theme.space.stack.l};
          max-width: 900px;
          margin-left: auto;
          margin-right: auto;
        }

        .search-input-wrapper {
          position: relative;
          margin-bottom: ${theme.space.l};
        }

        .search-input {
          width: 100%;
          padding: ${theme.space.m} ${theme.space.l};
          font-size: ${theme.font.size.l};
          border: 2px solid ${theme.color.neutral.gray.c};
          border-radius: 8px;
          outline: none;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .search-input:focus {
          border-color: ${theme.color.brand.primary};
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        }

        .keyboard-hint {
          margin-top: ${theme.space.s};
          font-size: ${theme.font.size.xs};
          color: ${theme.color.neutral.gray.g};
          text-align: center;
        }

        .keyboard-hint kbd {
          display: inline-block;
          padding: 2px 6px;
          font-family: monospace;
          font-size: ${theme.font.size.xs};
          background: ${theme.color.neutral.gray.b};
          border: 1px solid ${theme.color.neutral.gray.c};
          border-radius: 3px;
          margin: 0 2px;
        }

        .search-results {
          margin-top: ${theme.space.m};
          border-radius: 8px;
          background: ${theme.color.neutral.white};
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .results-count {
          padding: ${theme.space.m};
          background: ${theme.color.neutral.gray.a};
          border-bottom: 1px solid ${theme.color.neutral.gray.b};
          font-size: ${theme.font.size.s};
          font-weight: ${theme.font.weight.bold};
          color: ${theme.color.neutral.gray.h};
        }

        ul {
          list-style: none;
          margin: 0;
          padding: 0;
          max-height: 600px;
          overflow-y: auto;
        }

        li {
          border-bottom: 1px solid ${theme.color.neutral.gray.b};
        }

        li:last-child {
          border-bottom: none;
        }

        li a {
          display: block;
          padding: ${theme.space.m} ${theme.space.l};
          text-decoration: none;
          color: ${theme.color.neutral.gray.j};
          transition: all 0.2s ease;
          cursor: pointer;
        }

        li a:hover,
        li.selected a {
          background: linear-gradient(
            90deg,
            ${theme.color.neutral.gray.a} 0%,
            ${theme.color.neutral.white} 100%
          );
        }

        li.selected a {
          background: linear-gradient(
            90deg,
            ${theme.color.brand.primary}15 0%,
            ${theme.color.neutral.white} 100%
          );
          border-left: 3px solid ${theme.color.brand.primary};
          padding-left: calc(${theme.space.l} - 3px);
        }

        .result-title {
          font-size: ${theme.font.size.m};
          font-weight: ${theme.font.weight.bold};
          margin-bottom: ${theme.space.xs};
          color: ${theme.color.neutral.gray.j};
        }

        li.selected .result-title {
          color: ${theme.color.brand.primary};
        }

        .result-tags {
          display: flex;
          flex-wrap: wrap;
          gap: ${theme.space.xs};
          margin-bottom: ${theme.space.xs};
        }

        .tag {
          display: inline-block;
          padding: 2px 8px;
          font-size: ${theme.font.size.xs};
          background: ${theme.color.neutral.gray.b};
          color: ${theme.color.neutral.gray.h};
          border-radius: 12px;
          border: 1px solid ${theme.color.neutral.gray.c};
        }

        .tag-more {
          display: inline-block;
          padding: 2px 8px;
          font-size: ${theme.font.size.xs};
          color: ${theme.color.neutral.gray.g};
          font-style: italic;
        }

        .result-date {
          font-size: ${theme.font.size.xs};
          color: ${theme.color.neutral.gray.g};
          margin-top: ${theme.space.xs};
        }

        .no-results {
          padding: ${theme.space.xl} ${theme.space.m};
          text-align: center;
        }

        .no-results-icon {
          font-size: 48px;
          margin-bottom: ${theme.space.m};
          opacity: 0.5;
        }

        .no-results-text {
          font-size: ${theme.font.size.l};
          font-weight: ${theme.font.weight.bold};
          color: ${theme.color.neutral.gray.h};
          margin-bottom: ${theme.space.s};
        }

        .no-results-hint {
          font-size: ${theme.font.size.s};
          color: ${theme.color.neutral.gray.g};
        }

        .search-info {
          margin-top: ${theme.space.xl};
          padding: ${theme.space.l};
          background: ${theme.color.neutral.gray.a};
          border-radius: 8px;
          border: 1px solid ${theme.color.neutral.gray.b};
        }

        .search-info h3 {
          margin-top: 0;
          margin-bottom: ${theme.space.m};
          font-size: ${theme.font.size.m};
          color: ${theme.color.neutral.gray.j};
        }

        .search-info ul {
          list-style: disc;
          padding-left: ${theme.space.l};
          max-height: none;
        }

        .search-info li {
          padding: ${theme.space.xs} 0;
          font-size: ${theme.font.size.s};
          color: ${theme.color.neutral.gray.h};
          border-bottom: none;
        }

        @media (max-width: 768px) {
          .search-input {
            font-size: ${theme.font.size.m};
            padding: ${theme.space.s} ${theme.space.m};
          }

          .keyboard-hint {
            font-size: 10px;
          }

          li a {
            padding: ${theme.space.s} ${theme.space.m};
          }

          li.selected a {
            padding-left: calc(${theme.space.m} - 3px);
          }
        }
      `}</style>
    </React.Fragment>
  );
};

Search.propTypes = {
  index: PropTypes.object.isRequired,
  store: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired,
};

export default Search;
