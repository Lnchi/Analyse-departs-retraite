// SCATTER PLOT PROFILS CSP
// Chargement des données
d3.dsv(";", "departretraite_parcsp.csv").then((data) => { 

  // PRÉPARATION DES DONNÉES
  data.forEach(d => {
    d.age_depart = +d["Âge conjoncturel de départ à la retraite"].replace(",", ".");
    d.retraites61 = +d["Proportion de retraités à 61 ans"];
    d.duree_sans_emploi = +d["Durée moyenne sans emploi ni retraite"];
  });

  // Supprimer les numéros devant les catégories
  data.forEach(d => {
    d.csp_clean = d["Catégorie socioprofessionnelle"]
      .replace(/^\d+\s*-\s*/, "");
  });

  // DIMENSIONS DU GRAPHIQUE
  const margin = { top: 40, right: 40, bottom: 60, left: 70 };
  const width = 600 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#graph-scatter")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // ÉCHELLES

  // Axe X → âge départ
  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.age_depart))
    .nice()
    .range([0, width]);

  // Axe Y → proportion retraités à 61 ans
  const y = d3.scaleLinear()
    .domain(d3.extent(data, d => d.retraites61))
    .nice()
    .range([height, 0]);

  // Taille des bulles → durée sans emploi
  const r = d3.scaleSqrt()
    .domain(d3.extent(data, d => d.duree_sans_emploi))
    .range([5, 20]);

  // Couleur → CSP
  const categories = [...new Set(data.map(d => d.csp_clean))];

  const color = d3.scaleOrdinal()
    .domain(categories)
    .range(d3.schemeTableau10);

  // AXES
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .append("text")
    .attr("x", width / 2)
    .attr("y", 45)
    .attr("fill", "black")
    .text("Âge de départ à la retraite");

  svg.append("g")
    .call(d3.axisLeft(y))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -50)
    .attr("fill", "black")
    .text("Proportion de retraités à 61 ans");

  // POINTS (BULLES)
  svg.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.age_depart))
    .attr("cy", d => y(d.retraites61))
    .attr("r", d => r(d.duree_sans_emploi))
    .attr("fill", d => color(d.csp_clean))
    .attr("opacity", 0.75)
    .append("title") // Tooltip simple
    .text(d =>
      `${d.csp_clean}
Année : ${d.annee}
Âge départ : ${d.age_depart}
Retraités à 61 ans : ${d.retraites61}%
Durée sans emploi : ${d.duree_sans_emploi}`
    );

});
