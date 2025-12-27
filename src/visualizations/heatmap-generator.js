import path from 'path';
import fs from 'fs';
import graphlib from 'graphlib';

/**
 * Generate interactive architecture heatmap HTML
 */
export function generateHeatmap(layering, encapsulation, abstraction, cycles) {
  const projectName = path.basename(layering.projectPath);
  
  // Prepare data for visualization
  const graphData = prepareGraphData(layering, encapsulation, abstraction, cycles);
  
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>MMI Architecture Heatmap - ${projectName}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0a0a;
      color: #fff;
      overflow: hidden;
    }
    
    #container {
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    #header {
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    }
    
    h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    #stats {
      display: flex;
      gap: 30px;
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 12px;
    }
    
    .stat {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .score-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
    }
    
    .score-excellent { background: #10b981; }
    .score-good { background: #3b82f6; }
    .score-acceptable { background: #f59e0b; }
    .score-poor { background: #ef4444; }
    
    #filters {
      display: flex;
      gap: 12px;
    }
    
    .filter-btn {
      padding: 8px 16px;
      border: 2px solid rgba(255,255,255,0.3);
      background: rgba(255,255,255,0.1);
      color: #fff;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    }
    
    .filter-btn:hover {
      background: rgba(255,255,255,0.2);
    }
    
    .filter-btn.active {
      background: #fff;
      color: #667eea;
      border-color: #fff;
    }
    
    #main {
      flex: 1;
      display: flex;
      position: relative;
    }
    
    #graph {
      flex: 1;
      position: relative;
    }
    
    #sidebar {
      width: 350px;
      background: #1a1a1a;
      border-left: 1px solid #333;
      padding: 20px;
      overflow-y: auto;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    }
    
    #sidebar.active {
      transform: translateX(0);
    }
    
    .sidebar-header {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid #333;
    }
    
    .violation-item {
      padding: 12px;
      margin-bottom: 12px;
      background: #252525;
      border-radius: 8px;
      border-left: 3px solid #ef4444;
    }
    
    .violation-type {
      font-weight: 600;
      color: #ef4444;
      margin-bottom: 4px;
    }
    
    .violation-desc {
      font-size: 13px;
      color: #999;
      line-height: 1.5;
    }
    
    .legend {
      position: absolute;
      bottom: 20px;
      left: 20px;
      background: rgba(26, 26, 26, 0.95);
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #333;
    }
    
    .legend-title {
      font-weight: 600;
      margin-bottom: 12px;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 13px;
    }
    
    .legend-color {
      width: 20px;
      height: 20px;
      border-radius: 50%;
    }
    
    .node {
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .node:hover {
      stroke: #fff;
      stroke-width: 3px;
    }
    
    .node.filtered {
      opacity: 0.15;
    }
    
    .node-label {
      fill: #fff;
      font-size: 11px;
      pointer-events: none;
      text-anchor: middle;
      font-weight: 500;
    }
    
    .node-label.filtered {
      opacity: 0.15;
    }
    
    .link {
      stroke-opacity: 0.6;
    }
    
    .link.filtered {
      opacity: 0.1;
    }
    
    .link-violation {
      stroke: #ef4444;
      stroke-width: 2px;
      stroke-dasharray: 5,5;
      animation: dash 20s linear infinite;
    }
    
    @keyframes dash {
      to {
        stroke-dashoffset: -1000;
      }
    }
    
    .tooltip {
      position: absolute;
      padding: 12px;
      background: rgba(0, 0, 0, 0.9);
      border: 1px solid #333;
      border-radius: 8px;
      pointer-events: none;
      font-size: 13px;
      z-index: 1000;
      max-width: 250px;
    }
    
    .close-sidebar {
      position: absolute;
      top: 20px;
      right: 20px;
      background: #333;
      border: none;
      color: #fff;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 18px;
    }
    
    .close-sidebar:hover {
      background: #444;
    }

    .link-cycle {
      stroke: #ff0080 !important;
      stroke-width: 3px !important;
      stroke-dasharray: 8,4;
      animation: cycle-pulse 2s ease-in-out infinite;
    }
    
    @keyframes cycle-pulse {
      0%, 100% { 
        opacity: 0.7;
        stroke-width: 3px;
      }
      50% { 
        opacity: 1.0;
        stroke-width: 4px;
      }
    }
    
    .node.in-cycle {
      stroke: #ff0080;
      stroke-width: 3px;
    }
    
    .cycle-badge {
      display: inline-block;
      background: #ff0080;
      color: #fff;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 8px;
    }
  </style>
</head>
<body>
  <div id="container">
    <div id="header">
      <h1>🗺️ MMI Architecture Heatmap - ${projectName}</h1>
      
      <div id="stats">
        <div class="stat">
          <span>Overall Score:</span>
          <span class="score-badge ${getScoreClass(graphData.overallScore)}">${graphData.overallScore.toFixed(1)}/5</span>
        </div>
        <div class="stat">
          <span>Total Files:</span>
          <span>${graphData.totalFiles}</span>
        </div>
        <div class="stat">
          <span>Files with Issues:</span>
          <span>${graphData.filesWithIssues}</span>
        </div>
        <div class="stat">
          <span>Violations:</span>
          <span>${graphData.totalViolations}</span>
        </div>
        <div class="stat">
          <span>Layers:</span>
          <span>${graphData.layers.length}</span>
        </div>
        <div class="stat">
          <span>Cycles:</span>
          <span class="cycle-badge">${graphData.cycleCount}</span>
        </div>
      </div>
      <div id="filters">
        <button class="filter-btn active" onclick="filterGraph('all')">All Files</button>
        <button class="filter-btn" onclick="filterGraph('issues')">Only Issues</button>
        <button class="filter-btn" onclick="filterGraph('domain')">Domain</button>
        <button class="filter-btn" onclick="filterGraph('application')">Application</button>
        <button class="filter-btn" onclick="filterGraph('infrastructure')">Infrastructure</button>
        <button class="filter-btn" onclick="filterGraph('cycles')">Cycles</button>
      </div>
    </div>
    
    <div id="main">
      <div id="graph"></div>
      
      <div id="sidebar">
        <button class="close-sidebar" onclick="closeSidebar()">×</button>
        <div class="sidebar-header" id="sidebar-title">Select a file</div>
        <div id="sidebar-content"></div>
      </div>
      
      <div class="legend">
        <div class="legend-title">Score Legend</div>
        <div class="legend-item">
          <div class="legend-color" style="background: #10b981;"></div>
          <span>Excellent (4.5-5.0)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #3b82f6;"></div>
          <span>Good (3.5-4.5)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #f59e0b;"></div>
          <span>Acceptable (2.5-3.5)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #ef4444;"></div>
          <span>Critical (<2.5)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #ff0080;"></div>
        <span>Cycle</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #666;"></div>
          <span>Dependency</span>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    const data = ${JSON.stringify(graphData)};
    let currentFilter = 'all';
    
    const width = window.innerWidth;
    const height = window.innerHeight - 150;
    
    const svg = d3.select("#graph")
      .append("svg")
      .attr("width", width)
      .attr("height", height);
    
    // Add zoom behavior
    const g = svg.append("g");
    
    svg.call(d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      }));
    
    g.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "-0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .append("svg:path")
      .attr("d", "M 0,-5 L 10 ,0 L 0,5")
      .attr("fill", "#666");
    
    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.links).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(40))
      .force("x", d3.forceX(d => {
        if (d.layer === 'Domain') return width * 0.25;
        if (d.layer === 'Application') return width * 0.5;
        if (d.layer === 'Infrastructure') return width * 0.75;
        return width * 0.5;
      }).strength(0.1))
      .force("y", d3.forceY(height / 2).strength(0.05));
    
    const link = g.append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("class", d => {
        let classes = "link";
        if (d.cycleId) classes += " link-cycle"; 
        if (d.violation) classes += " link-violation";
        return classes;
      })
      .attr("stroke", d => d.cycleId ? "#ff0080" : (d.violation ? "#ef4444" : "#666"))
      .attr("stroke-width", d => d.cycleId ? 3 : 1.5)
      .attr("marker-end", "url(#arrowhead)");
    
    const node = g.append("g")
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      .attr("class", d => {
        let classes = "node";
        if (d.inCycle) classes += " in-cycle"; 
        return classes;
      })
      .attr("r", d => d.issueCount > 0 ? 15 + d.issueCount * 2 : 12)
      .attr("fill", d => getNodeColor(d.score))
      .attr("stroke", d => d.inCycle ? "#ff0080" : "#fff") 
      .attr("stroke-width", d => d.inCycle ? 3 : 2) 
      .call(drag(simulation))
      .on("click", showDetails);
    
    const label = g.append("g")
      .selectAll("text")
      .data(data.nodes)
      .join("text")
      .attr("class", "node-label")
      .text(d => d.name)
      .attr("dy", d => d.issueCount > 0 ? 35 + d.issueCount * 2 : 30);
    
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);
    
    node.on("mouseover", function(event, d) {
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip.html(
        '<strong>' + d.name + '</strong><br/>' +
        'Layer: ' + d.layer + '<br/>' +
        'Score: ' + d.score.toFixed(1) + '/5<br/>' +
        'Issues: ' + d.issueCount +
        (d.inCycle ? '<br/><span style="color:#ff0080">In Cycle!</span>' : '')
      )
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      tooltip.transition().duration(200).style("opacity", 0);
    });
    
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      
      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
      
      label
        .attr("x", d => d.x)
        .attr("y", d => d.y);
    });
    
    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }
    
    function filterGraph(filter) {
      currentFilter = filter;
      
      // Update button states
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      event.target.classList.add('active');
      
      // Apply filter
      node.classed('filtered', d => {
        if (filter === 'all') return false;
        if (filter === 'issues') return d.issueCount === 0;
        if (filter === 'cycles') return !d.inCycle;
        if (filter === 'domain') return d.layer !== 'Domain';
        if (filter === 'application') return d.layer !== 'Application';
        if (filter === 'infrastructure') return d.layer !== 'Infrastructure';
        return false;
      });
      
      label.classed('filtered', d => {
        if (filter === 'all') return false;
        if (filter === 'issues') return d.issueCount === 0;
        if (filter === 'cycles') return !d.inCycle;
        if (filter === 'domain') return d.layer !== 'Domain';
        if (filter === 'application') return d.layer !== 'Application';
        if (filter === 'infrastructure') return d.layer !== 'Infrastructure';
        return false;
      });
      
      link.classed('filtered', d => {
        if (filter === 'all') return false;
        if (filter === 'cycles') return !d.cycleId;
        if (filter === 'issues') {
          const sourceNode = data.nodes.find(n => n.id === d.source.id);
          const targetNode = data.nodes.find(n => n.id === d.target.id);
          return sourceNode.issueCount === 0 && targetNode.issueCount === 0;
        }
        return false;
      });
    }
    
    function showDetails(event, d) {
      const sidebar = document.getElementById("sidebar");
      sidebar.classList.add("active");
      
      document.getElementById("sidebar-title").textContent = d.name;
      
      const content = document.getElementById("sidebar-content");
      if (d.issues && d.issues.length > 0) {
        content.innerHTML = d.issues.map(issue => 
          '<div class="violation-item">' +
            '<div class="violation-type">' + issue.type + '</div>' +
            '<div class="violation-desc">' + issue.description + '</div>' +
          '</div>'
        ).join('');
      } else {
        content.innerHTML = 
          '<div style="padding: 20px; text-align: center; color: #10b981;">' +
            '✅ No issues found!<br/>' +
            'This file has excellent architecture quality.' +
          '</div>';
      }
    }
    
    function closeSidebar() {
      document.getElementById("sidebar").classList.remove("active");
    }
    
    function getNodeColor(score) {
      if (score >= 4.5) return "#10b981";
      if (score >= 3.5) return "#3b82f6";
      if (score >= 2.5) return "#f59e0b";
      return "#ef4444";
    }
  </script>
