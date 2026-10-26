export function downloadCsv(content, filename) {
  const url = URL.createObjectURL(
    new Blob([content], { type: 'text/csv;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser time to start the download before releasing its bytes.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
