// On définit les marges et dimensions du graphique
const margin = { top: 50, right: 50, bottom: 50, left: 60 };
const width = 650 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// On récupère les éléments HTML du panneau d'infos une seule fois (plus rapide)
const panelTitle = d3.select("#panel-title");
const panelMean = d3.select("#panel-mean");
const panelMinCsp = d3.select("#panel-min-csp");
const panelMinAge = d3.select("#panel-min-age");
const panelMaxCsp = d3.select("#panel-max-csp");
const panelMaxAge = d3.select("#panel-max-age");
const panelGap = d3.select("#panel-gap");

// On crée une bulle d'info qui apparaît au survol
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

// On charge le fichier CSV et on commence le traitement
d3.dsv(";", "departretraite_parcsp.csv")
  .then((data) => {
    // On nettoie et convertit les données pour qu'elles soient exploitables
    data.forEach((d) => {
      d.annee = +d.annee;
      const ageString = d["Âge conjoncturel de départ à la retraite"];
      d.age = ageString ? +ageString.replace(",", ".") : 0;
      d.csp_clean = (d["Catégorie socioprofessionnelle"] || "").replace(
        /^\d+\s*-\s*/,
        "",
      );
    });

    // On extrait la liste des années disponibles
    const years = Array.from(new Set(data.map((d) => d.annee))).sort();

    // On calcule l'âge moyen par année (pour la courbe principale)
    const dataGlobale = Array.from(
      d3.rollup(
        data,
        (v) => d3.mean(v, (d) => d.age),
        (d) => d.annee,
      ),
      ([annee, age]) => ({ annee, age }),
    ).sort((a, b) => a.annee - b.annee);

    // On calcule une fois pour toutes les stats globales (min, max, moyenne)
    const validData = data.filter((d) => d.age > 0);
    const ageMoyenTotal = d3.mean(validData, (d) => d.age);
    const allSorted = [...validData].sort((a, b) => a.age - b.age);
    const globalMin = allSorted[0];
    const globalMax = allSorted[allSorted.length - 1];

    // On crée le conteneur SVG du graphique
    const svg1 = d3
      .select("#graph-global")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // On ajoute un fond transparent cliquable pour désélectionner une année
    svg1
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .on("click", () => {
        anneeSelectionnee = null;
        updateVisuals();
      });

    // On définit les échelles pour positionner les points sur le graphique
    const x1 = d3
      .scaleLinear()
      .domain(d3.extent(dataGlobale, (d) => d.annee))
      .range([0, width]);
    const y1 = d3.scaleLinear().domain([60, 64]).range([height, 0]);

    // On dessine l'axe horizontal (années)
    svg1
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x1).ticks(years.length).tickFormat(d3.format("d")))
      .append("text")
      .attr("x", width / 2)
      .attr("y", 40)
      .attr("fill", "black")
      .text("Année");

    // On dessine l'axe vertical (âge moyen)
    svg1
      .append("g")
      .call(d3.axisLeft(y1))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -45)
      .attr("fill", "black")
      .text("Âge moyen");

    // On prépare le générateur de ligne
    const lineGen = d3
      .line()
      .x((d) => x1(d.annee))
      .y((d) => y1(d.age));

    // On trace la courbe qui relie tous les points
    svg1
      .append("path")
      .datum(dataGlobale)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 3)
      .attr("d", lineGen)
      .style("pointer-events", "none");

    // Variable pour savoir quelle année est sélectionnée
    let anneeSelectionnee = null;

    // On ajoute les points cliquables sur la courbe
    const circles = svg1
      .selectAll(".point-global")
      .data(dataGlobale)
      .enter()
      .append("circle")
      .attr("class", "point-global")
      .attr("cx", (d) => x1(d.annee))
      .attr("cy", (d) => y1(d.age))
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      // Quand la souris passe sur un point, on affiche la bulle d'info
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
      // Quand la souris bouge, la bulle suit
      .on("mousemove", function (event) {
        tooltip
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      // Quand la souris quitte le point, on cache la bulle
      .on("mouseout", function () {
        tooltip.transition().duration(500).style("opacity", 0);
        d3.select(this).attr("stroke", "white");
      })
      // Au clic, on sélectionne/désélectionne l'année
      .on("click", function (event, d) {
        anneeSelectionnee = anneeSelectionnee === d.annee ? null : d.annee;
        updateVisuals();
      });

    // Fonction qui met à jour l'apparence des points et le panneau d'infos
    function updateVisuals() {
      // On change la couleur et taille du point sélectionné
      circles
        .attr("fill", (d) =>
          d.annee === anneeSelectionnee ? "#FF0000" : "steelblue",
        )
        .attr("r", (d) => (d.annee === anneeSelectionnee ? 9 : 6));

      // Si aucune année n'est sélectionnée, on affiche les stats globales
      if (anneeSelectionnee === null) {
        panelTitle.text("Bilan (2013-2020)");
        panelMean.text(`Moyenne : ${ageMoyenTotal.toFixed(2)} ans`);
        panelMinCsp.text(`${globalMin.csp_clean} (en ${globalMin.annee})`);
        panelMinAge.text(globalMin.age.toFixed(1));
        panelMaxCsp.text(`${globalMax.csp_clean} (en ${globalMax.annee})`);
        panelMaxAge.text(globalMax.age.toFixed(1));
        panelGap.text((globalMax.age - globalMin.age).toFixed(1));
      } else {
        // Sinon, on affiche les stats de l'année sélectionnée
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

    // On affiche les stats globales au démarrage
    updateVisuals();
  })
  .catch((error) => console.error("Erreur chargement données :", error));