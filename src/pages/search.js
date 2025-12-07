import PropTypes from "prop-types";
import React from "react";
import { graphql } from "gatsby";
import theme from "../theme/theme.yaml";
import Article from "../components/Article/";
import Headline from "../components/Article/Headline";
import Search from "../components/Search";
import Seo from "../components/Seo";

const SearchPage = (props) => {
  const {
    data: {
      localSearchPages: { index, store },
    },
  } = props;

  return (
    <React.Fragment>
      <Article theme={theme}>
        <header>
          <Headline title="Search" theme={theme} />
        </header>
        <Search index={index} store={store} theme={theme} />
      </Article>

      <Seo pageTitle="Search" pathname={props.location.pathname} />
    </React.Fragment>
  );
};

SearchPage.propTypes = {
  data: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
};

export default SearchPage;

// eslint-disable-next-line no-undef
export const query = graphql`
  query SearchQuery {
    localSearchPages {
      index
      store
    }
  }
`;
