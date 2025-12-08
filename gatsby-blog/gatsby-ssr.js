/**
 * Implement Gatsby's SSR (Server Side Rendering) APIs in this file.
 *
 * See: https://www.gatsbyjs.org/docs/ssr-apis/
 */

import React from "react"
import { HelmetProvider } from "react-helmet-async"
import { GlobalState } from "./src/components/GlobalState/GlobalState.js"

const helmetContext = {}

export const wrapRootElement = ({ element }) => {
    return (
        <HelmetProvider context={helmetContext}>
            <GlobalState>
                {element}
            </GlobalState>
        </HelmetProvider>
    )
}

export const onRenderBody = ({ setHeadComponents, setHtmlAttributes, setBodyAttributes }) => {
    const { helmet } = helmetContext
    if (helmet) {
        setHtmlAttributes(helmet.htmlAttributes.toComponent())
        setBodyAttributes(helmet.bodyAttributes.toComponent())
        setHeadComponents([
            helmet.title.toComponent(),
            helmet.meta.toComponent(),
            helmet.link.toComponent(),
            helmet.script.toComponent(),
            helmet.style.toComponent(),
        ])
    }
}