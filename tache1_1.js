// 1. CONFIGURATION DE L'ESPACE
const margin = { top: 50, right: 50, bottom: 50, left: 60 };
const width = 650 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// OPTIMISATION : Mise en cache des éléments du DOM pour ne pas les chercher à chaque clic
const panelTitle = d3.select("#panel-title");
const panelMean = d3.select("#panel-mean");
const panelMinCsp = d3.select("#panel-min-csp");
const panelMinAge = d3.select("#panel-min-age");
const panelMaxCsp = d3.select("#panel-max-csp");
const panelMaxAge = d3.select("#panel-max-age");
const panelGap = d3.select("#panel-gap");

// 2. TOOLTIP
const tooltip = d3
  .select("body")
  .append("div")
  .style("position", "absolute")
  .style("background", "rgba(255,255,255,0.95)")
  .style("border", "1px solid #ccc")
  .style("padding", "10px")
  .style("border-radius", "5px")
  .style("box-shadow", "0px 2px 5px rgba(0,0,0,0.2)")
  .style("pointer-events", "none")
  .style("opacity", 0)
  .style("font-family", "sans-serif")
  .style("font-size", "14px");

// 3. CHARGEMENT ET TRANSFORMATION
d3.dsv(";", "departretraite_parcsp.csv")
  .then((data) => {
    // NETTOYAGE DES DONNÉES
    data.forEach((d) => {
      d.annee = +d.annee;
      const ageString = d["Âge conjoncturel de départ à la retraite"];
      d.age = ageString ? +ageString.replace(",", ".") : 0;
      d.csp_clean = (d["Catégorie socioprofessionnelle"] || "").replace(
        /^\d+\s*-\s*/,
        "",
      );
    });

    const years = Array.from(new Set(data.map((d) => d.annee))).sort();

    const dataGlobale = Array.from(
      d3.rollup(
        data,
        (v) => d3.mean(v, (d) => d.age),
        (d) => d.annee,
      ),
      ([annee, age]) => ({ annee, age }),
    ).sort((a, b) => a.annee - b.annee);

    // OPTIMISATION : Pré-calcul des stats globales (on trie une seule fois au chargement !)
    const validData = data.filter((d) => d.age > 0);
    const ageMoyenTotal = d3.mean(validData, (d) => d.age);
    const allSorted = [...validData].sort((a, b) => a.age - b.age);
    const globalMin = allSorted[0];
    const globalMax = allSorted[allSorted.length - 1];

    // 4. CRÉATION DU CONTENEUR SVG
    const svg1 = d3
      .select("#graph-global")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    svg1
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .on("click", () => {
        anneeSelectionnee = null;
        updateVisuals();
      });

    // 5. ÉCHELLES ET AXES
    const x1 = d3
      .scaleLinear()
      .domain(d3.extent(dataGlobale, (d) => d.annee))
      .range([0, width]);
    const y1 = d3.scaleLinear().domain([60, 64]).range([height, 0]);

    svg1
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x1).ticks(years.length).tickFormat(d3.format("d")))
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

    // 6. DESSIN DE LA LIGNE
    const lineGen = d3
      .line()
      .x((d) => x1(d.annee))
      .y((d) => y1(d.age));

    svg1
      .append("path")
      .datum(dataGlobale)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 3)
      .attr("d", lineGen) // C'est plus propre ici
      .style("pointer-events", "none");

    let anneeSelectionnee = null;

    // 7. CERCLES ET INTERACTIVITÉ
    const circles = svg1
      .selectAll(".point-global") // Bonne pratique : utiliser une classe
      .data(dataGlobale)
      .enter()
      .append("circle")
      .attr("class", "point-global")
      .attr("cx", (d) => x1(d.annee))
      .attr("cy", (d) => y1(d.age))
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip
          .html(
            `<strong>Année :</strong> ${d.annee}<br><strong>Âge :</strong> ${d.age.toFixed(2)} ans`,
          )
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 28 + "px");
        d3.select(this).attr("stroke", "black");
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", function () {
        tooltip.transition().duration(500).style("opacity", 0);
        d3.select(this).attr("stroke", "white");
      })
      .on("click", function (event, d) {
        anneeSelectionnee = anneeSelectionnee === d.annee ? null : d.annee;
        updateVisuals();
      });

    // 8. FONCTION DE MISE À JOUR
    function updateVisuals() {
      circles
        .attr("fill", (d) =>
          d.annee === anneeSelectionnee ? "#FF0000" : "steelblue",
        )
        .attr("r", (d) => (d.annee === anneeSelectionnee ? 9 : 6));

      if (anneeSelectionnee === null) {
        // Affichage instantané avec les variables globales pré-calculées
        panelTitle.text("Bilan (2013-2020)");
        panelMean.text(`Moyenne : ${ageMoyenTotal.toFixed(2)} ans`);
        panelMinCsp.text(`${globalMin.csp_clean} (en ${globalMin.annee})`);
        panelMinAge.text(globalMin.age.toFixed(1));
        panelMaxCsp.text(`${globalMax.csp_clean} (en ${globalMax.annee})`);
        panelMaxAge.text(globalMax.age.toFixed(1));
        panelGap.text((globalMax.age - globalMin.age).toFixed(1));
      } else {
        const forYear = validData
          .filter((d) => d.annee === anneeSelectionnee)
          .sort((a, b) => a.age - b.age);
        const min = forYear[0];
        const max = forYear[forYear.length - 1];
        const mean = dataGlobale.find((d) => d.annee === anneeSelectionnee).age;

        panelTitle.text(`Année ${anneeSelectionnee}`);
        panelMean.text(`Moyenne : ${mean.toFixed(2)} ans`);
        panelMinCsp.text(min.csp_clean);
        panelMinAge.text(min.age.toFixed(1));
        panelMaxCsp.text(max.csp_clean);
        panelMaxAge.text(max.age.toFixed(1));
        panelGap.text((max.age - min.age).toFixed(1));
      }
    }

    // Initialisation
    updateVisuals();
  })
  .catch((error) => console.error("Erreur chargement données :", error));
