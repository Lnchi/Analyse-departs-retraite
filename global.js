// =============================
// DIMENSIONS
// =============================
const margin = { top: 50, right: 50, bottom: 50, left: 60 },
  width = 600 - margin.left - margin.right,
  height = 400 - margin.top - margin.bottom;

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

  // =============================
  // GRAPHIQUE 1 : BARRES GLOBALES
  // =============================
  const svg1 = d3
    .select("#graph-global")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const dataGlobale = Array.from(
    d3.rollup(
      data,
      (v) => d3.mean(v, (d) => d.age_num),
      (d) => d.annee_num,
    ),
    ([annee, age]) => ({ annee, age }),
  ).sort((a, b) => a.annee - b.annee);

  const x1 = d3
    .scaleBand()
    .domain(dataGlobale.map((d) => d.annee))
    .range([0, width])
    .padding(0.2);

  const y1 = d3.scaleLinear().domain([60, 64]).range([height, 0]);

  svg1
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x1))
    .append("text")
    .attr("x", width / 2)
    .attr("y", 40)
    .attr("fill", "black")
    .text("Année");

  svg1
    .append("g")
    .call(d3.axisLeft(y1))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("fill", "black")
    .text("Âge moyen");

  let selectedBarGlobal = null;
  const selectedColorGlobal = "#FF0000";

  svg1
    .selectAll("rect")
    .data(dataGlobale)
    .enter()
    .append("rect")
    .attr("x", (d) => x1(d.annee))
    .attr("y", (d) => y1(d.age))
    .attr("width", x1.bandwidth())
    .attr("height", (d) => height - y1(d.age))
    .attr("fill", "steelblue")
    .on("click", function (event, d) {
      if (selectedBarGlobal) selectedBarGlobal.attr("fill", "steelblue");
      d3.select(this).attr("fill", selectedColorGlobal);
      selectedBarGlobal = d3.select(this);
      updateDonutGlobal(d.annee);
    });

  // =============================
  // DONUT GLOBAL
  // =============================
  const donutWidth = 400,
    donutHeight = 400;
  const radius = Math.min(donutWidth, donutHeight) / 2;

  const svgDonutGlobal = d3
    .select("#donut-global")
    .append("svg")
    .attr("width", donutWidth)
    .attr("height", donutHeight)
    .append("g")
    .attr("transform", `translate(${donutWidth / 2},${donutHeight / 2})`);

  const pie = d3
    .pie()
    .value((d) => d.age)
    .sort(null);

  const arc = d3
    .arc()
    .innerRadius(radius * 0.5)
    .outerRadius(radius - 10);

  function updateDonutGlobal(selectedYear) {
    const arcs = svgDonutGlobal
      .selectAll("path")
      .data(pie(dataGlobale), (d) => d.data.annee);

    arcs
      .enter()
      .append("path")
      .each(function (d) {
        this._current = d;
      })
      .merge(arcs)
      .transition()
      .duration(600)
      .attr("fill", (d) =>
        d.data.annee === selectedYear ? selectedColorGlobal : "steelblue",
      )
      .attrTween("d", function (d) {
        const interpolate = d3.interpolate(this._current, d);
        this._current = interpolate(0);
        return (t) => arc(interpolate(t));
      });

    arcs.exit().remove();
  }

  updateDonutGlobal(years[0]);
});
