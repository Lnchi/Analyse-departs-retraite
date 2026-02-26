d3.dsv(";", "departretraite_parcsp.csv").then((data) => {
  data.forEach((d) => {
    d.annee_num = +d.annee;
    d.age_num = +d["Âge conjoncturel de départ à la retraite"].replace(",", ".");
  });

  const years = Array.from(new Set(data.map((d) => d.annee_num))).sort();
  const categories = Array.from(
    new Set(data.map((d) => d["Catégorie socioprofessionnelle"]))
  );

  const color = d3.scaleOrdinal().domain(categories).range(d3.schemeTableau10);

  let selectedYear = years[0];
  let selectedCSP = null;

  // =============================
  // MULTI-LINE CHART
  // =============================
  const svg2 = d3
    .select("#graph-csp")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x2 = d3.scaleLinear().domain(d3.extent(years)).range([0, width]);
  const y2 = d3.scaleLinear().domain([58, 66]).range([height, 0]);

  svg2.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x2).ticks(years.length).tickFormat(d3.format("d")))
    .append("text")
    .attr("x", width / 2).attr("y", 40)
    .attr("fill", "black").text("Année");

  svg2.append("g")
    .call(d3.axisLeft(y2))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2).attr("y", -45)
    .attr("fill", "black").text("Âge");

  // Ligne verticale année sélectionnée
  const verticalLine = svg2.append("line")
    .attr("y1", 0).attr("y2", height)
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "5,4")
    .attr("opacity", 0.7);

  function updateVerticalLine() {
    verticalLine.attr("x1", x2(selectedYear)).attr("x2", x2(selectedYear));
  }

  // Données par CSP
  const dataByCSP = categories.map(cat => ({
    category: cat,
    values: years.map(y => {
      const entry = data.find(d => d.annee_num === y && d["Catégorie socioprofessionnelle"] === cat);
      return { annee: y, age: entry ? entry.age_num : null };
    }).filter(d => d.age !== null)
  }));

  const lineGen = d3.line().x(d => x2(d.annee)).y(d => y2(d.age));

  // Fond pour désélectionner CSP
  svg2.append("rect")
    .attr("width", width).attr("height", height)
    .attr("fill", "transparent")
    .on("click", () => {
      selectedCSP = null;
      updateHighlight();
      updateCSPButtons();
    });

  // Lignes
  const lines = svg2.selectAll(".line-csp")
    .data(dataByCSP)
    .enter().append("path")
    .attr("class", "line-csp")
    .attr("fill", "none")
    .attr("stroke", d => color(d.category))
    .attr("stroke-width", 2.5)
    .attr("d", d => lineGen(d.values))
    .style("cursor", "pointer")
    .on("click", function (event, d) {
      selectedCSP = selectedCSP === d.category ? null : d.category;
      updateHighlight();
      updateCSPButtons();
    });

  // Points interactifs
  const dotsGroups = svg2.selectAll(".dots-group")
    .data(dataByCSP)
    .enter().append("g").attr("class", "dots-group");

  dotsGroups.selectAll("circle")
    .data(d => d.values.map(v => ({ ...v, category: d.category })))
    .enter().append("circle")
    .attr("cx", d => x2(d.annee))
    .attr("cy", d => y2(d.age))
    .attr("r", 4)
    .attr("fill", d => color(d.category))
    .attr("stroke", "white")
    .attr("stroke-width", 1.5)
    .style("cursor", "pointer")
    .on("mouseover", function (event, d) {
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip.html(`<strong>${d.category}</strong><br>Année : ${d.annee}<br>Âge : ${d.age.toFixed(2)} ans`)
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mousemove", function (event) {
      tooltip.style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function () {
      tooltip.transition().duration(500).style("opacity", 0);
    })
    .on("click", function (event, d) {
      // Clic sur un point = change l'année uniquement
      selectedYear = d.annee;
      updateVerticalLine();
      updateDonutCSP(selectedYear);
      updateYearButtons();
    });

  function updateHighlight() {
    if (selectedCSP === null) {
      lines.attr("stroke-width", 2.5).attr("opacity", 1);
      svg2.selectAll(".dots-group circle").attr("opacity", 1).attr("r", 4);
    } else {
      lines
        .attr("stroke-width", d => d.category === selectedCSP ? 4 : 1.5)
        .attr("opacity", d => d.category === selectedCSP ? 1 : 0.15);
      svg2.selectAll(".dots-group circle")
        .attr("opacity", d => d.category === selectedCSP ? 1 : 0.15)
        .attr("r", d => d.category === selectedCSP ? 6 : 3);
    }
  }

  // =============================
  // TABLEAU D'ANNÉES
  // =============================
  const yearContainer = d3.select("#year-selector");

  yearContainer.selectAll(".year-btn")
    .data(years).enter()
    .append("div")
    .attr("class", "year-btn")
    .text(d => d)
    .style("display", "inline-block")
    .style("padding", "6px 14px")
    .style("margin", "4px")
    .style("cursor", "pointer")
    .style("border-radius", "6px")
    .style("border", "2px solid #ccc")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .style("background", d => d === selectedYear ? "steelblue" : "#f5f5f5")
    .style("color", d => d === selectedYear ? "white" : "black")
    .on("click", function (event, d) {
      selectedYear = d;
      updateYearButtons();
      updateVerticalLine();
      updateDonutCSP(selectedYear);
    });

  function updateYearButtons() {
    yearContainer.selectAll(".year-btn")
      .style("background", d => d === selectedYear ? "steelblue" : "#f5f5f5")
      .style("color", d => d === selectedYear ? "white" : "black")
      .style("border-color", d => d === selectedYear ? "steelblue" : "#ccc");
  }

  // =============================
  // TABLEAU DE CSP (boutons)
  // =============================
  const cspContainer = d3.select("#csp-selector");

  const categoriesLabels = categories.map(cat => ({
    full: cat,
    short: cat.replace(/^\d+\s*-\s*/, "")
  }));

  // Bouton "Toutes les CSP" — sélectionné par défaut
  cspContainer.append("div")
    .attr("class", "csp-btn csp-btn-all")
    .style("display", "inline-flex")
    .style("align-items", "center")
    .style("padding", "5px 10px")
    .style("margin", "3px 4px 3px 0")
    .style("cursor", "pointer")
    .style("border-radius", "6px")
    .style("border", "2px solid steelblue")
    .style("font-size", "13px")
    .style("font-weight", "bold")
    .style("background", "steelblue")
    .style("color", "white")
    .append("span").text("Toutes les CSP");

  cspContainer.select(".csp-btn-all").on("click", function () {
    selectedCSP = null;
    updateHighlight();
    updateCSPButtons();
  });

  // Boutons par catégorie
  cspContainer.selectAll(".csp-btn-item")
    .data(categoriesLabels).enter()
    .append("div")
    .attr("class", "csp-btn csp-btn-item")
    .style("display", "inline-flex")
    .style("align-items", "center")
    .style("gap", "8px")
    .style("padding", "5px 10px")
    .style("margin", "3px 4px 3px 0")
    .style("cursor", "pointer")
    .style("border-radius", "6px")
    .style("border", "2px solid #ccc")
    .style("font-size", "13px")
    .style("background", "#f5f5f5")
    .style("color", "black")
    .each(function (d) {
      d3.select(this).append("div")
        .style("width", "12px").style("height", "12px")
        .style("border-radius", "3px")
        .style("background", color(d.full))
        .style("flex-shrink", "0");
      d3.select(this).append("span").text(d.short);
    })
    .on("click", function (event, d) {
      selectedCSP = selectedCSP === d.full ? null : d.full;
      updateHighlight();
      updateCSPButtons();
    });

  function updateCSPButtons() {
    // Bouton "Toutes"
    cspContainer.select(".csp-btn-all")
      .style("background", selectedCSP === null ? "steelblue" : "#f5f5f5")
      .style("color", selectedCSP === null ? "white" : "black")
      .style("border-color", selectedCSP === null ? "steelblue" : "#ccc");

    // Boutons catégories
    cspContainer.selectAll(".csp-btn-item")
      .style("background", d => d.full === selectedCSP ? color(d.full) : "#f5f5f5")
      .style("color", d => d.full === selectedCSP ? "white" : "black")
      .style("border-color", d => d.full === selectedCSP ? color(d.full) : "#ccc");
  }

  // =============================
  // DONUT CSP
  // =============================
  const donutWidth = 300, donutHeight = 300;
  const radius = Math.min(donutWidth, donutHeight) / 2;

  const svgDonutCSP = d3.select("#donut-csp")
    .append("svg")
    .attr("width", donutWidth).attr("height", donutHeight)
    .append("g")
    .attr("transform", `translate(${donutWidth / 2},${donutHeight / 2})`);

  const pieCSP = d3.pie().value(d => d.age_num).sort(null);
  const arcCSP = d3.arc().innerRadius(radius * 0.5).outerRadius(radius - 10);

  function updateDonutCSP(year) {
    // Toutes les CSP réelles, sans filtrage par CSP sélectionnée
    const filtered = data.filter(d => d.annee_num === year);

    const arcs = svgDonutCSP.selectAll("path")
      .data(pieCSP(filtered), d => d.data["Catégorie socioprofessionnelle"]);

    arcs.enter().append("path")
      .each(function (d) { this._current = d; })
      .merge(arcs)
      .transition().duration(600)
      .attr("fill", d => color(d.data["Catégorie socioprofessionnelle"]))
      .attr("opacity", 1)
      .attrTween("d", function (d) {
        const interpolate = d3.interpolate(this._current, d);
        this._current = interpolate(0);
        return t => arcCSP(interpolate(t));
      });

    arcs.exit().remove();
    d3.select("#yearLabel").text(year);
  }

  // Init
  updateVerticalLine();
  updateDonutCSP(selectedYear);
});