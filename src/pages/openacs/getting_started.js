import React, { useEffect } from "react";
import { navigate } from "gatsby";

const OpenACSGettingStartedRedirect = () => {
  useEffect(() => {
    // Redirect to posts page
    navigate("/posts/");
  }, []);

  return (
    <div>
      <p>Redirecting to posts page...</p>
    </div>
  );
};

export default OpenACSGettingStartedRedirect;