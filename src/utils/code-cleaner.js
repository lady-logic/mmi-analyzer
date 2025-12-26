/**
 * Code-Cleaner für MMI Analyzer
 * Ignoriert auskommentierte Zeilen bei der Analyse
 */

/**
 * Entfernt Zeilen die mit '//' beginnen (nach Whitespace)
 * ACHTUNG: Löscht NICHT die Zeilen, sondern filtert sie nur für die Analyse!
 * 
 * @param {string} code - C# Source Code
 * @returns {string} - Code ohne kommentierte Zeilen
 */
export function removeCommentedLines(code) {
    const lines = code.split('\n');
    
    const cleanedLines = lines.filter(line => {
      const trimmed = line.trim();
      
      // Ignoriere Zeilen die mit '//' beginnen
      if (trimmed.startsWith('//')) {
        return false;  // Diese Zeile wird ignoriert
      }
      
      return true;  // Normale Code-Zeile behalten
    });
    
    return cleanedLines.join('\n');
  }
  
  /**
   * Entfernt inline Kommentare (z.B. "var x = 5; // comment")
   * 
   * @param {string} code - C# Source Code
   * @returns {string} - Code ohne inline Kommentare
   */
  export function removeInlineComments(code) {
    const lines = code.split('\n');
    
    const cleanedLines = lines.map(line => {
      // Finde '//' aber nicht in Strings
      let inString = false;
      let stringChar = '';
      
      for (let i = 0; i < line.length - 1; i++) {
        const char = line[i];
        const next = line[i + 1];
        
        // String-Tracking (vereinfacht)
        if ((char === '"' || char === "'") && line[i - 1] !== '\\') {
          if (!inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar) {
            inString = false;
          }
        }
        
        // '//' gefunden außerhalb String
        if (!inString && char === '/' && next === '/') {
          return line.substring(0, i).trimEnd();
        }
      }
      
      return line;
    });
    
    return cleanedLines.join('\n');
  }
  
  /**
   * Standard-Funktion: Entfernt nur ganze kommentierte Zeilen
   * Für MMI Analyzer - Best Balance zwischen Einfachheit und Funktionalität
   */
  export function cleanCode(code) {
    return removeCommentedLines(code);
  }