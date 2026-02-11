// =============================
// CHARGEMENT DES DONNÉES
// =============================
d3.dsv(";", "departretraite_parcsp.csv").then((data) => {
  data.forEach((d) => {
    d.annee_num = +d.annee;
    d.age_num = +d["Âge conjoncturel de départ à la retraite"].replace(
      ",",
      ".",
    );
  });

  const years = Array.from(new Set(data.map((d) => d.annee_num))).sort();
  const categories = Array.from(
    new Set(data.map((d) => d["Catégorie socioprofessionnelle"])),
  );

  const color = d3.scaleOrdinal().domain(categories).range(d3.schemeTableau10);

  const selectedColorGlobal = "#FF0000";

  // =============================
  // GRAPHIQUE CSP : BARRES GROUPÉES
  // =============================
  const svg2 = d3
    .select("#graph-csp")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x2 = d3.scaleBand().domain(years).range([0, width]).padding(0.2);

  const xSub = d3
    .scaleBand()
    .domain(categories)
    .range([0, x2.bandwidth()])
    .padding(0.1);

  const y2 = d3.scaleLinear().domain([58, 66]).range([height, 0]);

  svg2
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x2))
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

  const dataGroup = d3.group(data, (d) => d.annee_num);

  let selectedBarCSP = null;

  svg2
    .selectAll(".yearGroup")
    .data(years)
    .enter()
    .append("g")
    .attr("transform", (d) => `translate(${x2(d)},0)`)
    .selectAll("rect")
    .data((d) => dataGroup.get(d))
    .enter()
    .append("rect")
    .attr("x", (d) => xSub(d["Catégorie socioprofessionnelle"]))
    .attr("y", (d) => y2(d.age_num))
    .attr("width", xSub.bandwidth())
    .attr("height", (d) => height - y2(d.age_num))
    .attr("fill", (d) => color(d["Catégorie socioprofessionnelle"]))
    .on("click", function (event, d) {
      if (selectedBarCSP)
        selectedBarCSP.attr(
          "fill",
          color(selectedBarCSP.datum()["Catégorie socioprofessionnelle"]),
        );
      d3.select(this).attr("fill", selectedColorGlobal);
      selectedBarCSP = d3.select(this);
      updateDonutCSP(d.annee_num);
      d3.select("#yearSlider").property("value", d.annee_num);
    });

  // =============================
  // DONUT CSP
  // =============================
  const donutWidth = 400,
    donutHeight = 400;
  const radius = Math.min(donutWidth, donutHeight) / 2;

  const svgDonutCSP = d3
    .select("#donut-csp")
    .append("svg")
    .attr("width", donutWidth)
    .attr("height", donutHeight)
    .append("g")
    .attr("transform", `translate(${donutWidth / 2},${donutHeight / 2})`);

  const pieCSP = d3
    .pie()
    .value((d) => d.age_num)
    .sort(null);

  const arcCSP = d3
    .arc()
    .innerRadius(radius * 0.5)
    .outerRadius(radius - 10);

  function updateDonutCSP(year) {
    const filtered = data.filter((d) => d.annee_num === year);

    const arcs = svgDonutCSP
      .selectAll("path")
      .data(pieCSP(filtered), (d) => d.data["Catégorie socioprofessionnelle"]);

    arcs
      .enter()
      .append("path")
      .each(function (d) {
        this._current = d;
      })
      .merge(arcs)
      .transition()
      .duration(600)
      .attr("fill", (d) => color(d.data["Catégorie socioprofessionnelle"]))
      .attrTween("d", function (d) {
        const interpolate = d3.interpolate(this._current, d);
        this._current = interpolate(0);
        return (t) => arcCSP(interpolate(t));
      });

    arcs.exit().remove();

    // Légende CSP
    const legendSvg = d3.select("#legendCSP");
    legendSvg.selectAll("*").remove();
    categories.forEach((cat, i) => {
      legendSvg
        .append("rect")
        .attr("x", 0)
        .attr("y", i * 20)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", color(cat));

      legendSvg
        .append("text")
        .attr("x", 18)
        .attr("y", i * 20 + 10)
        .text(cat);
    });

    d3.select("#yearLabel").text(year);
  }

  // =============================
  // SLIDER
  // =============================
  d3.select("#yearSlider")
    .attr("min", d3.min(years))
    .attr("max", d3.max(years))
    .attr("step", 1)
    .property("value", years[0])
    .on("input", function () {
      const y = +this.value;
      updateDonutCSP(y);
    });

  updateDonutCSP(years[0]);
});
