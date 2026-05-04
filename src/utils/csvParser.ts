export function parseCSV(raw: string): Record<string, string>[] {
  if (!raw || !raw.trim()) return [];

  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    const nextChar = raw[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentLine += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === '\n' && !inQuotes) {
      lines.push(currentLine);
      currentLine = '';
    } else if (char === '\r' && !inQuotes) {
      // Ignore \r if followed by \n
      if (nextChar !== '\n') {
        lines.push(currentLine);
        currentLine = '';
      }
    } else {
      currentLine += char;
    }
  }
  
  // Push the final line if the string didn't end with a newline implicitly
  if (currentLine.length > 0) {
    // Edge case if last char was a quote parsing state might be messed up but this is fine
     lines.push(currentLine);
  } else if (raw.length > 0 && !raw.endsWith('\n') && !raw.endsWith('\r')) {
      lines.push('');
  }

  if (lines.length === 0) return [];

  const parseLineFields = (line: string): string[] => {
    const fields: string[] = [];
    let currentField = '';
    let inQs = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      if (char === '"') {
        if (inQs && nextChar === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else {
          inQs = !inQs;
        }
      } else if (char === ',' && !inQs) {
        fields.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField);
    return fields;
  };

  const headerLine = lines[0];
  if (!headerLine) return [];
  
  const rawHeaders = parseLineFields(headerLine);
  const headers = rawHeaders.map(h => h.trim());

  // Return empty array if there's only headers
  if (lines.length <= 1) return [];

  const results: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() && fieldsAreEmpty(parseLineFields(line))) continue; // skip entirely empty lines

    const fields = parseLineFields(line);
    const rowObj: Record<string, string> = {};

    headers.forEach((header, index) => {
      rowObj[header] = fields[index] !== undefined ? fields[index].trim() : '';
    });

    // Check if the row is entirely empty (all values are empty)
    const hasValues = Object.values(rowObj).some(val => val !== '');
    if (hasValues) {
        results.push(rowObj);
    }
  }

  return results;
}

function fieldsAreEmpty(fields: string[]): boolean {
    return fields.every(f => f.trim() === '');
}
