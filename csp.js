
// CHARGEMENT DES DONNÉES
// Lecture du fichier CSV avec des séparateurs ";"
d3.dsv(";", "departretraite_parcsp.csv").then((data) => {
  // Conversion des chaînes de caractères en nombres pour faciliter les calculs
  data.forEach((d) => {
    d.annee_num = +d.annee; // Année convertie en nombre
    d.age_num = +d["Âge conjoncturel de départ à la retraite"].replace(",", "."); // Age converti en nombre (remplacement des virgules)
  });

  // Création des listes uniques d'années et de catégories CSP
  const years = Array.from(new Set(data.map((d) => d.annee_num))).sort();
  const categories = Array.from(
    new Set(data.map((d) => d["Catégorie socioprofessionnelle"])),
  );

  // Définition d'une échelle de couleurs pour les catégories CSP
  const color = d3.scaleOrdinal().domain(categories).range(d3.schemeTableau10);

  const selectedColorGlobal = "#FF0000"; // Couleur pour la barre sélectionnée


  // GRAPHIQUE CSP : BARRES GROUPÉES
  // Création du SVG pour le graphique à barres
  const svg2 = d3
    .select("#graph-csp")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Échelle x pour les années
  const x2 = d3.scaleBand().domain(years).range([0, width]).padding(0.2);

  // Échelle x pour les sous-catégories (CSP) à l'intérieur de chaque groupe
  const xSub = d3
    .scaleBand()
    .domain(categories)
    .range([0, x2.bandwidth()])
    .padding(0.1);

  // Échelle y pour l'âge
  const y2 = d3.scaleLinear().domain([58, 66]).range([height, 0]);

  // Axe X avec label
  svg2
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x2))
    .append("text")
    .attr("x", width / 2)
    .attr("y", 40)
    .attr("fill", "black")
    .text("Année");

  // Axe Y avec label
  svg2
    .append("g")
    .call(d3.axisLeft(y2))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("fill", "black")
    .text("Âge");

  // Groupement des données par année
  const dataGroup = d3.group(data, (d) => d.annee_num);

  let selectedBarCSP = null; // Variable pour suivre la barre sélectionnée

  // Création des barres groupées
  svg2
    .selectAll(".yearGroup")
    .data(years)
    .enter()
    .append("g")
    .attr("transform", (d) => `translate(${x2(d)},0)`) // Positionner le groupe d'années
    .selectAll("rect")
    .data((d) => dataGroup.get(d)) // Sous-données par année
    .enter()
    .append("rect")
    .attr("x", (d) => xSub(d["Catégorie socioprofessionnelle"])) // Position x selon CSP
    .attr("y", (d) => y2(d.age_num)) // Position y selon âge
    .attr("width", xSub.bandwidth()) // Largeur de la barre
    .attr("height", (d) => height - y2(d.age_num)) // Hauteur de la barre
    .attr("fill", (d) => color(d["Catégorie socioprofessionnelle"])) // Couleur selon CSP
    .on("click", function (event, d) {
      // Gestion de la sélection de barre
      if (selectedBarCSP)
        selectedBarCSP.attr(
          "fill",
          color(selectedBarCSP.datum()["Catégorie socioprofessionnelle"]),
        );
      d3.select(this).attr("fill", selectedColorGlobal); // Change la couleur de la barre sélectionnée
      selectedBarCSP = d3.select(this);
      updateDonutCSP(d.annee_num); // Met à jour le donut avec l'année correspondante
      d3.select("#yearSlider").property("value", d.annee_num); // Met à jour le slider
    });

  // DONUT CSP
  const donutWidth = 300,
    donutHeight = 300;
  const radius = Math.min(donutWidth, donutHeight) / 2;

  // Création du SVG pour le donut
  const svgDonutCSP = d3
    .select("#donut-csp")
    .append("svg")
    .attr("width", donutWidth)
    .attr("height", donutHeight)
    .append("g")
    .attr("transform", `translate(${donutWidth / 2},${donutHeight / 2})`); // Centrer le donut

  // Définition du layout du donut
  const pieCSP = d3
    .pie()
    .value((d) => d.age_num) // Taille des parts selon l'âge
    .sort(null); // Ne pas trier les parts

  // Définition des arcs du donut
  const arcCSP = d3
    .arc()
    .innerRadius(radius * 0.5) // Rayon intérieur
    .outerRadius(radius - 10); // Rayon extérieur

  // Fonction pour mettre à jour le donut selon l'année
  function updateDonutCSP(year) {
    const filtered = data.filter((d) => d.annee_num === year); // Filtrage des données par année

    // Binding des données aux arcs
    const arcs = svgDonutCSP
      .selectAll("path")
      .data(pieCSP(filtered), (d) => d.data["Catégorie socioprofessionnelle"]);

    // Création et mise à jour des arcs
    arcs
      .enter()
      .append("path")
      .each(function (d) {
        this._current = d; // Sauvegarde de l'état initial pour transition
      })
      .merge(arcs)
      .transition()
      .duration(600)
      .attr("fill", (d) => color(d.data["Catégorie socioprofessionnelle"]))
      .attrTween("d", function (d) {
        const interpolate = d3.interpolate(this._current, d); // Animation fluide
        this._current = interpolate(0);
        return (t) => arcCSP(interpolate(t));
      });

    arcs.exit().remove(); // Supprime les arcs non utilisés

    // Légende CSP
    const legendSvg = d3.select("#legendCSP");
    legendSvg.selectAll("*").remove(); // Efface la légende précédente
    // Extraire uniquement le texte de la catégorie sans les numéros
  const categoriesLabels = Array.from(
  new Set(data.map(d =>
    d["Catégorie socioprofessionnelle"].replace(/^\d+\s*-\s*/, "")
  ))
);
// Dessiner la légende
categoriesLabels.forEach((cat, i) => {
  legendSvg.append("rect")
    .attr("x", 0)
    .attr("y", i * 18)      // Espacement plus petit pour compacité
    .attr("width", 12)      // Rectangle plus petit
    .attr("height", 12)
    .attr("fill", color(cat));

  legendSvg.append("text")
    .attr("x", 16)          // Décalage horizontal par rapport au rectangle
    .attr("y", i * 18 + 10)  // Alignement vertical
    .attr("font-size", "13px") // Texte plus petit
    .text(cat);
});

    // Mise à jour du label de l'année
    d3.select("#yearLabel").text(year);
  }

  // SLIDER
  d3.select("#yearSlider")
    .attr("min", d3.min(years))
    .attr("max", d3.max(years))
    .attr("step", 1)
    .property("value", years[0])
    .on("input", function () {
      const y = +this.value;
      updateDonutCSP(y); // Met à jour le donut lors du changement du slider
    });

  // Initialisation du donut avec la première année
  updateDonutCSP(years[0]);
});
