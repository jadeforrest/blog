import React from "react";
import theme from "../theme/theme.yaml";
import Article from "../components/Article";
import Headline from "../components/Article/Headline";

const NotFoundPage = (props) => {
  return (
    <Article theme={theme}>
      <header>
        <Headline title="404" theme={theme} />
      </header>
      <p>Unfortunately you came to a page does&#39;t exist.</p>
    </Article>
  );
};

export default NotFoundPage;
