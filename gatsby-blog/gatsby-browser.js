/**
 * Implement Gatsby's Browser APIs in this file.
 *
 * See: https://www.gatsbyjs.org/docs/browser-apis/
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