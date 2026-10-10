/** Gives the person a text file (such as a CSV) to save, named as given */
export const saveTextFile = (text, filename, type = 'text/csv;charset=utf-8') => {
  const blob = new Blob([text], { type });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};