</body>
</html>`;

  return htmlContent;
}

/**
 * Prepare graph data 
 */
function prepareGraphData(layering, encapsulation, abstraction, cycles) { 
  console.error('[MMI] 🔍 Starting prepareGraphData...');
  
  const nodes = [];
  const links = [];
  const nodeMap = new Map();
  
  // Collect ALL C# files from the project
  const allFiles = findAllCSharpFiles(layering.projectPath);
  console.error(`[MMI] 📁 Found ${allFiles.length} files`);
  
  // USE cycles from parameter instead of detecting again!
  console.error(`[MMI] 🔄 Using cycle data: ${cycles.cycleCount} cycles`);
  
  const cycleData = {
    cycles: cycles.cycles,
    cycleCount: cycles.cycleCount,
    filesInCycles: cycles.filesInCycles
  };
  
  console.error(`[MMI] 🔄 Cycles:`, JSON.stringify(cycleData.cycles, null, 2));
  
  // Create issue maps for quick lookup
  const layerViolationMap = new Map();
  layering.violations.forEach(v => {
    if (!layerViolationMap.has(v.file)) layerViolationMap.set(v.file, []);
    layerViolationMap.get(v.file).push(v);
  });
  
  const encapIssueMap = new Map();
  encapsulation.overExposed.forEach(e => {
    if (!encapIssueMap.has(e.file)) encapIssueMap.set(e.file, []);
    encapIssueMap.get(e.file).push(e);
  });
  
  const abstIssueMap = new Map();
  abstraction.mixedAbstractions.forEach(m => {
    if (!abstIssueMap.has(m.file)) abstIssueMap.set(m.file, []);
    abstIssueMap.get(m.file).push(m);
  });
  
  // Cycle file map
  const filesInCycles = new Set(cycleData.filesInCycles);
  console.error(`[MMI] 🔄 Files in cycles:`, Array.from(filesInCycles));
  
  // Create nodes for ALL files
  allFiles.forEach((filePath, index) => {
    const fileName = path.basename(filePath);
    const issues = [];
    
    const layerViolations = layerViolationMap.get(fileName) || [];
    const encapIssues = encapIssueMap.get(fileName) || [];
    const abstIssues = abstIssueMap.get(fileName) || [];
    
    layerViolations.forEach(v => {
      issues.push({
        type: 'Layering Violation',
        description: `Depends on ${v.dependsOn}: ${v.using}`
      });
    });
    
    encapIssues.forEach(e => {
      issues.push({
        type: 'Over-Exposed Type',
        description: e.suggestion
      });
    });
    
    abstIssues.forEach(a => {
      issues.push({
        type: a.issue.replace(/_/g, ' '),
        description: a.description
      });
    });
    
    // Add cycle info
    const cyclesForFile = cycleData.cycles.filter(c => 
      c.path.includes(fileName)
    );
    
    cyclesForFile.forEach(cycle => {
      issues.push({
        type: '🔄 Circular Dependency',
        description: `Part of cycle: ${cycle.path.join(' → ')} → ${cycle.path[0]}`
      });
    });
    
    const issueCount = issues.length;
    const score = Math.max(0, 5 - (issueCount * 0.5));
    
    // Detect layer from path
    let layer = 'Unknown';
    const normalizedPath = filePath.replace(/\\/g, '/');
    if (normalizedPath.includes('/Domain/')) layer = 'Domain';
    else if (normalizedPath.includes('/Application/')) layer = 'Application';
    else if (normalizedPath.includes('/Infrastructure/')) layer = 'Infrastructure';
    else if (normalizedPath.includes('/Presentation/')) layer = 'Presentation';
    else if (normalizedPath.includes('/API/')) layer = 'API';
    else if (normalizedPath.includes('/Web/')) layer = 'Web';
    
    const inCycle = filesInCycles.has(fileName);
    const cycleIds = cyclesForFile.map(c => c.id);
    
    // 🔍 DEBUG LOG
    if (inCycle) {
      console.error(`[MMI] 🔄 Node ${fileName} IS IN CYCLE! IDs: ${cycleIds.join(', ')}`);
    }
    
    nodes.push({
      id: fileName,
      name: fileName.replace('.cs', ''),
      layer: layer,
      score: score,
      issueCount: issueCount,
      issues: issues,
      inCycle: inCycle,
      cycleIds: cycleIds
    });
    
    nodeMap.set(fileName, index);
  });
  
  // Create links from violations AND from cycles!
  layering.violations.forEach(v => {
    if (!nodeMap.has(v.dependsOn)) {
      const targetIndex = nodes.length;
      nodes.push({
        id: v.dependsOn,
        name: v.dependsOn,
        layer: v.dependsOn,
        score: 5,
        issueCount: 0,
        issues: [],
        inCycle: false,
        cycleIds: []
      });
      nodeMap.set(v.dependsOn, targetIndex);
    }
    
    // Check if this link is part of a cycle
    const cycleId = findCycleForLink(v.file, v.dependsOn, cycleData.cycles);
    
    if (cycleId) {
      console.error(`[MMI] 🔄 Link ${v.file} → ${v.dependsOn} IS IN CYCLE ${cycleId}!`);
    }
    
    links.push({
      source: v.file,
      target: v.dependsOn,
      violation: true,
      cycleId: cycleId
    });
  });
  
  // Create links for cycles that aren't violations!
  cycleData.cycles.forEach(cycle => {
    for (let i = 0; i < cycle.path.length; i++) {
      const source = cycle.path[i];
      const target = cycle.path[(i + 1) % cycle.path.length]; // Wrap around
      
      // Check if this link already exists
      const existingLink = links.find(l => 
        (l.source === source || l.source.id === source) && 
        (l.target === target || l.target.id === target)
      );
      
      if (!existingLink) {
        console.error(`[MMI] 🔄 Adding cycle link: ${source} → ${target} (Cycle #${cycle.id})`);
        
        // Make sure both nodes exist
        if (!nodeMap.has(source)) {
          nodes.push({
            id: source,
            name: source.replace('.cs', ''),
            layer: 'Unknown',
            score: 5,
            issueCount: 0,
            issues: [],
            inCycle: true,
            cycleIds: [cycle.id]
          });
          nodeMap.set(source, nodes.length - 1);
        }
        
        if (!nodeMap.has(target)) {
          nodes.push({
            id: target,
            name: target.replace('.cs', ''),
            layer: 'Unknown',
            score: 5,
            issueCount: 0,
            issues: [],
            inCycle: true,
            cycleIds: [cycle.id]
          });
          nodeMap.set(target, nodes.length - 1);
        }
        
        links.push({
          source: source,
          target: target,
          violation: false, // Not a layering violation, but a cycle!
          cycleId: cycle.id
        });
      } else if (!existingLink.cycleId) {
        // Link exists but wasn't marked as cycle
        existingLink.cycleId = cycle.id;
        console.error(`[MMI] 🔄 Marked existing link as cycle: ${source} → ${target}`);
      }
    }
  });
  
  console.error(`[MMI] ✅ PrepareGraphData complete: ${nodes.length} nodes, ${links.length} links`);
  console.error(`[MMI] 🔄 Nodes in cycles: ${nodes.filter(n => n.inCycle).length}`);
  console.error(`[MMI] 🔄 Links in cycles: ${links.filter(l => l.cycleId).length}`);
  
  const overallScore = (layering.score + encapsulation.score + abstraction.score) / 3;
  const layers = [...new Set(nodes.map(n => n.layer))];
  const filesWithIssues = nodes.filter(n => n.issueCount > 0).length;
  
  return {
    nodes,
    links,
    overallScore,
    totalFiles: allFiles.length,
    filesWithIssues,
    totalViolations: layering.violationCount + abstraction.issueCount,
    layers,
    cycles: cycleData.cycles,
    cycleCount: cycleData.cycleCount
  };
}

/**
 * Find which cycle a link belongs to
 */
function findCycleForLink(source, target, cycles) {
  for (const cycle of cycles) {
    const sourceIdx = cycle.path.indexOf(source);
    if (sourceIdx === -1) continue;
    
    const nextIdx = (sourceIdx + 1) % cycle.path.length;
    if (cycle.path[nextIdx] === target) {
      return cycle.id;
    }
  }
  return null;
}

/**
 * Find all C# files in project
 */
function findAllCSharpFiles(projectPath) {
  const files = [];
  
  function scan(dir) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        if (item === 'bin' || item === 'obj' || item === 'node_modules') continue;
        
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scan(fullPath);
        } else if (item.endsWith('.cs')) {
          files.push(fullPath);
        }
      }
    } catch (err) {
      // Skip directories we can't read
    }
  }
  
  scan(projectPath);
  return files;
}

function getScoreClass(score) {
  if (score >= 4.5) return 'score-excellent';
  if (score >= 3.5) return 'score-good';
  if (score >= 2.5) return 'score-acceptable';
  return 'score-poor';
}