// Dimensions des graphiques
const margin = { top: 50, right: 50, bottom: 50, left: 60 };
const width = 650 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// Tooltip global
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

// Chargement des données
d3.dsv(";", "departretraite_parcsp.csv")
  .then((data) => {
    // Détection automatique de la colonne CSP
    const cspKey = Object.keys(data[0]).find(
      (k) =>
        k.toLowerCase().includes("catégorie") ||
        k.toLowerCase().includes("categorie") ||
        k.toLowerCase().includes("csp") ||
        k.toLowerCase().includes("socio"),
    );

    // Nettoyage des données
    data.forEach((d) => {
      d.annee_num = +d.annee;
      const ageString = d["Âge conjoncturel de départ à la retraite"];
      d.age_num = ageString ? +ageString.replace(",", ".") : 0;
      d.csp_clean = (d[cspKey] || "").replace(/^\d+\s*-\s*/, "");
    });

    const years = Array.from(new Set(data.map((d) => d.annee_num))).sort();

    // Moyenne par année
    const dataGlobale = Array.from(
      d3.rollup(
        data,
        (v) => d3.mean(v, (d) => d.age_num),
        (d) => d.annee_num,
      ),
      ([annee, age]) => ({ annee, age }),
    ).sort((a, b) => a.annee - b.annee);

    const ageMoyenTotal = d3.mean(
      data.filter((d) => d.age_num > 0),
      (d) => d.age_num,
    );

    // Graphique ligne
    const svg1 = d3
      .select("#graph-global")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Fond cliquable pour désélectionner
    svg1
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .on("click", () => {
        anneeSelectionnee = null;
        updateVisuals();
      });

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

    svg1
      .append("path")
      .datum(dataGlobale)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 3)
      .attr(
        "d",
        d3
          .line()
          .x((d) => x1(d.annee))
          .y((d) => y1(d.age)),
      )
      .style("pointer-events", "none");

    let anneeSelectionnee = null;

    const circles = svg1
      .selectAll("circle")
      .data(dataGlobale)
      .enter()
      .append("circle")
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

    // Mise à jour du panneau de détails
    function updateVisuals() {
      circles
        .attr("fill", (d) =>
          d.annee === anneeSelectionnee ? "#FF0000" : "steelblue",
        )
        .attr("r", (d) => (d.annee === anneeSelectionnee ? 9 : 6));

      if (anneeSelectionnee === null) {
        const allValid = data
          .filter((d) => d.age_num > 0)
          .sort((a, b) => a.age_num - b.age_num);
        const min = allValid[0];
        const max = allValid[allValid.length - 1];

        d3.select("#panel-title").text("Bilan (2013-2020)");
        d3.select("#panel-mean").text(
          `Moyenne : ${ageMoyenTotal.toFixed(2)} ans`,
        );
        d3.select("#panel-min-csp").text(`${min.csp_clean} (en ${min.annee})`);
        d3.select("#panel-min-age").text(min.age_num.toFixed(1));
        d3.select("#panel-max-csp").text(`${max.csp_clean} (en ${max.annee})`);
        d3.select("#panel-max-age").text(max.age_num.toFixed(1));
        d3.select("#panel-gap").text((max.age_num - min.age_num).toFixed(1));
      } else {
        const forYear = data
          .filter((d) => d.annee_num === anneeSelectionnee && d.age_num > 0)
          .sort((a, b) => a.age_num - b.age_num);
        const min = forYear[0];
        const max = forYear[forYear.length - 1];
        const mean = dataGlobale.find((d) => d.annee === anneeSelectionnee).age;

        d3.select("#panel-title").text(`Année ${anneeSelectionnee}`);
        d3.select("#panel-mean").text(`Moyenne : ${mean.toFixed(2)} ans`);
        d3.select("#panel-min-csp").text(min.csp_clean);
        d3.select("#panel-min-age").text(min.age_num.toFixed(1));
        d3.select("#panel-max-csp").text(max.csp_clean);
        d3.select("#panel-max-age").text(max.age_num.toFixed(1));
        d3.select("#panel-gap").text((max.age_num - min.age_num).toFixed(1));
      }
    }

    updateVisuals();
  })
  .catch((error) => console.error("Erreur chargement données :", error));
