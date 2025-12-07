import { analyzeLayering } from '../analyzers/layering.js';
import { analyzeEncapsulation } from '../analyzers/encapsulation.js';
import { analyzeAbstraction } from '../analyzers/abstraction.js';
import { formatLayeringReport } from '../formatters/layering-formatter.js';
import { formatEncapsulationReport } from '../formatters/encapsulation-formatter.js';
import { formatAbstractionReport } from '../formatters/abstraction-formatter.js';
import { formatCombinedReport } from '../formatters/combined-formatter.js';
import { generateHeatmap } from '../visualizations/heatmap-generator.js';
import { validateProjectPath } from '../utils/validation.js';
import { logToolCall, logError } from '../utils/logging.js';
import { createSuccessResponse, createJsonErrorResponse } from '../utils/response.js';

/**
 * Handle layering analysis tool
 * Mit mode-Parameter (compact/detailed)
 */
export function handleLayeringAnalysis(args) {
  logToolCall('analyze_layering', args);
  
  const { projectPath, mode = 'compact' } = args;  
  const validation = validateProjectPath(projectPath);
  
  if (!validation.valid) {
    return createJsonErrorResponse(validation.error, 'Please check if the path is correct.');
  }
  
  try {
    const result = analyzeLayering(projectPath);
    const report = formatLayeringReport(result, mode);  
    return createSuccessResponse(report);
  } catch (error) {
    logError(error, 'analyze_layering');
    return createJsonErrorResponse(error.message, 'Check the log file for details.');
  }
}

/**
 * Handle encapsulation analysis tool
 */
export function handleEncapsulationAnalysis(args) {
  logToolCall('analyze_encapsulation', args);
  
  const { projectPath, mode = 'compact' } = args;  
  const validation = validateProjectPath(projectPath);
  
  if (!validation.valid) {
    return createJsonErrorResponse(validation.error, 'Please check if the path is correct.');
  }
  
  try {
    const result = analyzeEncapsulation(projectPath);
    const report = formatEncapsulationReport(result, mode);  
    return createSuccessResponse(report);
  } catch (error) {
    logError(error, 'analyze_encapsulation');
    return createJsonErrorResponse(error.message, 'Check the log file for details.');
  }
}

/**
 * Handle abstraction analysis tool
 */
export function handleAbstractionAnalysis(args) {
  logToolCall('analyze_abstraction', args);
  
  const { projectPath, mode = 'compact' } = args;  
  const validation = validateProjectPath(projectPath);
  
  if (!validation.valid) {
    return createJsonErrorResponse(validation.error, 'Please check if the path is correct.');
  }
  
  try {
    const result = analyzeAbstraction(projectPath);
    const report = formatAbstractionReport(result, mode);  
    return createSuccessResponse(report);
  } catch (error) {
    logError(error, 'analyze_abstraction');
    return createJsonErrorResponse(error.message, 'Check the log file for details.');
  }
}

/**
 * Handle complete MMI analysis tool
 */
/**
 * Handle MMI analysis
 * @param {Object} args - { projectPath, mode, useCache }
 */
export function handleMMIAnalysis(args) {
  logToolCall('analyze_mmi', args);
  
  const { projectPath, mode = 'compact', useCache = false } = args;  // ⬅️ NEU: useCache
  const validation = validateProjectPath(projectPath);
  
  if (!validation.valid) {
    return createJsonErrorResponse(validation.error);
  }
  
  try {
    console.error('[MMI] Running MMI analysis...');
    
    // useCache übergeben
    const layering = analyzeLayering(projectPath, useCache);
    const encapsulation = analyzeEncapsulation(projectPath, useCache);
    const abstraction = analyzeAbstraction(projectPath, useCache);
    
    const report = formatCombinedReport(layering, encapsulation, abstraction, mode);
    return createSuccessResponse(report);
  } catch (error) {
    logError(error, 'analyze_mmi');
    return createJsonErrorResponse(error.message);
  }
}

/**
 * Handle architecture heatmap visualization tool
 */
export function handleArchitectureHeatmap(args) {
  logToolCall('visualize_architecture', args);
  
  const { projectPath } = args;
  const validation = validateProjectPath(projectPath);
  
  if (!validation.valid) {
    return createJsonErrorResponse(validation.error, 'Please check if the path is correct.');
  }
  
  try {
    console.error('[MMI] Generating architecture heatmap...');
    
    const layering = analyzeLayering(projectPath);
    const encapsulation = analyzeEncapsulation(projectPath);
    const abstraction = analyzeAbstraction(projectPath);
    
    const html = generateHeatmap(layering, encapsulation, abstraction);
    
    return {
      content: [
        {
          type: "text",
          text: html,
          mimeType: "text/html"
        }
      ]
    };
  } catch (error) {
    logError(error, 'visualize_architecture');
    return createJsonErrorResponse(error.message, 'Check the log file for details.');
  }
}