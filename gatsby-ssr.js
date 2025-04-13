/**
 * Implement Gatsby's SSR (Server Side Rendering) APIs in this file.
 *
 * See: https://www.gatsbyjs.org/docs/ssr-apis/
 */

import React from "react"
import { HelmetProvider } from "react-helmet-async"
import { GlobalState } from "./src/components/GlobalState/GlobalState.js"

export const wrapRootElement = ({ element }) => {
    return (
        <HelmetProvider>
            <GlobalState>
                {element}
            </GlobalState>
        </HelmetProvider>
    )
}