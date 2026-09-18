import { Document, Page, StyleSheet, Text, renderToBuffer } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 56,
    fontSize: 11,
    fontFamily: "Times-Roman",
    lineHeight: 1.4,
  },
  line: {
    marginBottom: 2,
  },
  blankLine: {
    marginBottom: 2,
    height: 11,
  },
});

/** Renders plain-text letter content to a PDF buffer, one line per `<Text>` so blank
 * lines (paragraph breaks) are preserved -- react-pdf's `Text` otherwise collapses `\n`. */
export async function renderApplicationLetterPdf(content: string): Promise<Buffer> {
  const lines = content.split("\n");

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        {lines.map((line, i) => (
          <Text key={i} style={line.trim() ? styles.line : styles.blankLine}>
            {line || " "}
          </Text>
        ))}
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
