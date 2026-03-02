d3.dsv(";", "departretraite_parcsp.csv").then((data) => {
  // 1. NETTOYAGE ET SIMPLIFICATION
  data.forEach((d) => {
    d.annee = +d.annee;
    d.age = +d["Âge conjoncturel de départ à la retraite"].replace(",", ".");
    d.csp = d["Catégorie socioprofessionnelle"];
  });

  const years = Array.from(new Set(data.map((d) => d.annee))).sort();
  const categories = Array.from(new Set(data.map((d) => d.csp)));
  const color = d3.scaleOrdinal().domain(categories).range(d3.schemeTableau10);

  // OPTIMISATION : Pré-calcul des moyennes
  const avgDataByCSP = categories.map((cat) => {
    const catData = data.filter((d) => d.csp === cat);
    return { csp: cat, age: d3.mean(catData, (d) => d.age) };
  });

  const yearLabelDOM = d3.select("#yearLabel");

  let selectedYear = "all";

  // NOUVEAU : Un tableau pour la multi-sélection (vide = "Toutes les CSP")
  let selectedCSPs = [];

  // --- LOGIQUE DE MULTI-SÉLECTION ---
  function toggleCSP(csp) {
    if (selectedCSPs.length === 0) {
      // Si "Toutes" était actif, on bascule sur celle qu'on vient de cliquer
      selectedCSPs = [csp];
    } else {
      if (selectedCSPs.includes(csp)) {
        // Si elle y est déjà, on l'enlève
        selectedCSPs = selectedCSPs.filter((c) => c !== csp);
      } else {
        // Sinon, on l'ajoute à la sélection
        selectedCSPs.push(csp);
      }
    }

    // Si tout a été désélectionné OU si tout a été sélectionné manuellement -> on repasse en "All"
    if (
      selectedCSPs.length === 0 ||
      selectedCSPs.length === categories.length
    ) {
      selectedCSPs = [];
    }

    updateHighlight();
    updateCSPButtons();
    updateBarChart(selectedYear);
  }

  // --- GRAPHIQUE MULTI-LIGNES PAR CSP ---
  const svg2 = d3
    .select("#graph-csp")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x2 = d3.scaleLinear().domain(d3.extent(years)).range([0, width]);
  const y2 = d3.scaleLinear().domain([58, 66]).range([height, 0]);

  svg2
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x2).ticks(years.length).tickFormat(d3.format("d")))
    .append("text")
    .attr("x", width / 2)
    .attr("y", 40)
    .attr("fill", "black")
    .text("Année");

  svg2
    .append("g")
    .call(d3.axisLeft(y2))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("fill", "black")
    .text("Âge");

  const verticalLine = svg2
    .append("line")
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "5,4")
    .attr("opacity", 0.7);

  function updateVerticalLine() {
    if (selectedYear === "all") {
      verticalLine.attr("opacity", 0);
    } else {
      verticalLine
        .attr("opacity", 0.7)
        .attr("x1", x2(selectedYear))
        .attr("x2", x2(selectedYear));
    }
  }

  const dataByCSP = categories.map((cat) => ({
    category: cat,
    values: years
      .map((y) => {
        const entry = data.find((d) => d.annee === y && d.csp === cat);
        return { annee: y, age: entry ? entry.age : null };
      })
      .filter((d) => d.age !== null),
  }));

  const lineGen = d3
    .line()
    .x((d) => x2(d.annee))
    .y((d) => y2(d.age));

  svg2
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "transparent")
    .on("click", () => {
      selectedCSPs = []; // Reset sur un clic dans le vide
      updateHighlight();
      updateCSPButtons();
      updateBarChart(selectedYear);
    });

  const lines = svg2
    .selectAll(".line-csp")
    .data(dataByCSP)
    .enter()
    .append("path")
    .attr("class", "line-csp")
    .attr("fill", "none")
    .attr("stroke", (d) => color(d.category))
    .attr("stroke-width", 2.5)
    .attr("d", (d) => lineGen(d.values))
    .style("cursor", "pointer")
    .on("click", function (event, d) {
      toggleCSP(d.category);
    });

  const dotsGroups = svg2
    .selectAll(".dots-group")
    .data(dataByCSP)
    .enter()
    .append("g")
    .attr("class", "dots-group");

  const dots = dotsGroups
    .selectAll("circle")
    .data((d) => d.values.map((v) => ({ ...v, category: d.category })))
    .enter()
    .append("circle")
    .attr("cx", (d) => x2(d.annee))
    .attr("cy", (d) => y2(d.age))
    .attr("r", 4)
    .attr("fill", (d) => color(d.category))
    .attr("stroke", "white")
    .attr("stroke-width", 1.5)
    .style("cursor", "pointer")
    .on("mouseover", function (event, d) {
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip
        .html(
          `<strong>${d.category}</strong><br>Année : ${d.annee}<br>Âge : ${d.age.toFixed(2)} ans`,
        )
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", function () {
      tooltip.transition().duration(500).style("opacity", 0);
    })
    .on("click", function (event, d) {
      selectedYear = d.annee;
      updateVerticalLine();
      updateYearButtons();
      updateBarChart(selectedYear);
    });

  function updateHighlight() {
    if (selectedCSPs.length === 0) {
      lines.attr("stroke-width", 2.5).attr("opacity", 1);
      dots.attr("opacity", 1).attr("r", 4);
    } else {
      lines
        .attr("stroke-width", (d) =>
          selectedCSPs.includes(d.category) ? 4 : 1.5,
        )
        .attr("opacity", (d) => (selectedCSPs.includes(d.category) ? 1 : 0.15));
      dots
        .attr("opacity", (d) => (selectedCSPs.includes(d.category) ? 1 : 0.15))
        .attr("r", (d) => (selectedCSPs.includes(d.category) ? 6 : 3));
    }
  }

  // --- BOUTONS DE SÉLECTION D'ANNÉE ---
  const yearContainer = d3.select("#year-selector");

  const btnYearAll = yearContainer
    .append("div")
    .attr("class", "year-btn year-btn-all")
    .text("Tous")
    .style("display", "inline-block")
    .style("padding", "6px 14px")
    .style("margin", "4px")
    .style("cursor", "pointer")
    .style("border-radius", "6px")
    .style("border", "2px solid steelblue")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .style("background", "steelblue")
    .style("color", "white")
    .on("click", function () {
      selectedYear = "all";
      updateYearButtons();
      updateVerticalLine();
      updateBarChart(selectedYear);
    });

  const btnYearItems = yearContainer
    .selectAll(".year-btn-item")
    .data(years)
    .enter()
    .append("div")
    .attr("class", "year-btn year-btn-item")
    .text((d) => d)
    .style("display", "inline-block")
    .style("padding", "6px 14px")
    .style("margin", "4px")
    .style("cursor", "pointer")
    .style("border-radius", "6px")
    .style("border", "2px solid #ccc")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .style("background", "#f5f5f5")
    .style("color", "black")
    .on("click", function (event, d) {
      selectedYear = d;
      updateYearButtons();
      updateVerticalLine();
      updateBarChart(selectedYear);
    });

  function updateYearButtons() {
    btnYearAll
      .style("background", selectedYear === "all" ? "steelblue" : "#f5f5f5")
      .style("color", selectedYear === "all" ? "white" : "black")
      .style("border-color", selectedYear === "all" ? "steelblue" : "#ccc");

    btnYearItems
      .style("background", (d) =>
        d === selectedYear ? "steelblue" : "#f5f5f5",
      )
      .style("color", (d) => (d === selectedYear ? "white" : "black"))
      .style("border-color", (d) =>
        d === selectedYear ? "steelblue" : "#ccc",
      );
  }

  const cspContainer = d3.select("#csp-selector");
  const categoriesLabels = categories.map((cat) => ({
    full: cat,
    short: cat.replace(/^\d+\s*-\s*/, ""),
  }));

  const btnCspAll = cspContainer
    .append("div")
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
    .on("click", function () {
      selectedCSPs = []; // Reset complet
      updateHighlight();
      updateCSPButtons();
      updateBarChart(selectedYear);
    });

  btnCspAll.append("span").text("Toutes les CSP");

  const btnCspItems = cspContainer
    .selectAll(".csp-btn-item")
    .data(categoriesLabels)
    .enter()
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
    .on("click", function (event, d) {
      toggleCSP(d.full);
    });

  btnCspItems.each(function (d) {
    d3.select(this)
      .append("div")
      .style("width", "12px")
      .style("height", "12px")
      .style("border-radius", "3px")
      .style("background", color(d.full))
      .style("flex-shrink", "0");
    d3.select(this).append("span").text(d.short);
  });

  function updateCSPButtons() {
    btnCspAll
      .style("background", selectedCSPs.length === 0 ? "steelblue" : "#f5f5f5")
      .style("color", selectedCSPs.length === 0 ? "white" : "black")
      .style("border-color", selectedCSPs.length === 0 ? "steelblue" : "#ccc");

    btnCspItems
      .style("background", (d) =>
        selectedCSPs.includes(d.full) ? color(d.full) : "#f5f5f5",
      )
      .style("color", (d) =>
        selectedCSPs.includes(d.full) ? "white" : "black",
      )
      .style("border-color", (d) =>
        selectedCSPs.includes(d.full) ? color(d.full) : "#ccc",
      );
  }

  // --- BAR CHART — DÉTAIL PAR ANNÉE ---
  const barMargin = { top: 20, right: 20, bottom: 160, left: 50 };
  const barWidth = 420 - barMargin.left - barMargin.right;
  const barHeight = 400 - barMargin.top - barMargin.bottom;

  const svgBar = d3
    .select("#csp")
    .append("svg")
    .attr("width", barWidth + barMargin.left + barMargin.right)
    .attr("height", barHeight + barMargin.top + barMargin.bottom)
    .append("g")
    .attr("transform", `translate(${barMargin.left},${barMargin.top})`);

  const xBar = d3
    .scaleBand()
    .domain(categories)
    .range([0, barWidth])
    .padding(0.25);
  const yBar = d3.scaleLinear().domain([58, 66]).range([barHeight, 0]);

  svgBar
    .append("g")
    .attr("transform", `translate(0,${barHeight})`)
    .call(
      d3.axisBottom(xBar).tickFormat((cat) => cat.replace(/^\d+\s*-\s*/, "")),
    )
    .selectAll("text")
    .attr("transform", "rotate(-35)")
    .style("text-anchor", "end")
    .style("font-size", "11px");

  svgBar
    .append("g")
    .call(d3.axisLeft(yBar).ticks(5))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -barHeight / 2)
    .attr("y", -40)
    .attr("fill", "black")
    .style("text-anchor", "middle")
    .text("Âge moyen de départ");

  const bars = svgBar
    .selectAll(".bar-csp")
    .data(categories)
    .enter()
    .append("rect")
    .attr("class", "bar-csp")
    .attr("x", (d) => xBar(d))
    .attr("width", xBar.bandwidth())
    .attr("fill", (d) => color(d))
    .attr("rx", 3);

  const barLabels = svgBar
    .selectAll(".bar-label")
    .data(categories)
    .enter()
    .append("text")
    .attr("class", "bar-label")
    .attr("x", (d) => xBar(d) + xBar.bandwidth() / 2)
    .attr("text-anchor", "middle")
    .attr("font-size", "11px")
    .attr("font-weight", "bold")
    .attr("fill", "#333");

  function updateBarChart(year) {
    const filteredData =
      year === "all" ? avgDataByCSP : data.filter((d) => d.annee === year);
    const dataMap = new Map(filteredData.map((d) => [d.csp, d.age]));

    bars
      .transition()
      .duration(600)
      .attr("fill", (d) => color(d))
      .attr("opacity", (d) =>
        selectedCSPs.length === 0 || selectedCSPs.includes(d) ? 1 : 0.2,
      )
      .attr("y", (d) => (dataMap.has(d) ? yBar(dataMap.get(d)) : barHeight))
      .attr("height", (d) =>
        dataMap.has(d) ? barHeight - yBar(dataMap.get(d)) : 0,
      );

    barLabels
      .transition()
      .duration(600)
      .attr("opacity", (d) =>
        selectedCSPs.length === 0 || selectedCSPs.includes(d) ? 1 : 0.2,
      )
      .attr("y", (d) => (dataMap.has(d) ? yBar(dataMap.get(d)) - 4 : barHeight))
      .text((d) => (dataMap.has(d) ? dataMap.get(d).toFixed(1) : ""));

    yearLabelDOM.text(year === "all" ? "Moyenne toutes années" : year);
  }

  // --- INITIALISATION ---
  updateVerticalLine();
  updateYearButtons();
  updateBarChart(selectedYear);
});
