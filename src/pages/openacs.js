import React, { useEffect } from "react";
import { navigate } from "gatsby";

const OpenACSRedirect = () => {
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

export default OpenACSRedirect;