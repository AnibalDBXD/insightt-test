import Document, { Html, Head, Main, NextScript } from "next/document";
import type { DocumentContext } from "next/document";
import * as React from "react";
import {
  DocumentHeadTags,
  documentGetInitialProps,
} from "@mui/material-nextjs/v16-pagesRouter";
import theme from "@/styles/theme";

export default class MyDocument extends Document<{
  emotionStyleTags: React.ReactElement[];
}> {
  static async getInitialProps(ctx: DocumentContext) {
    return documentGetInitialProps(ctx);
  }

  render() {
    return (
      <Html lang="en">
        <Head>
          <meta name="theme-color" content={theme.palette.primary.main} />
          <DocumentHeadTags emotionStyleTags={this.props.emotionStyleTags} />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
