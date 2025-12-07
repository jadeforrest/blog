import React, { useState } from "react";
import PropTypes from "prop-types";
import { Link } from "gatsby";
import { useFlexSearch } from "react-use-flexsearch";

const Search = (props) => {
  const { index, store, theme } = props;
  const [query, setQuery] = useState("");

  const results = useFlexSearch(query, index, store);

  const handleSearch = (event) => {
    setQuery(event.target.value);
  };

  return (
    <React.Fragment>
      <div className="search-container">
        <input
          type="search"
          placeholder="Search posts and wiki..."
          value={query}
          onChange={handleSearch}
          className="search-input"
          aria-label="Search"
        />

        {query && (
          <div className="search-results">
            {results.length > 0 ? (
              <ul>
                {results.map((result) => (
                  <li key={result.slug}>
                    <Link to={result.slug}>
                      <div className="result-title">{result.title}</div>
                      {result.tags && result.tags.length > 0 && (
                        <div className="result-tags">
                          {result.tags.join(", ")}
                        </div>
                      )}
                      {result.date && (
                        <div className="result-date">{result.date}</div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="no-results">No results found for "{query}"</div>
            )}
          </div>
        )}
      </div>

      {/* --- STYLES --- */}
      <style jsx>{`
        .search-container {
          margin: ${theme.space.stack.l};
        }

        .search-input {
          width: 100%;
          padding: ${theme.space.s} ${theme.space.m};
          font-size: ${theme.font.size.m};
          border: 1px solid ${theme.color.neutral.gray.c};
          border-radius: 4px;
          outline: none;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          border-color: ${theme.color.brand.primary};
        }

        .search-results {
          margin-top: ${theme.space.m};
          border: 1px solid ${theme.color.neutral.gray.c};
          border-radius: 4px;
          background: ${theme.color.neutral.white};
          max-height: 500px;
          overflow-y: auto;
        }

        ul {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        li {
          border-bottom: 1px solid ${theme.color.neutral.gray.b};
        }

        li:last-child {
          border-bottom: none;
        }

        li a {
          display: block;
          padding: ${theme.space.m};
          text-decoration: none;
          color: ${theme.color.neutral.gray.j};
          transition: background-color 0.2s;
        }

        li a:hover {
          background-color: ${theme.color.neutral.gray.a};
        }

        .result-title {
          font-size: ${theme.font.size.m};
          font-weight: ${theme.font.weight.bold};
          margin-bottom: ${theme.space.xs};
        }

        .result-tags {
          font-size: ${theme.font.size.xs};
          color: ${theme.color.neutral.gray.g};
          margin-bottom: ${theme.space.xs};
        }

        .result-date {
          font-size: ${theme.font.size.xs};
          color: ${theme.color.neutral.gray.g};
        }

        .no-results {
          padding: ${theme.space.m};
          text-align: center;
          color: ${theme.color.neutral.gray.g};
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
