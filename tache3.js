// TACHE 3 : Analyse croisée de la proportion de personnes fortement limitées à la retraite en fonction de la durée moyenne passée en emploi et hors emploi, selon la catégorie socioprofessionnelle et l’année.

// Fonction utilitaire pour couper le texte en deux lignes proprement
function splitText(text, maxLength = 25) {
  if (!text) return ["", ""];
  if (text.length <= maxLength) return [text, ""];
  let index = text.lastIndexOf(" ", maxLength);
  if (index === -1) index = maxLength;
  return [text.substring(0, index), text.substring(index).trim()];
}

// Charger les données CSV
d3.dsv(";", "departretraite_parcsp.csv").then((data) => {
  // 1. Nettoyage et conversion des données
  data.forEach((d) => {
    d.annee = +d["annee"];
    const parseFr = (val) => (val ? +val.toString().replace(",", ".") : 0);
    d.sante_limitee = parseFr(
      d[
        "Proportion de personnes fortement limitées au cours de la première année de retraite (%)"
      ],
    );
    d.duree_sans_emploi = parseFr(d["Durée moyenne sans emploi ni retraite"]);
    d.duree_emploi = parseFr(d["Durée moyenne en emploi (hors cumul)"]);
    d.csp_clean = d["Catégorie socioprofessionnelle"].replace(
      /^\d+\s*-\s*/,
      "",
    );
  });
  // 2. Préparation des données pour le graphique
  const categories = [...new Set(data.map((d) => d.csp_clean))].sort();
  const annees = [...new Set(data.map((d) => d.annee))].sort();
  const color = d3.scaleOrdinal().domain(categories).range(d3.schemeTableau10);


  // SCATTER PLOT 
  // 2.1. Création de la échelle x et y
  const margin = { top: 40, right: 300, bottom: 60, left: 70 };
  const width = 1000 - margin.left - margin.right;
  const height = 450 - margin.top - margin.bottom;
 
  d3.select("#graph-scatter-sante").style("min-height", "450px");
  const svg = d3
    .select("#graph-scatter-sante")
    .html("")
    .append("svg")
    .attr("width", "100%")
    .attr(
      "viewBox",
      `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`,
    );

  const chart = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Rect transparent derrière tout pour clic extérieur 
  // Pour capter les clics en dehors des bulles et réinitialiser.
  chart
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "transparent")
    .on("click", () => {
      chart.selectAll(".info-group").remove();
      chart
        .selectAll("circle.dot")
        .transition()
        .duration(200)
        .attr("opacity", 0.6)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .attr("r", (d) => r(d.duree_emploi));
      selectedCategory = null;
      legend.selectAll("circle").attr("stroke", "none").attr("stroke-width", 0);
    });

  // Échelles
  const x = d3 
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.sante_limitee)])
    .nice()
    .range([0, width]);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.duree_sans_emploi)])
    .nice()
    .range([height, 0]);
  const r = d3
    .scaleSqrt()
    .domain(d3.extent(data, (d) => d.duree_emploi))
    .range([5, 22]);

  // Axes
  chart
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .append("text")
    .attr("x", width / 2)
    .attr("y", 45)
    .attr("fill", "#2d3a4b")
    .style("text-anchor", "middle")
    .style("font-weight", "bold")
    .text("Proportion fortement limitées en 1ère année de retraite (%)");

  chart
    .append("g")
    .call(d3.axisLeft(y))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -50)
    .attr("fill", "#2d3a4b")
    .style("text-anchor", "middle")
    .style("font-weight", "bold")
    .text("Durée moyenne sans emploi (Années)");

  // Lignes de moyennes : interpréter visuellement les groupes
  const meanSante = d3.mean(data, (d) => d.sante_limitee);
  const meanSansEmp = d3.mean(data, (d) => d.duree_sans_emploi);

  chart
    .append("line")
    .attr("x1", x(meanSante))
    .attr("y1", 0)
    .attr("x2", x(meanSante))
    .attr("y2", height)
    .attr("stroke", "#ccc")
    .attr("stroke-dasharray", "4");

  chart
    .append("line")
    .attr("x1", 0)
    .attr("y1", y(meanSansEmp))
    .attr("x2", width)
    .attr("y2", y(meanSansEmp))
    .attr("stroke", "#ccc")
    .attr("stroke-dasharray", "4");

  // Menu déroulant : Filtrage par année :
  const selectDiv = d3.select("#controls-sante").html("");
  selectDiv
    .append("label")
    .text("Filtrer par année : ")
    .style("margin-right", "10px");

  const select = selectDiv
    .append("select")
    .style("padding", "5px 15px")
    .style("border-radius", "20px")
    .on("change", function () {
      updateScatter(this.value);
    });

  select
    .selectAll("option")
    .data(["Toutes", ...annees])
    .enter()
    .append("option")
    .text((d) => d)
    .attr("value", (d) => d);

  // Variable pour la légende interactive
  let selectedCategory = null;

  // Fonction update scatter
  function updateScatter(selectedYear) {
    chart.selectAll(".info-group").remove();
    const filtered =
      selectedYear === "Toutes"
        ? data
        : data.filter((d) => d.annee == selectedYear);
    // Création des cercles
    const circles = chart
      .selectAll("circle.dot")
      .data(filtered, (d) => d.csp_clean + d.annee);
    // Mise à jour des cercles existants
    circles.join(
      (enter) =>
        enter
          .append("circle")
          .attr("class", "dot")
          .attr("cx", (d) => x(d.sante_limitee))
          .attr("cy", (d) => y(d.duree_sans_emploi))
          .attr("r", 0)
          .attr("fill", (d) => color(d.csp_clean))
          .attr("opacity", 0.6)
          .attr("stroke", "#fff")
          .style("cursor", "pointer")
          .on("click", function (event, d) {
            event.stopPropagation();
            chart.selectAll(".info-group").remove();
            chart.selectAll("circle.dot").attr("opacity", 0.3);
            d3.select(this)
              .attr("stroke", "#000")
              .attr("stroke-width", 2)
              .attr("opacity", 1)
              .raise();
            // Création du groupe pour le texte d'info
            const [line1, line2] = splitText(d.csp_clean, 28);
            const boxHeight = line2 ? 115 : 100;
            let infoX = x(d.sante_limitee) + 15;
            let infoY = y(d.duree_sans_emploi) - boxHeight / 2;
            if (infoX + 220 > width) infoX = x(d.sante_limitee) - 235;
            if (infoY < 0) infoY = 10;
            if (infoY + boxHeight > height) infoY = height - boxHeight - 10;

            const infoGroup = chart
              .append("g")
              .attr("class", "info-group")
              .attr("transform", `translate(${infoX},${infoY})`)
              .style("pointer-events", "none");

            infoGroup
              .append("rect")
              .attr("width", 220)
              .attr("height", boxHeight)
              .attr("fill", "rgba(255,255,255,0.98)")
              .attr("stroke", color(d.csp_clean))
              .attr("stroke-width", 2)
              .attr("rx", 5);

            const text = infoGroup
              .append("text")
              .attr("x", 10)
              .attr("y", 20)
              .attr("font-size", "11px")
              .attr("fill", "#333");
            text
              .append("tspan")
              .attr("x", 10)
              .style("font-weight", "bold")
              .text(line1);
            if (line2)
              text
                .append("tspan")
                .attr("x", 10)
                .attr("dy", "1.2em")
                .style("font-weight", "bold")
                .text(line2);
            text
              .append("tspan")
              .attr("x", 10)
              .attr("dy", "1.6em")
              .text(`• Santé limitée : ${d.sante_limitee}%`);
            text
              .append("tspan")
              .attr("x", 10)
              .attr("dy", "1.2em")
              .text(`• Sans emploi : ${d.duree_sans_emploi} ans`);
            text
              .append("tspan")
              .attr("x", 10)
              .attr("dy", "1.2em")
              .text(`• Durée emploi : ${d.duree_emploi} ans`);
          })
          .transition()
          .duration(800)
          .attr("r", (d) => r(d.duree_emploi)),

      (update) =>
        update
          .transition()
          .duration(800)
          .attr("cx", (d) => x(d.sante_limitee))
          .attr("cy", (d) => y(d.duree_sans_emploi))
          .attr("r", (d) => r(d.duree_emploi)),

      (exit) => exit.transition().duration(500).attr("r", 0).remove(),
    );
  }
  
  updateScatter("Toutes");

  // Légende interactive
  const legend = chart
    .append("g")
    .attr("transform", `translate(${width + 35},10)`);

  categories.forEach((cat, i) => {
    const row = legend
      .append("g")
      .attr("transform", `translate(0,${i * 38})`)
      .style("cursor", "pointer");

    row.append("circle").attr("r", 6).attr("fill", color(cat));

    const [l1, l2] = splitText(cat, 25);
    const textEl = row
      .append("text")
      .attr("x", 18)
      .attr("y", 4)
      .style("font-size", "10px")
      .style("fill", "#2d3a4b");
    textEl.append("tspan").attr("x", 18).text(l1);
    if (l2) textEl.append("tspan").attr("x", 18).attr("dy", "1.2em").text(l2);

    // Clic sur catégorie = filtrage
    row.on("click", function (event) {
      if (selectedCategory === cat) {
        selectedCategory = null;
      } else {
        selectedCategory = cat;
      }

      chart
        .selectAll("circle.dot")
        .transition()
        .duration(500)
        .attr("opacity", (d) =>
          !selectedCategory
            ? 0.6
            : d.csp_clean === selectedCategory
              ? 0.9
              : 0.1,
        )
        .attr("r", (d) =>
          !selectedCategory
            ? r(d.duree_emploi)
            : d.csp_clean === selectedCategory
              ? r(d.duree_emploi)
              : r(d.duree_emploi) * 0.6,
        );

      legend.selectAll("circle").attr("stroke", "none").attr("stroke-width", 0);
      if (selectedCategory) {
        row.select("circle").attr("stroke", "#000").attr("stroke-width", 2);
      }
    });
  });

  // Légende des tailles des cercles
  const sizeLegend = chart
    .append("g")
    .attr("transform", `translate(${width + 35}, 330)`);

  sizeLegend
    .append("text")
    .attr("x", 0)
    .attr("y", -15)
    .style("font-size", "11px")
    .style("font-weight", "bold")
    .style("fill", "#2d3a4b")
    .text("Durée en emploi");

  // Calcul dynamique pour la durée d'emploi
  const minEmp = Math.floor(d3.min(data, (d) => d.duree_emploi)) + 1;
  const maxEmp = Math.ceil(d3.max(data, (d) => d.duree_emploi));
  const midEmp = Math.round((minEmp + maxEmp) / 2);

  // Tableau des 3 valeurs générées automatiquement
  const sizeValues = [minEmp, midEmp, maxEmp];

  const sizeItems = sizeLegend
    .selectAll(".size-item")
    .data(sizeValues)
    .enter()
    .append("g")
    .attr("transform", (d, i) => `translate(0, ${i * 25})`);

  sizeItems
    .append("circle")
    .attr("cx", 15)
    .attr("r", (d) => r(d))
    .attr("fill", "none")
    .attr("stroke", "#888")
    .attr("stroke-width", 1.5);

  sizeItems
    .append("text")
    .attr("x", 45)
    .attr("y", 4)
    .style("font-size", "10px")
    .style("fill", "#2d3a4b")
    .text((d) => d + " ans");


  // HEATMAP 
  const marginHM = { top: 40, right: 100, bottom: 40, left: 180 };
  const widthHM = 850 - marginHM.left - marginHM.right;
  const heightHM = 400 - marginHM.top - marginHM.bottom;

  const svgHM = d3
    .select("#graph-heatmap-sante")
    .html("")
    .append("svg")
    .attr(
      "viewBox",
      `0 0 ${widthHM + marginHM.left + marginHM.right} ${heightHM + marginHM.top + marginHM.bottom}`,
    )
    .append("g")
    .attr("transform", `translate(${marginHM.left},${marginHM.top})`);

  const xHM = d3.scaleBand().domain(annees).range([0, widthHM]).padding(0.05);
  const yHM = d3
    .scaleBand()
    .domain(categories)
    .range([0, heightHM])
    .padding(0.05);
  const colorHM = d3
    .scaleSequential(d3.interpolateYlOrRd)
    .domain([0, d3.max(data, (d) => d.sante_limitee)]);

  // Créer tooltip div
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip-hm")
    .style("position", "absolute")
    .style("background", "#fff")
    .style("border", "1px solid #ccc")
    .style("padding", "6px")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("opacity", 0);

  svgHM
    .selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", (d) => xHM(d.annee))
    .attr("y", (d) => yHM(d.csp_clean))
    .attr("width", xHM.bandwidth())
    .attr("height", yHM.bandwidth())
    .attr("fill", (d) => colorHM(d.sante_limitee))
    .attr("stroke", "#fff")
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip
        .html(
          `<strong>${d.csp_clean} (${d.annee})</strong><br/>
                          Santé limitée : ${d.sante_limitee}%<br/>
                          Sans emploi : ${d.duree_sans_emploi} ans<br/>
                          Durée emploi : ${d.duree_emploi} ans`,
        )
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY + 10 + "px");
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY + 10 + "px");
    })
    .on("mouseleave", () => {
      tooltip.transition().duration(200).style("opacity", 0);
    });

  svgHM
    .append("g")
    .attr("transform", `translate(0,${heightHM})`)
    .call(d3.axisBottom(xHM))
    .selectAll("text")
    .style("font-size", "11px");


  // Ajout des axes
  svgHM
    .append("g")
    .call(d3.axisLeft(yHM))
    .selectAll(".tick text")
    .each(function (d) {
      const [line1, line2] = splitText(d, 20);
      const text = d3.select(this);
      text.text("");

      if (line2) {
        text.append("tspan").attr("x", -10).attr("dy", "-0.2em").text(line1);
        text.append("tspan").attr("x", -10).attr("dy", "1.2em").text(line2);
      } else {
        text.append("tspan").attr("x", -10).attr("dy", "0.32em").text(line1);
      }
    });


  // Ajout de la légende
  const legendWidth = 15;
  const legendHeight = 150;

  const legendHM = svgHM
    .append("g")
    .attr(
      "transform",
      `translate(${widthHM + 25}, ${heightHM - legendHeight})`,
    );

  const defs = svgHM.append("defs");
  const linearGradient = defs
    .append("linearGradient")
    .attr("id", "heatmap-gradient")
    .attr("x1", "0%")
    .attr("y1", "100%")
    .attr("x2", "0%")
    .attr("y2", "0%");
  
  linearGradient
    .selectAll("stop")
    .data(d3.ticks(0, 1, 10))
    .enter()
    .append("stop")
    .attr("offset", (d) => d * 100 + "%")
    .attr("stop-color", (d) => d3.interpolateYlOrRd(d));
 
  legendHM 
    .append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#heatmap-gradient)")
    .attr("stroke", "#ccc");

  const yLegendScale = d3
    .scaleLinear()
    .domain(colorHM.domain())
    .range([legendHeight, 0]);

  const yLegendAxis = d3
    .axisRight(yLegendScale)
    .ticks(5)
    .tickFormat((d) => d + "%");

  legendHM
    .append("g")
    .attr("transform", `translate(${legendWidth}, 0)`)
    .call(yLegendAxis)
    .selectAll("text")
    .style("font-size", "10px")
    .style("fill", "#2d3a4b");

  legendHM.select(".domain").remove();

  legendHM
    .append("text")
    .attr("x", -20)
    .attr("y", -15)
    .style("font-size", "11px")
    .style("font-weight", "bold")
    .style("fill", "#2d3a4b")
    .text("% Santé limitée");
});
