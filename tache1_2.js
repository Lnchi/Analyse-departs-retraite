// On charge le fichier CSV et on démarre
d3.dsv(";", "departretraite_parcsp.csv").then((data) => {
  
  // On nettoie les données pour les rendre utilisables
  data.forEach((d) => {
    d.annee = +d.annee;
    d.age = +d["Âge conjoncturel de départ à la retraite"].replace(",", ".");
    d.csp = d["Catégorie socioprofessionnelle"];
  });

  // On extrait les années et catégories uniques + on prépare les couleurs
  const years = Array.from(new Set(data.map((d) => d.annee))).sort();
  const categories = Array.from(new Set(data.map((d) => d.csp)));
  const color = d3.scaleOrdinal().domain(categories).range(d3.schemeTableau10);

  // On calcule une fois pour toutes les moyennes par CSP (plus rapide après)
  const avgDataByCSP = categories.map((cat) => {
    const catData = data.filter((d) => d.csp === cat);
    return { csp: cat, age: d3.mean(catData, (d) => d.age) };
  });

  // On récupère l'élément HTML qui affiche l'année sélectionnée
  const yearLabelDOM = d3.select("#yearLabel");

  // Variables pour savoir quelle année et quelles CSP sont sélectionnées
  let selectedYear = "all";
  let selectedCSPs = [];

  // Fonction pour ajouter/retirer une CSP de la sélection au clic
  function toggleCSP(csp) {
    if (selectedCSPs.length === 0) {
      // Si rien n'était sélectionné, on sélectionne celle-ci
      selectedCSPs = [csp];
    } else {
      if (selectedCSPs.includes(csp)) {
        // Si elle est déjà sélectionnée, on la retire
        selectedCSPs = selectedCSPs.filter((c) => c !== csp);
      } else {
        // Sinon on l'ajoute
        selectedCSPs.push(csp);
      }
    }

    // Si on a tout décoché ou tout coché, on revient à "Toutes"
    if (
      selectedCSPs.length === 0 ||
      selectedCSPs.length === categories.length
    ) {
      selectedCSPs = [];
    }

    // On met à jour l'affichage
    updateHighlight();
    updateCSPButtons();
    updateBarChart(selectedYear);
  }

  // On crée le conteneur SVG pour le graphique multi-lignes
  const svg2 = d3
    .select("#graph-csp")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // On définit les échelles pour positionner les éléments
  const x2 = d3.scaleLinear().domain(d3.extent(years)).range([0, width]);
  const y2 = d3.scaleLinear().domain([58, 66]).range([height, 0]);

  // On dessine l'axe horizontal (années)
  svg2
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x2).ticks(years.length).tickFormat(d3.format("d")))
    .append("text")
    .attr("x", width / 2)
    .attr("y", 40)
    .attr("fill", "black")
    .text("Année");

  // On dessine l'axe vertical (âge)
  svg2
    .append("g")
    .call(d3.axisLeft(y2))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("fill", "black")
    .text("Âge");

  // On crée une ligne verticale qui indiquera l'année sélectionnée
  const verticalLine = svg2
    .append("line")
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "5,4")
    .attr("opacity", 0.7);

  // Fonction qui positionne ou cache la ligne verticale selon l'année
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

  // On organise les données : une ligne par CSP avec toutes ses années
  const dataByCSP = categories.map((cat) => ({
    category: cat,
    values: years
      .map((y) => {
        const entry = data.find((d) => d.annee === y && d.csp === cat);
        return { annee: y, age: entry ? entry.age : null };
      })
      .filter((d) => d.age !== null),
  }));

  // On prépare le générateur de ligne
  const lineGen = d3
    .line()
    .x((d) => x2(d.annee))
    .y((d) => y2(d.age));

  // On ajoute un fond transparent pour détecter les clics dans le vide
  svg2
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "transparent")
    .on("click", () => {
      selectedCSPs = []; // On désélectionne tout
      updateHighlight();
      updateCSPButtons();
      updateBarChart(selectedYear);
    });

  // On dessine toutes les lignes (une par CSP)
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

  // On crée un groupe pour chaque CSP qui contiendra ses points
  const dotsGroups = svg2
    .selectAll(".dots-group")
    .data(dataByCSP)
    .enter()
    .append("g")
    .attr("class", "dots-group");

  // On ajoute les points sur chaque ligne
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
    // Au survol d'un point, on affiche les infos
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
    // Au clic sur un point, on sélectionne cette année
    .on("click", function (event, d) {
      selectedYear = d.annee;
      updateVerticalLine();
      updateYearButtons();
      updateBarChart(selectedYear);
    });

  // Fonction qui met en évidence les CSP sélectionnées
  function updateHighlight() {
    if (selectedCSPs.length === 0) {
      // Si rien n'est sélectionné, tout est visible normalement
      lines.attr("stroke-width", 2.5).attr("opacity", 1);
      dots.attr("opacity", 1).attr("r", 4);
    } else {
      // Sinon, on rend les CSP sélectionnées plus visibles
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

  // On crée le conteneur pour les boutons d'année
  const yearContainer = d3.select("#year-selector");

  // Le bouton "Tous" pour afficher toutes les années
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

  // Les boutons individuels pour chaque année
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

  // Fonction qui met à jour l'apparence des boutons d'année
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

  // On prépare les labels des CSP (version courte sans numéro)
  const cspContainer = d3.select("#csp-selector");
  const categoriesLabels = categories.map((cat) => ({
    full: cat,
    short: cat.replace(/^\d+\s*-\s*/, ""),
  }));

  // Le bouton "Toutes les CSP"
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
      selectedCSPs = []; // On désélectionne tout
      updateHighlight();
      updateCSPButtons();
      updateBarChart(selectedYear);
    });

  btnCspAll.append("span").text("Toutes les CSP");

  // Les boutons individuels pour chaque CSP
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

  // On ajoute un carré de couleur + le texte dans chaque bouton CSP
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

  // Fonction qui met à jour l'apparence des boutons CSP
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

  // On configure les dimensions du graphique en barres
  const barMargin = { top: 20, right: 20, bottom: 160, left: 50 };
  const barWidth = 420 - barMargin.left - barMargin.right;
  const barHeight = 400 - barMargin.top - barMargin.bottom;

  // On crée le conteneur SVG pour le graphique en barres
  const svgBar = d3
    .select("#csp")
    .append("svg")
    .attr("width", barWidth + barMargin.left + barMargin.right)
    .attr("height", barHeight + barMargin.top + barMargin.bottom)
    .append("g")
    .attr("transform", `translate(${barMargin.left},${barMargin.top})`);

  // On définit les échelles pour les barres
  const xBar = d3
    .scaleBand()
    .domain(categories)
    .range([0, barWidth])
    .padding(0.25);
  const yBar = d3.scaleLinear().domain([58, 66]).range([barHeight, 0]);

  // On dessine l'axe horizontal (CSP) avec labels inclinés
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

  // On dessine l'axe vertical (âge moyen)
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

  // On crée les barres (une par CSP)
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

  // On crée les étiquettes de valeur au-dessus des barres
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

  // Fonction qui met à jour le graphique en barres selon l'année
  function updateBarChart(year) {
    // On filtre les données selon l'année (ou moyenne si "all")
    const filteredData =
      year === "all" ? avgDataByCSP : data.filter((d) => d.annee === year);
    const dataMap = new Map(filteredData.map((d) => [d.csp, d.age]));

    // On anime les barres
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

    // On anime les étiquettes
    barLabels
      .transition()
      .duration(600)
      .attr("opacity", (d) =>
        selectedCSPs.length === 0 || selectedCSPs.includes(d) ? 1 : 0.2,
      )
      .attr("y", (d) => (dataMap.has(d) ? yBar(dataMap.get(d)) - 4 : barHeight))
      .text((d) => (dataMap.has(d) ? dataMap.get(d).toFixed(1) : ""));

    // On met à jour le titre avec l'année affichée
    yearLabelDOM.text(year === "all" ? "Moyenne toutes années" : year);
  }

  // On initialise tout au chargement
  updateVerticalLine();
  updateYearButtons();
  updateBarChart(selectedYear);
});